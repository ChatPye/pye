#!/usr/bin/env node
/**
 * Analyze CloudWatch logs for video processing failures.
 *
 * Usage:
 *   npm run logs:analyze
 *   npm run logs:analyze -- --hours 24 --pattern "Processing tick failed"
 *
 * Env: AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY (from .env.local)
 * Optional: CLOUDWATCH_LOG_GROUP (default: auto-discover chatpye/transcribe/lambda groups)
 */
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import {
  CloudWatchLogsClient,
  DescribeLogGroupsCommand,
  FilterLogEventsCommand,
} from '@aws-sdk/client-cloudwatch-logs';
import {
  TranscribeClient,
  ListTranscriptionJobsCommand,
} from '@aws-sdk/client-transcribe';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

dotenv.config({ path: join(root, '.env.local') });
dotenv.config({ path: join(root, '.env') });

const region = process.env.AWS_REGION || 'us-east-1';
const hours = parseInt(process.argv.find((a) => a.startsWith('--hours='))?.split('=')[1] || '48', 10);
const patternArg = process.argv.find((a) => a.startsWith('--pattern='))?.split('=')[1];
const explicitGroup = process.env.CLOUDWATCH_LOG_GROUP;

const ERROR_PATTERNS = [
  'Processing tick failed',
  'Transcription job start error',
  'Transcription failed',
  'Media prep failed',
  'Video stream error',
  'Complete upload error',
  'Audio transcription error',
  'FAILED',
];

async function discoverLogGroups(client) {
  if (explicitGroup) return [explicitGroup];

  const groups = [];
  let nextToken;

  do {
    const res = await client.send(
      new DescribeLogGroupsCommand({ nextToken, limit: 50 })
    );
    for (const g of res.logGroups ?? []) {
      const name = g.logGroupName ?? '';
      if (
        /chatpye|transcrib|lambda|video|vercel/i.test(name) &&
        !name.includes('/aws/lambda-insights')
      ) {
        groups.push(name);
      }
    }
    nextToken = res.nextToken;
  } while (nextToken && groups.length < 20);

  return groups.slice(0, 10);
}

async function analyzeCloudWatch() {
  const client = new CloudWatchLogsClient({ region });
  const startTime = Date.now() - hours * 60 * 60 * 1000;
  const patterns = patternArg ? [patternArg] : ERROR_PATTERNS;

  console.log(`\n🔍 CloudWatch log analysis (${region}, last ${hours}h)\n`);

  const groups = await discoverLogGroups(client);
  if (!groups.length) {
    console.log('No matching log groups found. Set CLOUDWATCH_LOG_GROUP in .env.local');
    console.log('Note: Vercel app logs live in Vercel dashboard, not CloudWatch.');
    console.log('AWS Transcribe job status is checked separately below.\n');
  } else {
    console.log(`Log groups: ${groups.join(', ')}\n`);
  }

  const hits = [];

  for (const group of groups) {
    for (const pattern of patterns) {
      try {
        const res = await client.send(
          new FilterLogEventsCommand({
            logGroupName: group,
            startTime,
            filterPattern: `"${pattern}"`,
            limit: 30,
          })
        );
        for (const event of res.events ?? []) {
          hits.push({
            group,
            time: new Date(event.timestamp ?? 0).toISOString(),
            message: (event.message ?? '').slice(0, 500),
          });
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (!msg.includes('AccessDenied')) {
          console.warn(`  ⚠ ${group}: ${msg}`);
        }
      }
    }
  }

  if (hits.length) {
    console.log(`Found ${hits.length} error log entries:\n`);
    for (const hit of hits.slice(0, 25)) {
      console.log(`[${hit.time}] ${hit.group}`);
      console.log(`  ${hit.message.replace(/\n/g, ' ').slice(0, 300)}\n`);
    }
  } else {
    console.log('No CloudWatch error matches for common processing patterns.\n');
  }

  await analyzeTranscribeJobs();
}

async function analyzeTranscribeJobs() {
  const client = new TranscribeClient({ region });
  console.log('--- AWS Transcribe jobs (recent) ---\n');

  try {
    const res = await client.send(
      new ListTranscriptionJobsCommand({
        Status: 'FAILED',
        MaxResults: 10,
      })
    );

    const failed = res.TranscriptionJobSummaries ?? [];
    if (!failed.length) {
      console.log('No failed Transcribe jobs in recent history.');
    } else {
      console.log(`${failed.length} failed job(s):`);
      for (const job of failed) {
        console.log(`  • ${job.TranscriptionJobName}`);
        console.log(`    Reason: ${job.FailureReason ?? 'unknown'}`);
        console.log(`    Media: ${job.Media?.MediaFileUri ?? 'n/a'}`);
      }
    }

    const inProgress = await client.send(
      new ListTranscriptionJobsCommand({
        Status: 'IN_PROGRESS',
        MaxResults: 5,
      })
    );
    const running = inProgress.TranscriptionJobSummaries ?? [];
    if (running.length) {
      console.log(`\n${running.length} job(s) still in progress (may explain slow processing):`);
      for (const job of running) {
        console.log(`  • ${job.TranscriptionJobName} — started ${job.StartTime?.toISOString()}`);
      }
    }
  } catch (err) {
    console.error('Transcribe API error:', err instanceof Error ? err.message : err);
  }

  console.log('\n--- Recommendations ---');
  console.log('1. Set FFMPEG_PATH on a Lambda worker to extract audio before Transcribe (3–5× faster).');
  console.log('2. Long videos: fastMode transcribe is enabled (no speaker diarization).');
  console.log('3. Vercel ticks process in batches — move to SQS/Lambda for parallel scale.');
  console.log('4. Check Vercel → Logs for "Processing tick failed" if CloudWatch is empty.\n');
}

analyzeCloudWatch().catch((err) => {
  console.error('Analysis failed:', err.message);
  process.exit(1);
});
