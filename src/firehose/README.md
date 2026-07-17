# Firehose: wire contract

This directory is the assignment's data source. You're welcome to read anything in
`src/firehose/` to understand how it works, but **don't modify it**; we restore this directory
from a clean copy when reviewing. Everything you need to consume the stream is below.

## The source API

Import the singleton from `src/firehose/source.ts`:

```ts
import { firehose } from './firehose/source';
import type { LogEntry } from './firehose/types';

const off = firehose.on('entry', (e: LogEntry) => { /* one entry per call, while connected */ });
firehose.on('open',  () => { /* connected */ });
firehose.on('close', () => { /* connection dropped; reconnecting is your job */ });

firehose.connect();                       // start receiving (replays a short tail, see below)
firehose.disconnect();                    // stop receiving
firehose.status;                          // 'open' | 'closed'

off();                                    // unsubscribe; you own listener cleanup
```

**Register your listeners before calling `connect()`.** The replay tail is delivered synchronously
inside `connect()`: entries arrive before `'open'` fires and before `connect()` returns, so a
listener registered after `connect()` misses them.

The stream flows continuously whether or not you're connected, like a real firehose. You
`connect()` to start receiving it. Entries are delivered one per `on('entry')` call, never
pre-batched. The singleton is one shared connection: a `disconnect()` from anywhere closes it for
every listener.

## Message shape

```ts
interface LogEntry {
  id: string;            // unique
  timestamp: number;     // epoch ms
  level: 'debug' | 'info' | 'warn' | 'error' | 'critical';
  service: string;       // always one of: 'auth' | 'api' | 'pubsub' | 'worker' | 'cache' | 'gateway'
  message: string;       // free text
  context: Record<string, unknown>;   // variable shape: keys differ per entry/service
  traceId?: string;
}
```

The `service` set above is the complete set this source emits. Hardcoding it is fine; deriving
the values dynamically from observed entries is equally fine. Your call.

## Delivery semantics

- **Ordered**: `timestamp` is monotonic non-decreasing. Ties are normal; entries arriving in the
  same tick or burst share a timestamp (non-decreasing, not strictly increasing).
- **At-least-once**: on (re)connect the source replays a short tail of recent entries, so you
  will see duplicate `id`s clustered right after a reconnect. Rare duplicates can occur in
  steady state too (the same entry delivered twice back-to-back in the same tick). Entries are
  immutable, so dedup by `id`.
- **Delivery can be bursty**: entries may arrive in clumps rather than a steady trickle (for
  example, browsers throttle timers in background tabs, so returning to the tab delivers a small
  burst). Your viewer should handle clumped arrival gracefully.
- **`context` is variable-shape**: different keys per entry. Render it defensively; don't assume a
  fixed set of fields.

## Connection lifecycle

The connection can drop at any time (the Workbench's **Drop connection** button does exactly this).
When it drops, `on('close')` fires and delivery stops while the stream keeps flowing, so you miss
whatever is produced beyond the replay tail until you reconnect. Detecting the drop and
reconnecting is your responsibility.

Two things worth knowing:

- **`'close'` fires for any close, including your own `disconnect()`.** If you auto-reconnect on
  `'close'`, account for intentional closes (this also comes up in dev: React StrictMode's effect
  cleanup runs your disconnect once on mount).
- Surfacing how much was missed is **not** expected; gap detection is out of scope. (The demo
  generator's ids happen to look sequential; treat them as opaque, as they would be in production.)

## The Workbench

The panel bottom-right (shipped, dev-only) is your test rig, and how we'll exercise your app
during review:

- **Drop connection**: simulates a dropped connection (fires `close`; the stream keeps flowing).
- **Pause / Resume**: freezes and restarts steady production. (**Burst still injects while
  paused**; it's an explicit override.)
- **Burst 5k / 50k**: injects a one-shot flood of entries. The source delivers it in chunks across
  a few frames, so the page never freezes on the scaffold's account. How your viewer holds up is
  the part that's yours.
- **Rate presets (5-5000/s)**: set the steady delivery rate.
- The readout shows `emitted` (total the source has produced), the current rate, and whether you're
  currently `delivering` (connected).
