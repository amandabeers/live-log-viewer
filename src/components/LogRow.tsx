import { memo } from 'react';
import type { LogEntry } from '../firehose/types';

const timeFmt = new Intl.DateTimeFormat(undefined, {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
});

/** A single scannable log line: time · level · service · message, accent-colored by level. */
export const LogRow = memo(function LogRow({ entry }: { entry: LogEntry }) {
  return (
    <div className="row" data-level={entry.level}>
      <span className="row__time">{timeFmt.format(entry.timestamp)}</span>
      <span className="row__level">{entry.level}</span>
      <span className="row__service" title={entry.service}>{entry.service}</span>
      <span className="row__message" title={entry.message}>{entry.message}</span>
    </div>
  );
});
