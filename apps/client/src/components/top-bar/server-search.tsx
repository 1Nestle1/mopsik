import { openDialog } from '@/features/dialogs/actions';
import { Search } from 'lucide-react';
import { memo, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog } from '../dialogs/dialogs';

const ServerSearch = memo(() => {
  const { t } = useTranslation('topbar');
  const openSearchDialog = useCallback(() => {
    openDialog(Dialog.SEARCH);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        openSearchDialog();
      }
    };

    window.addEventListener('keydown', onKeyDown);

    return () => window.removeEventListener('keydown', onKeyDown);
  }, [openSearchDialog]);

  return (
    <button
      type="button"
      onClick={openSearchDialog}
      className="flex w-96 max-w-2xl items-center gap-2 rounded-full bg-background/70 px-3.5 py-1.5 text-xs text-muted-foreground transition-colors duration-150 ease-emphasized hover:bg-background hover:text-foreground"
    >
      <Search className="h-3.5 w-3.5" />
      <span className="truncate text-left">{t('searchContent')}</span>
      <span className="ml-auto hidden rounded-full bg-foreground/[0.07] px-2 py-0.5 font-mono text-[11px] md:inline">
        Ctrl+K
      </span>
    </button>
  );
});

export { ServerSearch };
