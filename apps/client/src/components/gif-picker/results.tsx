import { Button } from '@sharkord/ui';
import { Bookmark } from 'lucide-react';
import { memo, useCallback, type MouseEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { GifImage } from './gif-image';
import { LocalGifPreview } from './local-preview';
import type { TGif } from './providers';

type TGifResultsProps = {
  gifs: TGif[];
  onSelect: (gif: TGif) => void;
  savedIds?: ReadonlySet<string>;
  onToggleSaved?: (gif: TGif) => void;
  animate?: boolean;
  localEnabled?: boolean;
  emptyMessage?: string;
};

const GifResults = memo(
  ({
    gifs,
    onSelect,
    savedIds,
    onToggleSaved,
    animate,
    localEnabled = true,
    emptyMessage
  }: TGifResultsProps) => {
    const { t } = useTranslation('common');
    const handleSelect = useCallback(
      (event: MouseEvent<HTMLButtonElement>) => {
        const index = Number(event.currentTarget.value);
        const gif = gifs[index];

        if (gif) onSelect(gif);
      },
      [gifs, onSelect]
    );
    const handleSave = useCallback(
      (event: MouseEvent<HTMLButtonElement>) => {
        const index = Number(event.currentTarget.value);
        const gif = gifs[index];
        if (gif) onToggleSaved?.(gif);
      },
      [gifs, onToggleSaved]
    );

    if (gifs.length === 0) {
      return (
        <p
          role="status"
          className="px-3 py-9 text-center text-sm text-muted-foreground"
        >
          {emptyMessage ?? t('gifEmpty')}
        </p>
      );
    }

    return (
      <div className="grid min-h-0 grid-cols-2 gap-2 overflow-y-auto p-0.5">
        {gifs.map((gif, index) => {
          const title = gif.title || t('composeGif');
          const saved = savedIds?.has(gif.src);
          const saveLabel = t(saved ? 'myGifs.remove' : 'myGifs.save', {
            title
          });

          return (
            <div
              key={`${gif.src}:${index}`}
              className="relative min-w-0 rounded-lg bg-muted"
            >
              <Button
                type="button"
                variant="ghost"
                value={index}
                disabled={!!gif.local && !localEnabled}
                aria-label={t('gifInsert', { title })}
                title={title}
                onClick={handleSelect}
                className="flex h-auto w-full min-w-0 flex-col items-stretch gap-0 overflow-hidden rounded-lg bg-muted p-0 text-left"
              >
                <span className="flex aspect-[4/3] items-center justify-center overflow-hidden">
                  {gif.local ? (
                    <LocalGifPreview
                      image={animate ? gif.local.file : gif.local.still}
                    />
                  ) : (
                    <GifImage
                      src={gif.preview}
                      title=""
                      animate={animate}
                      className="h-full w-full object-contain"
                    />
                  )}
                </span>
                <span className="truncate px-2.5 py-1.5 text-xs">{title}</span>
              </Button>
              {onToggleSaved && (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="absolute top-1.5 right-1.5 size-8 rounded-md bg-popover"
                  value={index}
                  aria-label={saveLabel}
                  title={saveLabel}
                  aria-pressed={saved}
                  onClick={handleSave}
                >
                  <Bookmark className={saved ? 'fill-current' : undefined} />
                </Button>
              )}
            </div>
          );
        })}
      </div>
    );
  }
);

export { GifResults };
