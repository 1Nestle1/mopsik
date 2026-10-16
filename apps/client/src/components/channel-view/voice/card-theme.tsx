import { DEFAULT_PROFILE_COLOR } from '@sharkord/shared';
import { memo, useMemo } from 'react';

type TCardThemeProps = {
  profileColor?: string;
  toneColor?: string;
  hasVideoStream?: boolean;
};

// a soft wash of the person's own color over the tile, so a voice-only call still shows who
// is who at a glance. a profile color someone picked wins over the generated tone
const CardTheme = memo(
  ({
    profileColor = DEFAULT_PROFILE_COLOR,
    toneColor,
    hasVideoStream = false
  }: TCardThemeProps) => {
    const style = useMemo(() => {
      if (hasVideoStream) return { backgroundColor: '#000000' };

      const hasCustomColor = profileColor !== DEFAULT_PROFILE_COLOR;
      const wash = hasCustomColor ? profileColor : toneColor;

      if (!wash) return { backgroundColor: 'var(--card)' };

      return {
        backgroundImage: `radial-gradient(120% 90% at 50% 0%, color-mix(in oklch, ${wash} 24%, var(--card)) 0%, var(--card) 72%)`
      };
    }, [profileColor, toneColor, hasVideoStream]);

    return (
      <div className="absolute inset-0 pointer-events-none" style={style} />
    );
  }
);

CardTheme.displayName = 'CardTheme';

export { CardTheme };
