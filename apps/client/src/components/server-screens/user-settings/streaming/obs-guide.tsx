import { memo } from 'react';
import { useTranslation } from 'react-i18next';

const GUIDE_STEPS = [
  'streamingGuideService',
  'streamingGuideServer',
  'streamingGuideVideo',
  'streamingGuideAudio',
  'streamingGuideStart'
] as const;

const ObsGuide = memo(() => {
  const { t } = useTranslation('settings');

  return (
    <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground marker:text-foreground/60">
      {GUIDE_STEPS.map((step) => (
        <li key={step}>{t(step)}</li>
      ))}
    </ol>
  );
});

export { ObsGuide };
