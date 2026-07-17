import { useMemo, useState } from 'react';
import { Workbench } from './firehose/Workbench';
import { useFirehose } from './hooks/useFirehose';
import { Virtuoso } from 'react-virtuoso';
import { LEVELS, SERVICES } from './hooks/useFirehose';
import type { Level, Service } from './hooks/useFirehose';
import type { LogEntry } from './firehose/types';

export default function App() {
  const [activeLevels, setActiveLevels] = useState<Set<Level>>(new Set(LEVELS));
  const [activeServices, setActiveServices] = useState<Set<Service>>(new Set(SERVICES));
  const [isAtBottom, setAtBottom] = useState(true);

  const isVisible = (entry: LogEntry) => {
    return activeLevels.has(entry.level) && activeServices.has(entry.service);
  };

  const { entries } = useFirehose({paused: !isAtBottom, isVisible});

  const filteredEntries = useMemo(() => {
    return entries.filter(isVisible);
  }, [entries, activeLevels, activeServices]);
  // console.log('Filtered entries:', filteredEntries);

  return (
    <main style={{ font: '14px/1.5 system-ui, sans-serif', padding: 24, color: '#e6edf3', background: '#010409', minHeight: '100vh' }}>
      <h1 style={{ fontSize: 18, marginBottom: 8 }}>Realtime Log Stream Viewer</h1>
      <p style={{ color: '#8b949e', maxWidth: 560 }}>
        Build your log viewer here. Import the firehose from <code>src/firehose/source.ts</code>,
        <code> connect()</code>, and subscribe with <code>firehose.on('entry', ...)</code>. Read the wire
        contract in <code>src/firehose/README.md</code>. The Workbench (bottom-right) shows the stream
        flowing and lets you drop / pause / burst / ramp it while you build.
      </p>

      {/* Build your log viewer below. */}
      <div style={{height: '100vh'}}>
        <Virtuoso
          atBottomStateChange={setAtBottom}
          followOutput={(isAtBottom) => isAtBottom ? 'auto' : false}
          data={filteredEntries}
          itemContent={(index, entry) => (
            <div style={{ padding: '4px 0', borderBottom: '1px solid #21262d' }}>
              <div style={{ fontSize: 12, color: '#8b949e' }}>
                {new Date(entry.timestamp).toLocaleTimeString()} {entry.level} {entry.service} {entry.message}
              </div>
            </div>
          )}
        />
      </div>

      <Workbench />
    </main>
  );
}
