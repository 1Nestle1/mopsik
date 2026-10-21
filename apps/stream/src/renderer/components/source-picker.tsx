import { Button, Tabs, TabsContent, TabsList, TabsTrigger } from '@sharkord/ui';
import { RefreshCw } from 'lucide-react';
import { memo, useMemo } from 'react';
import type { TCaptureSource } from '../../shared/types';
import { useT } from '../lib/i18n';
import { SourceCard } from './source-card';

type TSourceGridProps = {
  sources: TCaptureSource[];
  emptyText: string;
  selectedId: string | undefined;
  liveId: string | undefined;
  onSelect: (sourceId: string) => void;
};

const SourceGrid = memo(
  ({ sources, emptyText, selectedId, liveId, onSelect }: TSourceGridProps) => {
    if (sources.length === 0) {
      return (
        <p className="py-16 text-center text-sm text-muted-foreground">
          {emptyText}
        </p>
      );
    }

    return (
      <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-2">
        {sources.map((source) => (
          <SourceCard
            key={source.id}
            source={source}
            isSelected={source.id === selectedId}
            isLive={source.id === liveId}
            onSelect={onSelect}
          />
        ))}
      </div>
    );
  }
);

type TSourcePickerProps = {
  sources: TCaptureSource[];
  selectedId: string | undefined;
  liveId: string | undefined;
  isLive: boolean;
  onSelect: (sourceId: string) => void;
  onRefresh: () => void;
};

export const SourcePicker = memo(
  ({
    sources,
    selectedId,
    liveId,
    isLive,
    onSelect,
    onRefresh
  }: TSourcePickerProps) => {
    const t = useT();

    const { screens, windows } = useMemo(
      () => ({
        screens: sources.filter((source) => source.kind === 'screen'),
        windows: sources.filter((source) => source.kind === 'window')
      }),
      [sources]
    );

    const selectedKind =
      sources.find((source) => source.id === selectedId)?.kind ?? 'window';

    return (
      <Tabs
        defaultValue={selectedKind}
        className="flex min-h-0 flex-1 flex-col"
      >
        <div className="flex items-center justify-between gap-2">
          <TabsList>
            <TabsTrigger value="window">
              {t('sourcesWindows')} · {windows.length}
            </TabsTrigger>
            <TabsTrigger value="screen">
              {t('sourcesScreens')} · {screens.length}
            </TabsTrigger>
          </TabsList>
          <Button
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            title={t('sourcesRefresh')}
          >
            <RefreshCw />
            {t('sourcesRefresh')}
          </Button>
        </div>
        {isLive && (
          <p className="mt-2 text-xs text-muted-foreground">
            {t('sourcesSwitchHint')}
          </p>
        )}
        <div className="mt-3 min-h-0 flex-1 overflow-y-auto pr-1">
          <TabsContent value="window" className="space-y-3">
            <p className="text-xs text-muted-foreground">
              {t('sourcesWindowFpsHint')}
            </p>
            <SourceGrid
              sources={windows}
              emptyText={t('sourcesEmptyWindows')}
              selectedId={selectedId}
              liveId={liveId}
              onSelect={onSelect}
            />
          </TabsContent>
          <TabsContent value="screen">
            <SourceGrid
              sources={screens}
              emptyText={t('sourcesEmptyScreens')}
              selectedId={selectedId}
              liveId={liveId}
              onSelect={onSelect}
            />
          </TabsContent>
        </div>
      </Tabs>
    );
  }
);
