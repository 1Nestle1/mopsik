import { getGifProvider, type TGifProvider } from '@sharkord/shared';

type TExternalGifProvider = Exclude<TGifProvider, 'library'>;
type TGif = {
  src: string;
  preview: string;
  title: string;
  local?: { file: File; still: Blob };
};

const providerKeys = {
  giphy: import.meta.env.VITE_GIPHY_API_KEY as string | undefined,
  klipy: import.meta.env.VITE_KLIPY_API_KEY as string | undefined
};

const isGifProviderEnabled = (provider: TGifProvider) =>
  provider === 'library' || Boolean(providerKeys[provider]);

type TGiphyResponse = {
  data?: Array<{
    title?: string;
    alt_text?: string;
    images?: {
      fixed_width_small?: { url?: string };
      fixed_width?: { url?: string };
    };
  }>;
};

type TKlipyResponse = {
  result?: boolean;
  data?: {
    data?: Array<{
      type?: string;
      title?: string;
      file?: {
        sm?: { gif?: { url?: string } };
        md?: { gif?: { url?: string } };
      };
    }>;
  };
};

const toGif = (
  provider: TExternalGifProvider,
  src?: string,
  preview?: string,
  title?: string
) => {
  if (typeof src !== 'string' || getGifProvider(src) !== provider) return [];

  return [
    {
      src,
      preview:
        typeof preview === 'string' && getGifProvider(preview) === provider
          ? preview
          : src,
      title: typeof title === 'string' ? title.slice(0, 160) : ''
    }
  ];
};

const fetchGifs = async (
  provider: TExternalGifProvider,
  query: string,
  language: string,
  signal: AbortSignal
): Promise<TGif[]> => {
  const key = providerKeys[provider];
  if (!key) return [];

  const action = query ? 'search' : 'trending';
  const url =
    provider === 'giphy'
      ? new URL(`https://api.giphy.com/v1/gifs/${action}`)
      : new URL(
          `https://api.klipy.com/api/v1/${encodeURIComponent(key)}/gifs/${action}`
        );

  if (query) url.searchParams.set('q', query);

  if (provider === 'giphy') {
    url.searchParams.set('api_key', key);
    url.searchParams.set('limit', '24');
    url.searchParams.set('rating', 'pg');
    if (query) url.searchParams.set('lang', language);
  } else {
    url.searchParams.set('per_page', '24');
    url.searchParams.set('content_filter', 'high');
    url.searchParams.set('locale', language === 'en' ? 'us' : language);
    url.searchParams.set('format_filter', 'gif');
  }

  const response = await fetch(url, {
    signal: AbortSignal.any([signal, AbortSignal.timeout(8000)]),
    cache: 'no-store',
    referrerPolicy: 'no-referrer'
  });
  if (!response.ok) throw new Error('GIF provider request failed');

  if (provider === 'giphy') {
    const { data } = (await response.json()) as TGiphyResponse;
    if (!Array.isArray(data)) throw new Error('Invalid GIPHY response');

    return data.flatMap((item) =>
      toGif(
        provider,
        item.images?.fixed_width?.url,
        item.images?.fixed_width_small?.url,
        item.alt_text || item.title
      )
    );
  }

  const result = (await response.json()) as TKlipyResponse;
  const items = result.data?.data;
  if (!result.result || !Array.isArray(items))
    throw new Error('Invalid KLIPY response');

  return items.flatMap((item) => {
    if (item.type && item.type !== 'gif') return [];

    return toGif(
      provider,
      item.file?.md?.gif?.url,
      item.file?.sm?.gif?.url,
      item.title
    );
  });
};

export {
  fetchGifs,
  isGifProviderEnabled,
  type TExternalGifProvider,
  type TGif
};
