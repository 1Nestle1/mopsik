import { cn } from '@/lib/utils';
import type { TIconButtonSize } from '@sharkord/ui';

// cards shrink to the thumbnail strip when another card is pinned
const cardDensity = (isCompact: boolean) => ({
  inset: isCompact ? 'p-1' : 'p-2',
  label: isCompact ? 'text-xs' : 'text-sm',
  icon: (isCompact ? 'xs' : 'sm') as TIconButtonSize
});

// a fixed height rather than padding around whatever is inside, so the badge does not jump
// when a state icon appears next to the name. frosted because it floats over live video
const cardBadgeClass = (isCompact: boolean) =>
  cn(
    'inline-flex min-w-0 items-center rounded-full bg-background/70 text-foreground backdrop-blur-md overflow-hidden truncate',
    isCompact ? 'h-6 gap-1.5 px-2' : 'h-7 gap-2 px-3'
  );

const cardControlsClass = (isCompact: boolean) =>
  cn(
    'inline-flex items-center rounded-full bg-background/70 backdrop-blur-md gap-0.5 px-1',
    isCompact ? 'h-6' : 'h-7'
  );

const cardControlClass = (isActive?: boolean) =>
  cn(
    'rounded-full p-1 shrink-0 transition-colors duration-150 ease-emphasized hover:bg-foreground/10',
    isActive && 'bg-primary text-primary-foreground hover:bg-primary/90'
  );

export { cardBadgeClass, cardControlClass, cardControlsClass, cardDensity };
