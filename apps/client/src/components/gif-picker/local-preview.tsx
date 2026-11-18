import { memo, useEffect, useState } from 'react';

const LocalGifPreview = memo(({ image }: { image: Blob }) => {
  const [url, setUrl] = useState('');

  useEffect(() => {
    const next = URL.createObjectURL(image);
    setUrl(next);

    return () => URL.revokeObjectURL(next);
  }, [image]);

  if (!url) return null;

  return (
    <img
      src={url}
      alt=""
      loading="lazy"
      className="h-full w-full object-contain"
    />
  );
});

export { LocalGifPreview };
