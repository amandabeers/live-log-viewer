import { useEffect, useRef, useState } from "react";
import { firehose } from "../firehose/source";
import type { LogEntry } from "../firehose/types";

const MAX_BUFFER_SIZE = 10000;

type Level = LogEntry['level'];
const LEVELS: Level[] = ['debug', 'info', 'warn', 'error', 'critical'];
type Service = LogEntry['service'];
const SERVICES: Service[] = ['auth', 'api', 'pubsub', 'worker', 'cache', 'gateway'];

interface Options {
  /** Tracks if the user has scrolled up, stop flushing new entries so the view stays put. */
  paused?: boolean;
}

type Status = 'connecting' | 'open' | 'reconnecting';

interface FirehoseState {
  entries: LogEntry[];
  /** Connection lifecycle, surfaced for the UI status indicator. */
  status: Status;
  /**
   * Count of new entries received since the last flush — i.e. arrivals the user hasn't seen
   * because they scrolled up (which pauses flushing). Unfiltered, but exact (counted, not
   * derived from buffer size, so it stays correct once the buffer is at its cap).
   */
  pendingCount: number;
}

export function useFirehose({ paused = false }: Options = {}): FirehoseState {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [status, setStatus] = useState<Status>('connecting');
  const [pendingCount, setPendingCount] = useState(0);

  const store = useRef(new Map<string, LogEntry>());
  const isDirty = useRef(false);
  // Monotonic count of unique entries ever received, and its value at the last flush. Their
  // difference is the number of new arrivals the user hasn't seen — accurate even at the buffer
  // cap, where store.size stays pinned at MAX_BUFFER_SIZE (evict-one/add-one).
  const totalReceived = useRef(0);
  const flushedTotal = useRef(0);
  const isPausedRef = useRef(paused); isPausedRef.current = paused;
  const isIntentional = useRef(false);

  useEffect(() => {
    const onEntry = (entry: LogEntry) => {
      const map = store.current;
      if (map.has(entry.id)) return; // Deduped by id
      map.set(entry.id, entry);
      totalReceived.current += 1;

      if (map.size > MAX_BUFFER_SIZE) {
        map.delete(map.keys().next().value!); // Remove oldest entry from buffer
      }

      isDirty.current = true;
    }
  
    const onOpen = () => {
      console.log('Firehose connection opened');
      setStatus('open');
    }

    const onClose = () => {
      console.log('Firehose connection closed');
      if (isIntentional.current) {
        isIntentional.current = false;
        return;
      }
      console.log('Reconnecting to firehose...');
      setStatus('reconnecting');
      attemptReconnect();
    };

    const attemptReconnect = () => {
      if (firehose.status === 'closed') {
        console.log('Attempting to reconnect to firehose...');
        firehose.connect();
      }
    };

    const updateEntries = () => {
      const arr = Array.from(store.current.values());
      flushedTotal.current = totalReceived.current;
      setEntries(arr);
    };

    // Flush at most once per animation frame. This is the real coalescing: however many
    // entries land within a frame (a burst can deliver thousands), they fold into a single
    // setEntries — the smallest possible batch per paint, which keeps Virtuoso's
    // follow-the-bottom scroll correction small and smooth. Throttling coarser than a frame
    // makes each batch (and each scroll jump) bigger, i.e. more jitter, not less.
    let rafId: number | null = null;
    let lastPending = 0;
    const tick = () => {
      // When flushing is paused (user scrolled up), keep the view frozen but surface how many
      // entries have piled up since the last flush so "jump to latest" can badge a count.
      if (isPausedRef.current) {
        const pending = Math.max(0, totalReceived.current - flushedTotal.current);
        if (pending !== lastPending) {
          lastPending = pending;
          setPendingCount(pending);
        }
      } else if (isDirty.current) {
        // don't update state if no new entries have been received
        updateEntries();
        isDirty.current = false;
        if (lastPending !== 0) {
          lastPending = 0;
          setPendingCount(0);
        }
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
  
    // per README, register listeners before connect() to avoid missing events
    const offEntry = firehose.on('entry', onEntry);
    const offOpen = firehose.on('open', onOpen);
    const offClose = firehose.on('close', onClose);

    firehose.connect();

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      console.log('Cleaning up firehose listeners and disconnecting');
      isIntentional.current = true;
      firehose.disconnect();
      offEntry();
      offOpen();
      offClose();
    };
  }, []);

  return { entries, status, pendingCount };
};

export { LEVELS, SERVICES };
export type { Level, Service };