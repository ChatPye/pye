#!/usr/bin/env node
/**
 * Deploy chatpye-video-preprocess Lambda (bundled ffmpeg via @ffmpeg-installer).
 *
 * Usage: npm run lambda:deploy-preprocess
 *
 * After deploy, add to Vercel:
 *   VIDEO_PREPROCESS_LAMBDA_ARN=<function-arn>
 */
import { rmSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import dotenv from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '../..');
const lambdaDir = join(root, 'lambda/video-preprocess');
dotenv.config({ path: join(root, '.env.local') });

const region = process.env.AWS_REGION || 'us-east-1';
const functionName = process.env.VIDEO_PREPROCESS_LAMBDA_NAME || 'chatpye-video-preprocess';
const bucket = process.env.AWS_S3_BUCKET || process.env.S3_BUCKET_NAME;
const roleName = process.env.LAMBDA_EXECUTION_ROLE || 'chatpye-lambda-s3-role';
const zipPath = join(lambdaDir, 'dist.zip');

function run(cmd, cwd = root) {
  console.log(`> ${cmd}`);
  execSync(cmd, { stdio: 'inherit', cwd, shell: true });
}

function zipLambda() {
  rmSync(zipPath, { force: true });
  run('npm install --omit=dev', lambdaDir);
  // Zip handler + node_modules (Linux ffmpeg binary inside @ffmpeg-installer)
  run(
    `powershell -Command "Compress-Archive -Path '${join(lambdaDir, 'handler.mjs')}','${join(lambdaDir, 'package.json')}','${join(lambdaDir, 'node_modules')}' -DestinationPath '${zipPath}' -Force"`
  );
}

async function main() {
  if (!bucket) {
    console.error('Set AWS_S3_BUCKET in .env.local');
    process.exit(1);
  }

  console.log(`\nDeploying ${functionName} to ${region}…\n`);
  zipLambda();

  const accountId = execSync(`aws sts get-caller-identity --query Account --output text`, {
    encoding: 'utf8',
  }).trim();
  const roleArn = `arn:aws:iam::${accountId}:role/${roleName}`;
  const envVars = `Variables={AWS_S3_BUCKET=${bucket}}`;

  try {
    execSync(`aws lambda get-function --function-name ${functionName} --region ${region}`, {
      stdio: 'pipe',
    });
    console.log('Updating existing function…');
    run(
      `aws lambda update-function-code --function-name ${functionName} --zip-file fileb://${zipPath} --region ${region}`
    );
    // Wait for update to finish before config change
    run(`aws lambda wait function-updated --function-name ${functionName} --region ${region}`);
    run(
      `aws lambda update-function-configuration --function-name ${functionName} --timeout 900 --memory-size 3008 --environment "${envVars}" --region ${region}`
    );
  } catch {
    console.log('Creating new function…');
    run(
      `aws lambda create-function --function-name ${functionName} --runtime nodejs20.x --role ${roleArn} --handler handler.handler --zip-file fileb://${zipPath} --timeout 900 --memory-size 3008 --environment "${envVars}" --region ${region}`
    );
  }

  run(`aws lambda wait function-active --function-name ${functionName} --region ${region}`);

  const arn = execSync(
    `aws lambda get-function --function-name ${functionName} --region ${region} --query Configuration.FunctionArn --output text`,
    { encoding: 'utf8' }
  ).trim();

  console.log(`\n✅ Deployed: ${arn}`);
  console.log('\nAdd to Vercel → Settings → Environment Variables (Production):');
  console.log(`  VIDEO_PREPROCESS_LAMBDA_ARN=${arn}`);
  console.log('\nEnsure Lambda role has s3:GetObject + s3:PutObject on your uploads bucket.');
  console.log('Ensure Vercel AWS credentials include lambda:InvokeFunction on this ARN.\n');
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
