import { useCallback, useMemo, useRef, useState } from 'react';
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

// Minimum upward scrollTop movement (px) that counts as a deliberate scroll-up. Real scrolls
// (wheel/trackpad/scrollbar/keyboard) move more than this in an event; sub-pixel reflow noise
// does not.
const SCROLL_UP_PX = 4;

export default function App() {
  const [activeLevels, setActiveLevels] = useState<Set<Level>>(new Set(LEVELS));
  const [activeServices, setActiveServices] = useState<Set<Service>>(new Set(SERVICES));
  const virtuosoRef = useRef<VirtuosoHandle>(null);

  // Following turns OFF when the user scrolls UP, and back ON only via the jump button — never
  // automatically, so a filter change or content reflow can't resume tailing. `followingRef`
  // mirrors the state synchronously for the scroll handler and `followOutput` (no state-lag).
  const [following, setFollowing] = useState(true);
  const followingRef = useRef(true);
  const setFollow = useCallback((v: boolean) => {
    followingRef.current = v;
    setFollowing(v);
  }, []);

  // Detect a real scroll-up from the actual scroll offset, not Virtuoso's `atBottom`. A burst
  // (or any fast append) makes followOutput chase the bottom *downwards* — scrollTop only
  // increases — while a user scroll-up *decreases* it. So we pause only when scrollTop moves up
  // AND the list didn't just shrink (dHeight >= 0 filters out filter/eviction reflow clamps).
  const scrollerElRef = useRef<HTMLElement | null>(null);
  const lastTopRef = useRef(0);
  const lastHeightRef = useRef(0);
  const handleScroll = useCallback(() => {
    const el = scrollerElRef.current;
    if (!el) return;
    const dTop = el.scrollTop - lastTopRef.current;
    const dHeight = el.scrollHeight - lastHeightRef.current;
    lastTopRef.current = el.scrollTop;
    lastHeightRef.current = el.scrollHeight;
    if (dTop < -SCROLL_UP_PX && dHeight >= 0 && followingRef.current) {
      setFollow(false);
    }
  }, [setFollow]);

  const setScrollerRef = useCallback((el: HTMLElement | Window | null) => {
    if (scrollerElRef.current) scrollerElRef.current.removeEventListener('scroll', handleScroll);
    scrollerElRef.current = el && 'scrollTop' in el ? (el as HTMLElement) : null;
    if (scrollerElRef.current) {
      lastTopRef.current = scrollerElRef.current.scrollTop;
      lastHeightRef.current = scrollerElRef.current.scrollHeight;
      scrollerElRef.current.addEventListener('scroll', handleScroll, { passive: true });
    }
  }, [handleScroll]);

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
    // The only way to resume tailing: force follow on and scroll to the newest entry.
    setFollow(true);
    virtuosoRef.current?.scrollToIndex({ index: 'LAST', behavior: 'auto' });
  }, [setFollow]);

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
            scrollerRef={setScrollerRef}
            data={filteredEntries}
            computeItemKey={(_index, entry) => entry.id}
            fixedItemHeight={ROW_H}
            followOutput={() => (followingRef.current ? 'auto' : false)}
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
