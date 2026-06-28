#!/usr/bin/env node
/**
 * Apply SQL migrations to Aurora PostgreSQL.
 * Reads DATABASE_URL from .env.local or environment.
 *
 * Usage: npm run db:migrate
 */
import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import postgres from 'postgres';
import dotenv from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '../..');

dotenv.config({ path: join(root, '.env.local') });
dotenv.config({ path: join(root, '.env') });

const connectionString = process.env.DATABASE_URL;

if (!connectionString || connectionString.includes('your-aurora-cluster')) {
  console.error(
    '\n❌ DATABASE_URL is not configured with a real Aurora connection string.\n' +
      '   Set DATABASE_URL in .env.local or Vercel env vars, then re-run:\n' +
      '   npm run db:migrate\n'
  );
  process.exit(1);
}

const sql = postgres(connectionString, { prepare: false, max: 1 });

async function main() {
  console.log('Connecting to Aurora…');

  await sql`CREATE TABLE IF NOT EXISTS schema_migrations (
    id VARCHAR(100) PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;

  const deployDir = join(root, 'scripts/deploy');
  const files = readdirSync(deployDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const migrationId = file.replace('.sql', '');
    const [existing] = await sql`
      SELECT id FROM schema_migrations WHERE id = ${migrationId} LIMIT 1
    `;
    if (existing) {
      console.log(`⏭  Skipping ${file} (already applied)`);
      continue;
    }

    const body = readFileSync(join(deployDir, file), 'utf8');
    console.log(`▶  Applying ${file}…`);
    await sql.unsafe(body);
    await sql`INSERT INTO schema_migrations (id) VALUES (${migrationId}) ON CONFLICT DO NOTHING`;
    console.log(`✅ Applied ${file}`);
  }

  console.log('\n✅ All migrations complete.');
  await sql.end();
}

main().catch((err) => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
