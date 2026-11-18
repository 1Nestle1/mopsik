import { getGifProvider } from '@sharkord/shared';
import { memo } from 'react';
import { isGifProviderEnabled } from './providers';

type TGifImageProps = {
  src: string;
  title: string;
  className?: string;
  animate?: boolean;
};

const GifImage = memo(
  ({ src, title, className, animate = true }: TGifImageProps) => {
    const provider = getGifProvider(src);
    if (!provider || !isGifProviderEnabled(provider))
      return <span>{title}</span>;

    const image = (
      <img
        className={className}
        src={
          !animate && provider === 'library'
            ? src.replace(/\.gif$/, '.png')
            : src
        }
        alt={title}
        loading="lazy"
        referrerPolicy="no-referrer"
        draggable={false}
      />
    );
    if (provider !== 'library') return image;

    const still = src.replace(/\.gif$/, '.png');

    return (
      <picture>
        <source media="(prefers-reduced-motion: reduce)" srcSet={still} />
        {image}
      </picture>
    );
  }
);

export { GifImage };
