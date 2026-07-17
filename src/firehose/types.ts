/** The entry type you'll consume. (Import anything you need from this directory; just don't modify it.) */
export interface LogEntry {
  /** Unique. Immutable. Dedup by this; see the wire contract (at-least-once delivery). */
  id: string;
  /** Epoch ms. Monotonic non-decreasing (ordered delivery). */
  timestamp: number;
  level: 'debug' | 'info' | 'warn' | 'error' | 'critical';
  /** Bounded set. */
  service: string;
  message: string;
  /** Variable shape: keys differ per entry/service. Render defensively. */
  context: Record<string, unknown>;
  traceId?: string;
}
