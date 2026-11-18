import { Slider as BaseSlider } from "@base-ui/react/slider";
import { cn } from "cn";
import type { ComponentProps, ReactElement } from "react";

export interface SliderProps extends ComponentProps<typeof BaseSlider.Root> {
  readonly label?: string;
  readonly showValue?: boolean;
}

export function Slider({ className, label, showValue = false, ...props }: SliderProps): ReactElement {
  return (
    <BaseSlider.Root className={cn("flex w-full flex-col gap-2 select-none", className)} {...props}>
      {label || showValue ? (
        <div className="flex items-center justify-between gap-2">
          {label ? <span className="font-sans text-xs font-ui text-text-secondary">{label}</span> : null}
          {showValue ? (
            <BaseSlider.Value className="font-mono text-xs font-ui tracking-mono text-text-primary tabular-nums" />
          ) : null}
        </div>
      ) : null}
      <BaseSlider.Control className="relative flex min-h-6 w-full cursor-pointer touch-none items-center py-1 data-disabled:pointer-events-none data-disabled:opacity-45">
        <BaseSlider.Track className="relative h-2 w-full overflow-hidden rounded-track border border-border-subtle bg-surface-sunken">
          <BaseSlider.Indicator className="rounded-track bg-accent-primary" />
        </BaseSlider.Track>
        <BaseSlider.Thumb
          className={cn(
            "size-4.5 min-h-6 min-w-6 cursor-grab rounded-track border-2 border-accent-primary bg-surface-100 shadow-control",
            "transition-transform duration-100 ease-ui",
            "hover:scale-105 active:cursor-grabbing",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border-focus",
          )}
        />
      </BaseSlider.Control>
    </BaseSlider.Root>
  );
}
