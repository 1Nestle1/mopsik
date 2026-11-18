const BUILT_IN_GIFS = [
  'hello',
  'laugh',
  'celebrate',
  'love',
  'facepalm',
  'brb'
] as const;

const BUILT_IN_GIF_PATH = '/reaction-gifs/';

const getGifProvider = (src: string) => {
  if (BUILT_IN_GIFS.some((id) => src === `${BUILT_IN_GIF_PATH}${id}.gif`)) {
    return 'library';
  }

  if (!src.startsWith('https://') || src.length > 1000) return;

  try {
    const url = new URL(src);
    if (url.username || url.password || url.port || url.hash) return;

    if (
      /^media\d*\.giphy\.com$/.test(url.hostname) &&
      /^\/media(?:\/v1\.[\w=-]+)?\/[a-zA-Z0-9]+\/[\w-]+\.gif$/.test(
        url.pathname
      )
    ) {
      return 'giphy';
    }

    if (
      /^(?:static|cdn)\.klipy\.(?:com|co)$/.test(url.hostname) &&
      /\.(?:gif|webp)$/i.test(url.pathname)
    ) {
      return 'klipy';
    }
  } catch {
    return;
  }
};

type TGifProvider = NonNullable<ReturnType<typeof getGifProvider>>;

export { BUILT_IN_GIFS, BUILT_IN_GIF_PATH, getGifProvider, type TGifProvider };
