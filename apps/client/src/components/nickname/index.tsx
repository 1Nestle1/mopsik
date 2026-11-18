import { cn } from '@/lib/utils';
import type { TNicknameStyle } from '@sharkord/shared';
import { memo, type CSSProperties } from 'react';

type TNicknameProps = {
  name: string;
  appearance?: TNicknameStyle | null;
  className?: string;
};

const Nickname = memo(({ name, appearance, className }: TNicknameProps) => (
  <span
    className={cn(className, appearance && 'nickname-effect')}
    data-effect={appearance?.effect}
    style={
      appearance
        ? ({
            '--nickname-color': appearance.color,
            '--nickname-accent': appearance.accent
          } as CSSProperties)
        : undefined
    }
  >
    {name}
  </span>
));

export { Nickname };
