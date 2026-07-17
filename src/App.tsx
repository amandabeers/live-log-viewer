import { Workbench } from './firehose/Workbench';

export default function App() {
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

      <Workbench />
    </main>
  );
}
