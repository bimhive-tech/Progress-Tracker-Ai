import clsx from 'clsx';
import { STEP_ICONS, stepIcon } from '../lib/meta';
import { Menu, useCloseMenu } from './ui';

export function IconGrid({ value, onChange }: { value: string | null; onChange: (key: string) => void }) {
  return (
    <div className="grid grid-cols-7 gap-1">
      {Object.entries(STEP_ICONS).map(([key, { icon: Icon, label }]) => (
        <button
          key={key}
          type="button"
          title={label}
          aria-label={label}
          onClick={() => onChange(key)}
          className={clsx(
            'grid size-9 place-items-center rounded-xl transition',
            value === key ? 'bg-gold-soft text-gold-strong ring-1 ring-gold/40' : 'text-muted hover:bg-[#f3f1ec] hover:text-ink',
          )}
        >
          <Icon className="size-[18px]" strokeWidth={1.7} />
        </button>
      ))}
    </div>
  );
}

/** Compact icon button that opens the icon grid. */
export function IconPicker({ value, onChange }: { value: string | null; onChange: (key: string) => void }) {
  const Icon = stepIcon(value);
  return (
    <Menu
      align="left"
      label="Choose icon"
      panelClassName="w-auto p-2"
      trigger={
        <span className="grid size-11 place-items-center rounded-xl border border-line-strong/80 bg-white text-ink-soft transition hover:border-gold">
          <Icon className="size-[18px]" strokeWidth={1.7} />
        </span>
      }
    >
      <IconGridInMenu value={value} onChange={onChange} />
    </Menu>
  );
}

function IconGridInMenu({ value, onChange }: { value: string | null; onChange: (key: string) => void }) {
  const close = useCloseMenu();
  return (
    <IconGrid
      value={value}
      onChange={(key) => {
        onChange(key);
        close();
      }}
    />
  );
}
