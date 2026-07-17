import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Virtuoso } from 'react-virtuoso';
import type { VirtuosoHandle } from 'react-virtuoso';
import { Workbench } from './firehose/Workbench';
import { useFirehose, LEVELS, SERVICES } from './hooks/useFirehose';
import type { Level, Service } from './hooks/useFirehose';
import type { LogEntry } from './firehose/types';
import { FilterBar } from './components/FilterBar';
import { LogRow } from './components/LogRow';

// Fixed row height, in px. MUST match the `.row` height in index.css. Passed to Virtuoso's
// `fixedItemHeight` so it skips per-row measurement — deterministic layout, no scroll jitter.
const ROW_H = 26;

// How long the list must stay away from the bottom before we treat it as a deliberate
// scroll-up. While the buffer grows at high rate the bottom moves a lot each frame, so
// Virtuoso's at-bottom signal flaps false→true every frame; debouncing the "stopped
// following" transition absorbs that flapping (which would otherwise strobe the jump button
// and stutter flushing) while still catching a real scroll-up.
const FOLLOW_EXIT_DELAY_MS = 250;

export default function App() {
  const [activeLevels, setActiveLevels] = useState<Set<Level>>(new Set(LEVELS));
  const [activeServices, setActiveServices] = useState<Set<Service>>(new Set(SERVICES));
  const [following, setFollowing] = useState(true);
  const followOffTimer = useRef<number | null>(null);
  const virtuosoRef = useRef<VirtuosoHandle>(null);

  // Debounce the false transition: re-pin immediately when we hit bottom, but only stop
  // following after we've stayed off-bottom for FOLLOW_EXIT_DELAY_MS. Transient append-gaps
  // during buffer growth resolve within a frame or two and cancel the timer before it fires.
  const handleAtBottom = useCallback((atBottom: boolean) => {
    if (followOffTimer.current) {
      clearTimeout(followOffTimer.current);
      followOffTimer.current = null;
    }
    if (atBottom) {
      setFollowing(true);
    } else {
      followOffTimer.current = window.setTimeout(() => setFollowing(false), FOLLOW_EXIT_DELAY_MS);
    }
  }, []);

  useEffect(() => () => {
    if (followOffTimer.current) clearTimeout(followOffTimer.current);
  }, []);

  // Scrolling up pauses flushing (see useFirehose) so the view stays stable while reading.
  const { entries, status, pendingCount } = useFirehose({ paused: !following });

  const isVisible = useCallback(
    (entry: LogEntry) => activeLevels.has(entry.level as Level) && activeServices.has(entry.service as Service),
    [activeLevels, activeServices],
  );

  const filteredEntries = useMemo(() => entries.filter(isVisible), [entries, isVisible]);

  const toggleLevel = useCallback((level: Level) => {
    setActiveLevels((prev) => {
      const next = new Set(prev);
      next.has(level) ? next.delete(level) : next.add(level);
      return next;
    });
  }, []);

  const toggleService = useCallback((service: Service) => {
    setActiveServices((prev) => {
      const next = new Set(prev);
      next.has(service) ? next.delete(service) : next.add(service);
      return next;
    });
  }, []);

  const jumpToBottom = useCallback(() => {
    virtuosoRef.current?.scrollToIndex({ index: 'LAST', behavior: 'auto' });
  }, []);

  return (
    <div className="app">
      <FilterBar
        status={status}
        shown={filteredEntries.length}
        retained={entries.length}
        activeLevels={activeLevels}
        activeServices={activeServices}
        onToggleLevel={toggleLevel}
        onToggleService={toggleService}
        onSetLevels={setActiveLevels}
        onSetServices={setActiveServices}
      />

      <div className="log-list">
        {filteredEntries.length === 0 ? (
          <div className="empty">
            {entries.length === 0
              ? 'Waiting for the stream…'
              : 'No entries match the current level / service filters.'}
          </div>
        ) : (
          <Virtuoso
            ref={virtuosoRef}
            data={filteredEntries}
            computeItemKey={(_index, entry) => entry.id}
            fixedItemHeight={ROW_H}
            atBottomThreshold={ROW_H * 4}
            atBottomStateChange={handleAtBottom}
            followOutput={(atBottom) => (atBottom ? 'auto' : false)}
            increaseViewportBy={200}
            itemContent={(_index, entry) => <LogRow entry={entry} />}
          />
        )}

        {!following && (
          <button className="jump-btn" type="button" onClick={jumpToBottom}>
            ↓ {pendingCount > 0 ? `${pendingCount.toLocaleString()} new` : 'Jump to latest'}
          </button>
        )}
      </div>

      <Workbench />
    </div>
  );
}
