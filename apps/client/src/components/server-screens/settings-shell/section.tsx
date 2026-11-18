import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  cn
} from '@sharkord/ui';
import { memo, type ReactNode } from 'react';

type TSettingsSectionProps = {
  title: ReactNode;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
};

const SettingsSection = memo(
  ({
    title,
    description,
    action,
    children,
    className
  }: TSettingsSectionProps) => {
    return (
      <Card className={cn('gap-4 py-4 md:py-5', className)}>
        <CardHeader className="px-4 md:px-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <CardTitle>{title}</CardTitle>
              {description && <CardDescription>{description}</CardDescription>}
            </div>
            {action && (
              <div className="flex shrink-0 items-center gap-1">{action}</div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4 px-4 md:px-5">{children}</CardContent>
      </Card>
    );
  }
);

export { SettingsSection };
