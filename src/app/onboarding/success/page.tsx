'use client'
export const dynamic = 'force-dynamic'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function SuccessInner() {
  const router = useRouter()
  const params = useSearchParams()
  const [status, setStatus] = useState<'provisioning' | 'done' | 'error'>('provisioning')
  const [message, setMessage] = useState<string>('Creating your workspace…')

  useEffect(() => {
    const planId = params.get('planId') || 'enterprise-community'
    const orgName = params.get('orgName') || 'Your Organization'
    const seats = params.get('seats') ? Number(params.get('seats')) : undefined

    const provision = async () => {
      try {
        const res = await fetch('/api/tenants/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orgName, planKey: planId.replace('-', '_'), externalUserLimit: 500, seats })
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data?.error || 'Provisioning failed')
        setStatus('done')
        setMessage('Workspace ready! Redirecting…')
        setTimeout(() => {
          router.push('/workspace')
        }, 1200)
      } catch (e: any) {
        setStatus('error')
        setMessage(e?.message || 'An error occurred while provisioning your workspace')
      }
    }

    provision()
  }, [params, router])

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-2">{status === 'error' ? 'Something went wrong' : 'Thanks for subscribing!'}</h1>
        <p className="text-zinc-400">{message}</p>
      </div>
    </div>
  )
}

export default function OnboardingSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black text-white flex items-center justify-center">Loading…</div>}>
      <SuccessInner />
    </Suspense>
  )
}


