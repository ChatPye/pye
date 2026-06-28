import { NextRequest, NextResponse } from 'next/server'
import { mailerLiteService } from '@/lib/mailerlite'
import { isValidEmail } from '@/lib/security'
import { connectDocumentDB } from '@/server/db/documentdb'
import { Subscriber } from '@/data/models/Subscriber'
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses'

export const dynamic = 'force-dynamic'

declare global {
  // eslint-disable-next-line no-var
  var __CHATPYE_SUBSCRIBERS__: Set<string> | undefined
}

function getMemoryStore() {
  if (!global.__CHATPYE_SUBSCRIBERS__) {
    global.__CHATPYE_SUBSCRIBERS__ = new Set<string>()
  }
  return global.__CHATPYE_SUBSCRIBERS__
}

const DEFAULT_TEAM_EMAIL = 'job@chatpye.com'

function getTeamRecipients() {
  const raw = process.env.TEAM_NOTIFICATION_EMAILS || process.env.SUBSCRIBER_NOTIFY_EMAILS || DEFAULT_TEAM_EMAIL
  return raw
    .split(',')
    .map((email) => email.trim())
    .filter(Boolean)
}

function getSesClient() {
  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    throw new Error('AWS credentials not configured')
  }
  return new SESClient({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 })
    }

    let subscribedRemotely = false

    if (process.env.MAILERLITE_API_KEY && process.env.MAILERLITE_GROUP_ID) {
      try {
        subscribedRemotely = await mailerLiteService.addOrUpdateUser({
          email,
          fields: { user_class: 'freemium' },
        })
      } catch (integrationError) {
        console.error('[Subscribe] MailerLite integration failed, continuing with local acknowledgement.', integrationError)
      }
    } else {
      console.warn('[Subscribe] MailerLite env not configured. Capturing email locally only.')
    }

    try {
      const db = await connectDocumentDB()
      if (db) {
        await Subscriber.findOneAndUpdate(
          { email },
          { email, source: body?.source || 'pye-lab', tags: Array.isArray(body?.tags) ? body.tags : [] },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        )
      } else {
        const store = getMemoryStore()
        store.add(email)
      }
    } catch (persistenceError) {
      console.error('[Subscribe] Failed to persist subscriber email', persistenceError)
    }

    try {
      const recipients = getTeamRecipients()
      if (recipients.length > 0) {
        const ses = getSesClient()
        const command = new SendEmailCommand({
          Source: process.env.SES_FROM_EMAIL || 'noreply@chatpye.com',
          Destination: { ToAddresses: recipients },
          Message: {
            Subject: {
              Data: `New Pye Lab subscriber – ${email}`,
              Charset: 'UTF-8',
            },
            Body: {
              Html: {
                Data: `
                  <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto;">
                    <h2 style="color:#2563eb;">New Pye Lab Research Subscriber</h2>
                    <p><strong>Email:</strong> ${email}</p>
                    ${body?.source ? `<p><strong>Source:</strong> ${body.source}</p>` : ''}
                    ${Array.isArray(body?.tags) && body.tags.length ? `<p><strong>Tags:</strong> ${body.tags.join(', ')}</p>` : ''}
                    <p style="margin-top:24px;font-size:12px;color:#6b7280;">Captured via ChatPye Pye Lab signup at ${new Date().toISOString()}</p>
                  </div>
                `,
                Charset: 'UTF-8',
              },
              Text: {
                Data: `New Pye Lab Research Subscriber\n\nEmail: ${email}\n${body?.source ? `Source: ${body.source}\n` : ''}${Array.isArray(body?.tags) && body.tags.length ? `Tags: ${body.tags.join(', ')}` : ''}\n\nTimestamp: ${new Date().toISOString()}`,
                Charset: 'UTF-8',
              },
            },
          },
        })
        await ses.send(command)
      }
    } catch (error) {
      console.error('[Subscribe] Failed to send notification email', error)
    }

    return NextResponse.json({
      success: true,
      message: 'You’re all set! Pye Lab updates will land in your inbox soon.',
      viaMailerLite: subscribedRemotely,
    })
  } catch (error) {
    console.error('[Subscribe] Unexpected error', error)
    return NextResponse.json(
      {
        success: true,
        message: 'We received your email and will add you to Pye Lab updates shortly.',
        viaMailerLite: false,
      },
      { status: 200 },
    )
  }
}
