import { cn } from '@/lib/utils';
import { TestId } from '@sharkord/shared';
import { Separator, Tooltip } from '@sharkord/ui';
import { AlertCircle } from 'lucide-react';

import { memo, useCallback } from 'react';
import type { TSettingsEntry } from './types';

type TSidebarEntryProps = {
  entry: TSettingsEntry;
  isSelected: boolean;
  onSelect: (id: string) => void;
};

const SidebarEntry = memo(
  ({ entry, isSelected, onSelect }: TSidebarEntryProps) => {
    const { icon: Icon, logo, label, error } = entry;

    const handleClick = useCallback(
      () => onSelect(entry.id),
      [onSelect, entry.id]
    );

    return (
      <button
        data-testid={TestId.SETTINGS_SIDEBAR_ENTRY}
        onClick={handleClick}
        className={cn(
          'flex w-full items-center gap-2 rounded-full px-3 py-2 text-left text-sm text-muted-foreground transition-colors duration-150 ease-emphasized hover:bg-foreground/[0.06] hover:text-foreground',
          isSelected &&
            'bg-primary/12 font-medium text-foreground hover:bg-primary/16'
        )}
      >
        {logo ? (
          <img
            src={logo}
            alt=""
            className="h-4 w-4 shrink-0 rounded-sm object-cover"
          />
        ) : (
          <Icon className="h-4 w-4 shrink-0" />
        )}
        <span className="truncate">{label}</span>
        {error && (
          <Tooltip content={error}>
            <AlertCircle
              role="img"
              aria-label={error}
              className="ml-auto h-4 w-4 shrink-0 text-destructive"
            />
          </Tooltip>
        )}
      </button>
    );
  }
);

type TSettingsSidebarProps = {
  entries: TSettingsEntry[];
  pluginEntries: TSettingsEntry[];
  selectedId: string;
  onSelect: (id: string) => void;
  className?: string;
};

const SettingsSidebar = memo(
  ({
    entries,
    pluginEntries,
    selectedId,
    onSelect,
    className
  }: TSettingsSidebarProps) => {
    return (
      <nav
        className={cn(
          'w-60 shrink-0 space-y-1 overflow-y-auto bg-sidebar p-3',
          className
        )}
      >
        {entries.map((entry) => (
          <SidebarEntry
            key={entry.id}
            entry={entry}
            isSelected={entry.id === selectedId}
            onSelect={onSelect}
          />
        ))}

        {pluginEntries.length > 0 && (
          <>
            <Separator className="my-3" />
            {pluginEntries.map((entry) => (
              <SidebarEntry
                key={entry.id}
                entry={entry}
                isSelected={entry.id === selectedId}
                onSelect={onSelect}
              />
            ))}
          </>
        )}
      </nav>
    );
  }
);

export { SettingsSidebar };
