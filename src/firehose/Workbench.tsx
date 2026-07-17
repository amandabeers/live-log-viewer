import { useEffect, useState } from 'react';
import { firehose } from './source';

/**
 * Dev-only control overlay. Drives the firehose directly via `firehose.controls` and shows a
 * proof-of-life readout. This is the assignment's instrument; don't edit src/firehose/.
 */
export function Workbench() {
  const [stats, setStats] = useState(firehose.controls.stats());

  useEffect(function subscribeToStats() {
    return firehose.controls.onStats(() => setStats(firehose.controls.stats()));
  }, []);

  return (
    <div style={styles.panel}>
      <div style={styles.header}>
        <strong>Firehose Workbench</strong>
        <span style={{ ...styles.dot, background: stats.connected ? '#3fb950' : '#8b949e' }} />
      </div>
      <div style={styles.readout}>
        <span>emitted: <b>{stats.emitted.toLocaleString()}</b></span>
        <span>rate: <b>{stats.paused ? 'paused' : `${stats.rate}/s`}</b></span>
        <span>delivering: <b>{stats.connected ? 'yes' : 'no (connect to receive)'}</b></span>
      </div>
      <div style={styles.row}>
        <button
          style={styles.btn}
          onClick={() => (stats.paused ? firehose.controls.resume() : firehose.controls.pause())}
        >
          {stats.paused ? '▶ Resume' : '⏸ Pause'}
        </button>
        <button style={styles.drop} onClick={() => firehose.controls.forceDrop()}>Drop connection</button>
      </div>
      <div style={styles.row}>
        <button style={styles.btn} onClick={() => firehose.controls.burst(5000)}>Burst 5k</button>
        <button style={styles.btn} onClick={() => firehose.controls.burst(50000)}>Burst 50k</button>
      </div>
      <div style={styles.row}>
        {[5, 20, 100, 1000, 5000].map((r) => (
          <button
            key={r}
            style={{ ...styles.btn, ...(stats.rate === r ? styles.active : {}) }}
            onClick={() => firehose.controls.setRate(r)}
          >
            {r}/s
          </button>
        ))}
      </div>
      <p style={styles.hint}>Drop connection acts on your app once it calls <code>connect()</code>.</p>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  panel: {
    position: 'fixed', bottom: 16, right: 16, width: 280, padding: 12, zIndex: 9999,
    background: '#0d1117', color: '#e6edf3', border: '1px solid #30363d', borderRadius: 8,
    font: '12px/1.4 ui-monospace, monospace', boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
  },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  dot: { width: 8, height: 8, borderRadius: '50%' },
  readout: { display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 8, color: '#8b949e' },
  row: { display: 'flex', gap: 6, marginBottom: 6, flexWrap: 'wrap' },
  btn: { flex: '0 0 auto', padding: '4px 8px', background: '#21262d', color: '#e6edf3', border: '1px solid #30363d', borderRadius: 6, cursor: 'pointer', font: 'inherit' },
  active: { background: '#1f6feb', border: '1px solid #1f6feb' },
  drop: { flex: '0 0 auto', padding: '4px 10px', background: '#da3633', color: '#fff', border: '1px solid #da3633', borderRadius: 6, cursor: 'pointer', font: 'inherit' },
  hint: { margin: '6px 0 0', color: '#6e7681', fontSize: 11, lineHeight: 1.3 },
};
