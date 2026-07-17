import { useEffect, useRef, useState } from "react";
import { firehose } from "../firehose/source";
import type { LogEntry } from "../firehose/types";

const MAX_BUFFER_SIZE = 10000;

export function useFirehose() {
  const [entries, setEntries] = useState<LogEntry[]>([]);

  const store = useRef(new Map<string, LogEntry>());
  const isDirty = useRef(false);
  const isIntentional = useRef(false);

  useEffect(() => {

    const onEntry = (entry: LogEntry) => {
      console.log('Received log entry:', entry);
      const map = store.current;
      if (map.has(entry.id)) return; // Deduped by id
      map.set(entry.id, entry);

      if (map.size > MAX_BUFFER_SIZE) {
        map.delete(map.keys().next().value!); // Remove oldest entry from buffer
      }

      isDirty.current = true;
    }
  
    const onOpen = () => {
      console.log('Firehose connection opened');
    }
  
    const onClose = () => {
      console.log('Firehose connection closed');
      if (isIntentional.current) {
        isIntentional.current = false;
        return;
      }
      console.log('Reconnecting to firehose...');
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
      setEntries(arr);
    };

    let rafId: number | null = null;
    const tick = () => {
      if (isDirty.current) {
        updateEntries();
        isDirty.current = false;
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

  return entries;
};