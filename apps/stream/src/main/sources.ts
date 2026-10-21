import { desktopCapturer } from 'electron';
import type { TCaptureSource } from '../shared/types';

const THUMBNAIL_SIZE = { width: 480, height: 270 };

const listSources = async (ownSourceId: string | undefined) => {
  const sources = await desktopCapturer.getSources({
    types: ['screen', 'window'],
    thumbnailSize: THUMBNAIL_SIZE,
    fetchWindowIcons: true
  });

  return sources
    .filter((source) => source.id !== ownSourceId)
    .map(
      (source): TCaptureSource => ({
        id: source.id,
        name: source.name,
        kind: source.id.startsWith('screen:') ? 'screen' : 'window',
        thumbnail: source.thumbnail.toDataURL(),
        appIcon:
          source.appIcon && !source.appIcon.isEmpty()
            ? source.appIcon.toDataURL()
            : null
      })
    );
};

export { listSources };
