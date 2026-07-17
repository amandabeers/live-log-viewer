import type { LogEntry } from './types';

const SERVICES = ['auth', 'api', 'pubsub', 'worker', 'cache', 'gateway'] as const;

// Weighted toward info/warn, occasional error/critical.
const LEVELS: LogEntry['level'][] = [
  'debug', 'debug',
  'info', 'info', 'info', 'info',
  'warn', 'warn',
  'error',
  'critical',
];

const MESSAGES: Record<LogEntry['level'], string[]> = {
  debug: ['cache lookup', 'span started', 'config resolved', 'pool checkout'],
  info: ['request handled', 'job completed', 'message published', 'session refreshed', 'healthcheck ok'],
  warn: ['slow query', 'retry scheduled', 'rate limit approaching', 'connection pool saturated'],
  error: ['request failed', 'upstream timeout', 'write rejected', 'deserialize error'],
  critical: ['circuit opened', 'node unreachable', 'data loss risk', 'quorum lost'],
};

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Variable-shape context: a random subset of keys, differing per entry. */
function makeContext(level: LogEntry['level'], service: string): Record<string, unknown> {
  const ctx: Record<string, unknown> = { service };
  if (Math.random() < 0.7) ctx.durationMs = Math.round(Math.random() * 1200);
  if (Math.random() < 0.5) ctx.region = pick(['us-east-1', 'us-west-2', 'eu-west-1']);
  if (Math.random() < 0.4) ctx.userId = `u_${Math.floor(Math.random() * 99999)}`;
  if (Math.random() < 0.3) ctx.statusCode = pick([200, 201, 400, 404, 429, 500, 503]);
  if (Math.random() < 0.25) ctx.attempt = Math.ceil(Math.random() * 4);
  if (level === 'error' || level === 'critical') {
    ctx.stack = `Error: ${pick(MESSAGES[level])}\n    at handler (src/${service}.ts:${Math.ceil(Math.random() * 400)})`;
    ctx.tags = ['alert', service];
  }
  return ctx;
}

export function makeEntry(seq: number, timestamp: number): LogEntry {
  const level = pick(LEVELS);
  const service = pick(SERVICES);
  const entry: LogEntry = {
    id: `log_${seq}`,
    timestamp,
    level,
    service,
    message: pick(MESSAGES[level]),
    context: makeContext(level, service),
  };
  if (Math.random() < 0.6) entry.traceId = `trace_${Math.floor(seq / 5)}`;
  return entry;
}
