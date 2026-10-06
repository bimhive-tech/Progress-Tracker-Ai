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
            'grid size-9 place-items-center transition',
            value === key ? 'bg-accent-soft text-accent ring-1 ring-accent/40' : 'text-muted hover:bg-white/[0.07] hover:text-ink',
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
        <span className="grid size-10 place-items-center border border-line-strong bg-sidebar text-ink-soft transition hover:border-accent/70">
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
