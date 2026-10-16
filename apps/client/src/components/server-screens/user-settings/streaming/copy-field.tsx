import { Button } from '@sharkord/ui';
import { Check, Copy } from 'lucide-react';
import { memo, useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

type TCopyFieldProps = {
  value: string;
  // a secret is blurred until hovered or focused, so a screen share doesn't show it by accident
  secret?: boolean;
};

const COPIED_FEEDBACK_MS = 1500;

const CopyField = memo(({ value, secret = false }: TCopyFieldProps) => {
  const { t } = useTranslation('settings');
  const [copied, setCopied] = useState(false);

  const onCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch {
      toast.error(t('streamingCopyFailed'));
    }
  }, [value, t]);

  useEffect(() => {
    if (!copied) return;

    const timer = setTimeout(() => setCopied(false), COPIED_FEEDBACK_MS);

    return () => clearTimeout(timer);
  }, [copied]);

  return (
    <div className="flex items-center gap-2">
      <code
        tabIndex={secret ? 0 : undefined}
        className={
          secret
            ? 'min-w-0 flex-1 truncate rounded-lg bg-muted px-3 py-2 font-mono text-sm blur-sm transition-[filter] duration-150 hover:blur-none focus-visible:blur-none'
            : 'min-w-0 flex-1 truncate rounded-lg bg-muted px-3 py-2 font-mono text-sm'
        }
      >
        {value}
      </code>
      <Button
        variant="secondary"
        size="icon"
        onClick={onCopy}
        title={t('streamingCopy')}
        aria-label={t('streamingCopy')}
      >
        {copied ? <Check className="text-live" /> : <Copy />}
      </Button>
    </div>
  );
});

export { CopyField };
