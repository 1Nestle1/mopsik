import { useOwnUserId } from '@/features/server/users/hooks';
import {
  BUILT_IN_GIF_PATH,
  BUILT_IN_GIFS,
  type TGifProvider
} from '@sharkord/shared';
import {
  Button,
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@sharkord/ui';
import { FileImage, Pause, Play, Plus, Search } from 'lucide-react';
import {
  memo,
  useCallback,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type MouseEvent
} from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  importLocalGif,
  readLibrary,
  removeSavedGif,
  saveBuiltInGif,
  type TSavedGif
} from './library';
import { isGifProviderEnabled, type TGif } from './providers';
import { RemoteGifResults } from './remote-results';
import { GifResults } from './results';

const PROVIDERS = [
  { id: 'library', name: 'MOPSCORD' },
  { id: 'giphy', name: 'GIPHY' },
  { id: 'klipy', name: 'KLIPY' }
] as const;
const availableProviders = PROVIDERS.filter(({ id }) =>
  isGifProviderEnabled(id)
);

type TGifPickerProps = {
  disabled: boolean;
  localEnabled: boolean;
  onSelect: (src: string, title: string) => void;
  onSelectLocal: (file: File) => void;
};

const GifPicker = memo(
  ({ disabled, localEnabled, onSelect, onSelectLocal }: TGifPickerProps) => {
    const { t } = useTranslation('common');
    const userId = useOwnUserId();
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [provider, setProvider] = useState<TGifProvider | 'saved'>('library');
    const [saved, setSaved] = useState<TSavedGif[]>([]);
    const [animate, setAnimate] = useState(false);
    const [importing, setImporting] = useState(false);
    const searchRef = useRef<HTMLInputElement>(null);
    const fileRef = useRef<HTMLInputElement>(null);
    const insertedRef = useRef(false);
    const keyword = query.trim();
    const normalizedKeyword = keyword.toLocaleLowerCase();
    const sourceName = PROVIDERS.find(({ id }) => provider === id)?.name;
    let searchLabel = t('gifSearch');
    if (provider === 'saved') searchLabel = t('myGifs.search');
    else if (provider !== 'library')
      searchLabel = t('gifSearchProvider', { provider: sourceName });
    const savedIds = useMemo(() => new Set(saved.map(({ id }) => id)), [saved]);

    const handleSearch = useCallback((event: ChangeEvent<HTMLInputElement>) => {
      setQuery(event.currentTarget.value);
    }, []);
    const handleProvider = useCallback(
      (event: MouseEvent<HTMLButtonElement>) => {
        setProvider(event.currentTarget.value as TGifProvider | 'saved');
      },
      []
    );
    const handleOpen = useCallback(
      (nextOpen: boolean) => {
        if (nextOpen) {
          setProvider('library');
          setQuery('');
          if (userId !== undefined) {
            readLibrary(userId)
              .then(setSaved)
              .catch(() => toast.error(t('myGifs.storageError')));
          }
        }
        setOpen(nextOpen);
      },
      [userId, t]
    );
    const handleOpenFocus = useCallback((event: Event) => {
      event.preventDefault();
      searchRef.current?.focus();
    }, []);
    const handleCloseFocus = useCallback((event: Event) => {
      if (insertedRef.current) event.preventDefault();
      insertedRef.current = false;
    }, []);
    const handleSelect = useCallback(
      (gif: TGif) => {
        if (disabled) return;

        if (gif.local) {
          if (!localEnabled) return;
          insertedRef.current = true;
          onSelectLocal(gif.local.file);
          setOpen(false);
          return;
        }
        insertedRef.current = true;
        onSelect(gif.src, gif.title || t('composeGif'));
        setOpen(false);
      },
      [disabled, localEnabled, onSelect, onSelectLocal, t]
    );
    const handleBookmark = useCallback(
      async (gif: TGif) => {
        if (userId === undefined) return;

        try {
          const next = savedIds.has(gif.src)
            ? await removeSavedGif(userId, gif.src)
            : await saveBuiltInGif(userId, gif.src, gif.title);
          setSaved(next);
        } catch {
          toast.error(t('myGifs.storageError'));
        }
      },
      [userId, savedIds, t]
    );
    const openImport = useCallback(() => fileRef.current?.click(), []);
    const toggleAnimation = useCallback(
      () => setAnimate((value) => !value),
      []
    );
    const handleImport = useCallback(
      async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.currentTarget.files?.[0];
        event.currentTarget.value = '';
        if (!file || userId === undefined) return;

        setImporting(true);
        try {
          const next = await importLocalGif(userId, file);
          setSaved(next);
          setProvider('saved');
          setQuery('');
        } catch {
          toast.error(t('myGifs.importError'));
        } finally {
          setImporting(false);
        }
      },
      [t, userId]
    );

    const library = BUILT_IN_GIFS.flatMap((id) => {
      const title = t(`gifLibrary.${id}`);
      const searchable = `${id} ${title}`.toLocaleLowerCase();
      if (!searchable.includes(normalizedKeyword)) return [];

      const src = `${BUILT_IN_GIF_PATH}${id}.gif`;
      return [{ src, preview: src, title }];
    });
    const savedResults: TGif[] = saved.flatMap((gif) => {
      if (!gif.title.toLocaleLowerCase().includes(normalizedKeyword)) return [];
      if (gif.file)
        return [{ src: gif.id, title: gif.title, preview: '', local: gif }];
      return [{ src: gif.src, title: gif.title, preview: gif.src }];
    });
    const isLocalSource = provider === 'library' || provider === 'saved';

    return (
      <Popover open={open} onOpenChange={handleOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            disabled={disabled}
            title={t('composeGif')}
            aria-label={t('composeGif')}
          >
            <FileImage className="size-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          aria-label={t('composeGif')}
          align="end"
          side="top"
          sideOffset={8}
          onOpenAutoFocus={handleOpenFocus}
          onCloseAutoFocus={handleCloseFocus}
          className="flex max-h-[min(34rem,var(--radix-popover-content-available-height))] w-[min(24rem,calc(100vw-1.5rem))] flex-col gap-2.5 p-3"
        >
          <div className="relative shrink-0">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              ref={searchRef}
              maxLength={100}
              className="pl-9"
              placeholder={searchLabel}
              aria-label={searchLabel}
              value={query}
              onChange={handleSearch}
            />
          </div>
          <div
            role="group"
            aria-label={t('gifSource')}
            className="flex shrink-0 flex-wrap gap-1"
          >
            {availableProviders.map(({ id, name }) => (
              <Button
                key={id}
                type="button"
                size="sm"
                value={id}
                variant={provider === id ? 'secondary' : 'ghost'}
                aria-pressed={provider === id}
                onClick={handleProvider}
              >
                {name}
              </Button>
            ))}
            <Button
              type="button"
              size="sm"
              value="saved"
              variant={provider === 'saved' ? 'secondary' : 'ghost'}
              aria-pressed={provider === 'saved'}
              onClick={handleProvider}
            >
              {t('myGifs.tab')}
            </Button>
          </div>
          {isLocalSource && (
            <div className="flex shrink-0 items-center justify-between gap-2 border-t border-border pt-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/gif,.gif"
                className="hidden"
                aria-label={t('myGifs.import')}
                onChange={handleImport}
              />
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={openImport}
                disabled={importing || userId === undefined}
              >
                <Plus /> {t('myGifs.import')}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={toggleAnimation}
                aria-pressed={animate}
              >
                {animate ? <Pause /> : <Play />}{' '}
                {t(animate ? 'myGifs.pause' : 'myGifs.play')}
              </Button>
            </div>
          )}
          {isLocalSource ? (
            <GifResults
              gifs={provider === 'library' ? library : savedResults}
              onSelect={handleSelect}
              savedIds={savedIds}
              onToggleSaved={handleBookmark}
              animate={animate}
              localEnabled={localEnabled}
              emptyMessage={
                provider === 'saved' && !keyword ? t('myGifs.empty') : undefined
              }
            />
          ) : (
            <RemoteGifResults
              key={`${provider}:${keyword}`}
              provider={provider}
              query={keyword}
              onSelect={handleSelect}
            />
          )}
          {provider === 'giphy' && (
            <picture className="shrink-0 self-end">
              <img
                className="h-3 w-auto dark:hidden"
                src="/reaction-gifs/giphy-on-light.png"
                alt="Powered by GIPHY"
              />
              <img
                className="hidden h-3 w-auto dark:block"
                src="/reaction-gifs/giphy-on-dark.png"
                alt="Powered by GIPHY"
              />
            </picture>
          )}
          {provider === 'klipy' && (
            <span className="shrink-0 self-end text-xs font-medium text-muted-foreground">
              Powered by KLIPY
            </span>
          )}
        </PopoverContent>
      </Popover>
    );
  }
);

export { GifPicker };
