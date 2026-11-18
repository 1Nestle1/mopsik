import { useOwnUserId } from '@/features/server/users/hooks';
import { getFileUrl } from '@/helpers/get-file-url';
import type { TFile } from '@sharkord/shared';
import { Button } from '@sharkord/ui';
import { Bookmark } from 'lucide-react';
import { memo, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { importLocalGif, MAX_GIF_SIZE, saveBuiltInGif } from './library';

type TSaveGifButtonProps = { title: string; file?: TFile; src?: string };

const SaveGifButton = memo(({ title, file, src }: TSaveGifButtonProps) => {
  const { t } = useTranslation('common');
  const userId = useOwnUserId();
  const [saving, setSaving] = useState(false);

  const handleSave = useCallback(async () => {
    if (userId === undefined || saving) return;

    setSaving(true);
    try {
      if (file) {
        const url = new URL(getFileUrl(file));
        const response = await fetch(`${url.pathname}${url.search}`, {
          signal: AbortSignal.timeout(8000)
        });
        if (!response.ok) throw new Error('GIF download failed');
        const blob = await response.blob();
        const gif = new File([blob], file.originalName, { type: 'image/gif' });
        await importLocalGif(userId, gif, `attachment:${file.id}`);
      } else if (src) {
        await saveBuiltInGif(userId, src, title);
      }
      toast.success(t('myGifs.saved'));
    } catch {
      toast.error(t('myGifs.storageError'));
    } finally {
      setSaving(false);
    }
  }, [file, saving, src, t, title, userId]);

  if (!(file || src) || (file && file.size > MAX_GIF_SIZE)) return null;
  const label = t('myGifs.save', { title });
  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className="size-8 shrink-0 bg-popover"
      title={label}
      aria-label={label}
      disabled={saving}
      onClick={handleSave}
    >
      <Bookmark className="size-3.5" />
    </Button>
  );
});

export { SaveGifButton };
