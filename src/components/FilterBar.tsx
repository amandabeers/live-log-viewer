import { LEVELS, SERVICES } from '../hooks/useFirehose';
import type { Level, Service } from '../hooks/useFirehose';

type Status = 'connecting' | 'open' | 'reconnecting';

interface Props {
  status: Status;
  shown: number;
  retained: number;
  activeLevels: Set<Level>;
  activeServices: Set<Service>;
  onToggleLevel: (level: Level) => void;
  onToggleService: (service: Service) => void;
  onSetLevels: (levels: Set<Level>) => void;
  onSetServices: (services: Set<Service>) => void;
}

const STATUS_LABEL: Record<Status, string> = {
  connecting: 'connecting…',
  open: 'connected',
  reconnecting: 'reconnecting…',
};

export function FilterBar({
  status,
  shown,
  retained,
  activeLevels,
  activeServices,
  onToggleLevel,
  onToggleService,
  onSetLevels,
  onSetServices,
}: Props) {
  return (
    <header className="toolbar">
      <div className="toolbar__top">
        <h1 className="toolbar__title">Realtime Log Stream Viewer</h1>
        <span className={`status status--${status}`}>
          <span className="status__dot" />
          {STATUS_LABEL[status]}
        </span>
        <span className="toolbar__spacer" />
        <span className="counts">
          showing <b>{shown.toLocaleString()}</b> of <b>{retained.toLocaleString()}</b> retained
        </span>
      </div>

      <div className="filter-row">
        <span className="filter-row__label">Level</span>
        {LEVELS.map((level) => {
          const active = activeLevels.has(level);
          return (
            <button
              key={level}
              type="button"
              className={`chip chip--level${active ? ' chip--active' : ''}`}
              data-level={level}
              aria-pressed={active}
              onClick={() => onToggleLevel(level)}
            >
              <span className="chip__swatch" />
              {level}
            </button>
          );
        })}
        <button className="link-btn" type="button" onClick={() => onSetLevels(new Set(LEVELS))}>
          all
        </button>
        <button className="link-btn" type="button" onClick={() => onSetLevels(new Set())}>
          none
        </button>
      </div>

      <div className="filter-row">
        <span className="filter-row__label">Service</span>
        {SERVICES.map((service) => {
          const active = activeServices.has(service);
          return (
            <button
              key={service}
              type="button"
              className={`chip chip--service${active ? ' chip--active' : ''}`}
              aria-pressed={active}
              onClick={() => onToggleService(service)}
            >
              <span className="chip__swatch" />
              {service}
            </button>
          );
        })}
        <button className="link-btn" type="button" onClick={() => onSetServices(new Set(SERVICES))}>
          all
        </button>
        <button className="link-btn" type="button" onClick={() => onSetServices(new Set())}>
          none
        </button>
      </div>
    </header>
  );
}
