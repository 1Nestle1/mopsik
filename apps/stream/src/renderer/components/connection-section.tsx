import { Button, Input } from '@sharkord/ui';
import { Check } from 'lucide-react';
import { memo, useCallback, useState, type ChangeEvent } from 'react';
import { useT } from '../lib/i18n';
import { Field, Section } from './section';

type TConnectionSectionProps = {
  serverUrl: string;
  hasStreamKey: boolean;
  disabled: boolean;
  onServerUrlChange: (serverUrl: string) => void;
  onSaveStreamKey: (streamKey: string) => Promise<void>;
};

export const ConnectionSection = memo(
  ({
    serverUrl,
    hasStreamKey,
    disabled,
    onServerUrlChange,
    onSaveStreamKey
  }: TConnectionSectionProps) => {
    const t = useT();
    const [isEditingKey, setIsEditingKey] = useState(!hasStreamKey);
    const [keyDraft, setKeyDraft] = useState('');

    const onUrlInput = useCallback(
      (event: ChangeEvent<HTMLInputElement>) =>
        onServerUrlChange(event.target.value.trim()),
      [onServerUrlChange]
    );

    const onKeyInput = useCallback(
      (event: ChangeEvent<HTMLInputElement>) => setKeyDraft(event.target.value),
      []
    );

    const onSaveKey = useCallback(async () => {
      if (!keyDraft.trim()) return;

      await onSaveStreamKey(keyDraft);
      setKeyDraft('');
      setIsEditingKey(false);
    }, [keyDraft, onSaveStreamKey]);

    const onChangeKey = useCallback(() => setIsEditingKey(true), []);

    return (
      <Section title={t('serverTitle')}>
        <Field label={t('serverUrl')} hint={t('serverUrlHint')}>
          <Input
            value={serverUrl}
            onChange={onUrlInput}
            placeholder="https://chat.example.com/whip"
            disabled={disabled}
            spellCheck={false}
          />
        </Field>

        <Field label={t('streamKey')} hint={t('streamKeyHint')}>
          {isEditingKey ? (
            <div className="flex gap-2">
              <Input
                type="password"
                value={keyDraft}
                onChange={onKeyInput}
                onEnter={onSaveKey}
                placeholder="sk_…"
                disabled={disabled}
                autoComplete="off"
                spellCheck={false}
              />
              <Button
                onClick={onSaveKey}
                disabled={disabled || !keyDraft.trim()}
              >
                {t('streamKeySave')}
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2 rounded-lg bg-muted px-3 py-2">
              <span className="flex items-center gap-2 text-sm">
                <Check className="size-4 text-live" />
                {t('streamKeySaved')}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={onChangeKey}
                disabled={disabled}
              >
                {t('streamKeyChange')}
              </Button>
            </div>
          )}
        </Field>
      </Section>
    );
  }
);
