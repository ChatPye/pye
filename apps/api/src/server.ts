/**
 * Standalone API service scaffold for ECS Fargate deployment.
 * Stateless endpoints migrate here from Next.js /api routes over time.
 */
import { createServer } from 'node:http';
import { loadServiceConfig } from '@chatpye/config';
import { initTelemetry, logInfo } from '@chatpye/observability';

const config = loadServiceConfig('api');
initTelemetry({ serviceName: 'chatpye-api', environment: config.environment });

const server = createServer((req, res) => {
  if (req.url === '/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', service: 'chatpye-api', environment: config.environment }));
    return;
  }
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(config.port, () => {
  logInfo('API service listening', { port: config.port, environment: config.environment });
});
