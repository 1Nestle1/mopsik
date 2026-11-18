import { useTheme, type TTheme } from '@/components/theme-provider/context';
import { Monitor, Moon, Sun } from 'lucide-react';
import { memo, useCallback, type ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { SettingsSection } from '../../settings-shell/section';

const THEMES = [
  { value: 'dark', label: 'themeDark', icon: Moon },
  { value: 'light', label: 'themeLight', icon: Sun },
  { value: 'system', label: 'themeSystem', icon: Monitor }
] as const;

const Appearance = memo(() => {
  const { t } = useTranslation('settings');
  const { theme, setTheme } = useTheme();

  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) =>
      setTheme(event.currentTarget.value as TTheme),
    [setTheme]
  );

  return (
    <SettingsSection
      title={t('appearanceTab')}
      description={t('appearanceDescription')}
    >
      <fieldset className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <legend className="sr-only">{t('appearanceTab')}</legend>
        {THEMES.map(({ value, label, icon: Icon }) => (
          <label key={value} className="group relative cursor-pointer">
            <input
              className="peer sr-only"
              type="radio"
              name="appearance-theme"
              value={value}
              checked={theme === value}
              onChange={handleChange}
            />
            <span className="flex min-h-11 items-center gap-3 rounded-lg border border-border px-3 py-2.5 text-sm font-medium text-muted-foreground group-hover:bg-accent peer-checked:border-primary peer-checked:bg-secondary peer-checked:text-foreground peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring">
              <Icon className="size-4 shrink-0" aria-hidden />
              {t(label)}
            </span>
          </label>
        ))}
      </fieldset>
    </SettingsSection>
  );
});

export { Appearance };
