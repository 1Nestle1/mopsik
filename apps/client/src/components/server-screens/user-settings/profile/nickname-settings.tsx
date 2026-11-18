import { Nickname } from '@/components/nickname';
import { NICKNAME_EFFECTS, type TNicknameStyle } from '@sharkord/shared';
import { memo, useCallback, type ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';

const DEFAULT_STYLE: TNicknameStyle = {
  color: '#7195c9',
  accent: '#bd8cae',
  effect: 'plain'
};

type TNicknameSettingsProps = {
  name: string;
  appearance: TNicknameStyle | null;
  onChange: (appearance: TNicknameStyle | null) => void;
};

const NicknameSettings = memo(
  ({ name, appearance, onChange }: TNicknameSettingsProps) => {
    const { t } = useTranslation('settings');
    const current = appearance ?? DEFAULT_STYLE;

    const handleEffect = useCallback(
      (event: ChangeEvent<HTMLSelectElement>) => {
        const effect = NICKNAME_EFFECTS.find(
          (value) => value === event.currentTarget.value
        );
        onChange(effect ? { ...current, effect } : null);
      },
      [current, onChange]
    );

    const handleColor = useCallback(
      (event: ChangeEvent<HTMLInputElement>) => {
        const { name, value } = event.currentTarget;
        onChange({ ...current, [name]: value });
      },
      [current, onChange]
    );

    return (
      <fieldset className="grid gap-3 border-t border-border pt-4">
        <div>
          <label
            htmlFor="profile-nickname-effect"
            className="text-sm font-medium"
          >
            {t('nicknameStyle.label')}
          </label>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('nicknameStyle.description')}
          </p>
        </div>
        <div className="grid items-end gap-3 sm:grid-cols-[minmax(9rem,1fr)_auto_auto]">
          <select
            id="profile-nickname-effect"
            value={appearance?.effect ?? 'default'}
            onChange={handleEffect}
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="default">{t('nicknameStyle.default')}</option>
            {NICKNAME_EFFECTS.map((effect) => (
              <option key={effect} value={effect}>
                {t(`nicknameStyle.${effect}`)}
              </option>
            ))}
          </select>
          {appearance && (
            <label className="flex h-9 items-center gap-2 text-sm">
              <input
                name="color"
                type="color"
                value={current.color}
                onChange={handleColor}
                className="size-8 cursor-pointer rounded-md border border-input bg-transparent p-0.5"
              />
              {t('nicknameStyle.color')}
            </label>
          )}
          {appearance?.effect === 'gradient' && (
            <label className="flex h-9 items-center gap-2 text-sm">
              <input
                name="accent"
                type="color"
                value={current.accent}
                onChange={handleColor}
                className="size-8 cursor-pointer rounded-md border border-input bg-transparent p-0.5"
              />
              {t('nicknameStyle.accent')}
            </label>
          )}
        </div>
        <div className="flex min-w-0 items-center justify-between gap-3 rounded-lg bg-muted px-3 py-2.5">
          <span className="shrink-0 text-xs text-muted-foreground">
            {t('nicknameStyle.preview')}
          </span>
          <Nickname
            name={name || t('usernameLabel')}
            appearance={appearance}
            className="min-w-0 truncate text-sm font-semibold"
          />
        </div>
      </fieldset>
    );
  }
);

export { NicknameSettings };
