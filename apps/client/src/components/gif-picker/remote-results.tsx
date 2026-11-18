import { memo, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { fetchGifs, type TExternalGifProvider, type TGif } from './providers';
import { GifResults } from './results';

type TRemoteGifResultsProps = {
  provider: TExternalGifProvider;
  query: string;
  onSelect: (gif: TGif) => void;
};

const RemoteGifResults = memo(
  ({ provider, query, onSelect }: TRemoteGifResultsProps) => {
    const { t, i18n } = useTranslation('common');
    const locale = i18n.resolvedLanguage ?? 'en';
    const [gifs, setGifs] = useState<TGif[] | 'error' | null>(null);

    useEffect(() => {
      const controller = new AbortController();
      const timer = window.setTimeout(
        () => {
          fetchGifs(provider, query, locale, controller.signal)
            .then((results) => {
              if (!controller.signal.aborted) setGifs(results);
            })
            .catch(() => {
              if (!controller.signal.aborted) setGifs('error');
            });
        },
        query ? 350 : 0
      );

      return () => {
        window.clearTimeout(timer);
        controller.abort();
      };
    }, [provider, query, locale]);

    if (gifs === null || gifs === 'error') {
      return (
        <p
          role="status"
          className="px-3 py-9 text-center text-sm text-muted-foreground"
        >
          {t(gifs === null ? 'gifLoading' : 'gifError')}
        </p>
      );
    }

    return <GifResults gifs={gifs} onSelect={onSelect} />;
  }
);

export { RemoteGifResults };
