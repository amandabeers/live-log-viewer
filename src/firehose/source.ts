import type { LogEntry } from './types';
import { makeEntry } from './generator';

/**
 * In-process firehose. A socket-shaped log source the candidate wraps. No server, no network.
 * The stream "flows" continuously (like a real firehose); you `connect()` to receive it.
 *
 *   firehose.connect() / disconnect()        // manage your subscription, like a socket
 *   firehose.status                          // 'open' | 'closed'
 *   firehose.on('entry', cb) => unsubscribe  // one LogEntry per call while connected
 *   firehose.on('open' | 'close', cb)        // connection lifecycle
 *
 * Delivery is ordered + at-least-once: on (re)connect the last entries are replayed, so you will
 * see duplicate ids; dedup by id. See README.md (the wire contract).
 *
 * `firehose.controls` is the Workbench's surface (kill / rate / burst); candidates can ignore it.
 */

type EntryListener = (entry: LogEntry) => void;
type StatusListener = () => void;

export interface FirehoseControls {
  setRate(perSecond: number): void;
  burst(count: number): void;
  /** Simulate a server-side disconnect (fires `close`; the consumer must reconnect). */
  forceDrop(): void;
  /** Freeze the whole stream (production stops; `emitted` holds). */
  pause(): void;
  /** Resume production after a pause. */
  resume(): void;
  stats(): { emitted: number; rate: number; connected: boolean; paused: boolean };
  /** Re-render hook for the Workbench. */
  onStats(cb: () => void): () => void;
}

export interface Firehose {
  connect(): void;
  disconnect(): void;
  readonly status: 'open' | 'closed';
  on(type: 'entry', cb: EntryListener): () => void;
  on(type: 'open' | 'close', cb: StatusListener): () => void;
  readonly controls: FirehoseControls;
}

const REPLAY_TAIL = 20;
const TICK_MS = 100;

function createFirehose(): Firehose {
  const entryListeners = new Set<EntryListener>();
  const openListeners = new Set<StatusListener>();
  const closeListeners = new Set<StatusListener>();
  const statsListeners = new Set<() => void>();

  let status: 'open' | 'closed' = 'closed';
  let paused = false;
  let rate = 20;
  let emitted = 0;
  let seq = 0;
  let lastTs = Date.now();
  let carry = 0; // fractional entries-per-tick accumulator (accurate low rates)
  const ring: LogEntry[] = [];

  const notifyStats = () => statsListeners.forEach((cb) => cb());

  function produce(): LogEntry {
    seq += 1;
    lastTs = Math.max(lastTs, Date.now()); // monotonic timestamps
    const entry = makeEntry(seq, lastTs);
    ring.push(entry);
    if (ring.length > REPLAY_TAIL) ring.shift();
    emitted += 1;
    return entry;
  }

  function deliver(entry: LogEntry) {
    if (status !== 'open') return; // produced regardless; delivered only while connected
    entryListeners.forEach((cb) => cb(entry));
    if (Math.random() < 0.01) entryListeners.forEach((cb) => cb(entry)); // rare steady-state dupe
  }

  function pump(n: number) {
    for (let i = 0; i < n; i++) deliver(produce());
    if (n > 0) notifyStats();
  }

  // The firehose flows whether or not anyone is connected, unless paused.
  setInterval(() => {
    if (paused) return;
    carry += (rate * TICK_MS) / 1000;
    const n = Math.floor(carry);
    carry -= n;
    pump(n);
  }, TICK_MS);

  return {
    get status() {
      return status;
    },
    connect() {
      if (status === 'open') return;
      status = 'open';
      // Replay is synchronous: 'entry' listeners receive up to REPLAY_TAIL entries here,
      // BEFORE 'open' fires and before connect() returns, so register listeners first.
      ring.forEach((e) => entryListeners.forEach((cb) => cb(e))); // replay tail; produces duplicate ids on reconnect
      openListeners.forEach((cb) => cb());
      notifyStats();
    },
    disconnect() {
      if (status === 'closed') return;
      status = 'closed';
      closeListeners.forEach((cb) => cb());
      notifyStats();
    },
    on(type, cb) {
      const set = type === 'entry' ? entryListeners : type === 'open' ? openListeners : closeListeners;
      set.add(cb as EntryListener & StatusListener);
      return () => set.delete(cb as EntryListener & StatusListener);
    },
    controls: {
      setRate(perSecond) {
        rate = Math.max(0, perSecond);
        notifyStats();
      },
      burst(count) {
        // Chunked so the source never stalls the main thread; sustained jank during a
        // burst is the consumer's rendering, not the scaffold. MessageChannel yields are
        // used (not setTimeout) because timers are heavily clamped in unfocused tabs.
        const total = Math.max(0, Math.floor(count));
        if (total === 0) return;
        const CHUNK = 1000;
        let delivered = 0;
        const channel = new MessageChannel();
        channel.port1.onmessage = () => {
          const batch = Math.min(CHUNK, total - delivered);
          pump(batch);
          delivered += batch;
          if (delivered < total) {
            channel.port2.postMessage(null);
          } else {
            channel.port1.close();
            channel.port2.close();
          }
        };
        channel.port2.postMessage(null);
      },
      forceDrop() {
        if (status !== 'open') return;
        status = 'closed';
        closeListeners.forEach((cb) => cb());
        notifyStats();
      },
      pause() {
        paused = true;
        notifyStats();
      },
      resume() {
        paused = false;
        notifyStats();
      },
      stats() {
        return { emitted, rate, connected: status === 'open', paused };
      },
      onStats(cb) {
        statsListeners.add(cb);
        return () => statsListeners.delete(cb);
      },
    },
  };
}

/** The singleton the app shares, recreated on every page load (no cross-refresh state). */
export const firehose = createFirehose();
