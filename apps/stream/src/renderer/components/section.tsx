import { memo, type ReactNode } from 'react';

type TSectionProps = {
  title: string;
  action?: ReactNode;
  children: ReactNode;
};

export const Section = memo(({ title, action, children }: TSectionProps) => (
  <section className="space-y-4 rounded-xl bg-card p-4">
    <div className="flex min-h-7 items-center justify-between gap-2">
      <h2 className="text-sm font-semibold">{title}</h2>
      {action}
    </div>
    {children}
  </section>
));

type TFieldProps = {
  label: string;
  hint?: string;
  warning?: string;
  children: ReactNode;
};

export const Field = memo(({ label, hint, warning, children }: TFieldProps) => (
  <div className="space-y-1.5">
    <div className="text-xs font-medium text-muted-foreground">{label}</div>
    {children}
    {hint && <p className="text-xs text-muted-foreground/80">{hint}</p>}
    {warning && <p className="text-xs text-warning">{warning}</p>}
  </div>
));
