import { ChevronDown } from 'lucide-react';
import { useCallback, type ChangeEvent } from 'react';
import { HexColorPicker } from 'react-colorful';
import { cn } from '../lib/utils';
import { Button } from './button';
import { Input } from './input';
import { Popover, PopoverContent, PopoverTrigger } from './popover';

type TColorPickerProps = {
  value?: string;
  onChange?: (value: string) => void;
  error?: string;
  defaultValue?: string;
  label?: string;
  resetLabel?: string;
};

const ColorPicker = ({
  value,
  onChange,
  defaultValue = '#FFFFFF',
  error,
  label,
  resetLabel = 'Reset'
}: TColorPickerProps) => {
  const color = value || defaultValue;
  const handleInput = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      onChange?.(event.currentTarget.value);
    },
    [onChange]
  );
  const handleReset = useCallback(
    () => onChange?.(defaultValue),
    [defaultValue, onChange]
  );

  return (
    <div className="flex flex-col">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            aria-label={label}
            className={cn(
              'justify-start px-2.5 font-mono',
              error && 'border-destructive'
            )}
          >
            <span
              className="size-4 rounded-sm border border-border"
              style={{ backgroundColor: color }}
            />
            {color}
            <ChevronDown className="size-3.5 text-muted-foreground" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="flex w-fit flex-col gap-2 p-3">
          <HexColorPicker color={color} onChange={onChange} />
          <Input
            aria-label={label}
            value={value ?? ''}
            onChange={handleInput}
          />
          <Button type="button" size="sm" variant="ghost" onClick={handleReset}>
            {resetLabel}
          </Button>
        </PopoverContent>
      </Popover>
      {error && <span className="text-sm text-red-500 mt-1">{error}</span>}
    </div>
  );
};

export { ColorPicker };
