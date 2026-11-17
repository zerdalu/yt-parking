import { Tooltip as BaseTooltip } from "@base-ui/react/tooltip";
import { cn } from "cn";
import type { ComponentProps, ReactElement } from "react";

export type TooltipProviderProps = ComponentProps<typeof BaseTooltip.Provider>;

export function TooltipProvider(props: TooltipProviderProps): ReactElement {
  return <BaseTooltip.Provider {...props} />;
}

export type TooltipProps = ComponentProps<typeof BaseTooltip.Root>;

export function Tooltip(props: TooltipProps): ReactElement {
  return <BaseTooltip.Root {...props} />;
}

export type TooltipTriggerProps = ComponentProps<typeof BaseTooltip.Trigger>;

export function TooltipTrigger(props: TooltipTriggerProps): ReactElement {
  return <BaseTooltip.Trigger {...props} />;
}

export interface TooltipContentProps extends ComponentProps<typeof BaseTooltip.Popup> {
  readonly sideOffset?: ComponentProps<typeof BaseTooltip.Positioner>["sideOffset"];
  readonly side?: ComponentProps<typeof BaseTooltip.Positioner>["side"];
  readonly align?: ComponentProps<typeof BaseTooltip.Positioner>["align"];
}

export function TooltipContent({
  className,
  sideOffset = 6,
  side = "top",
  align = "center",
  ...props
}: TooltipContentProps): ReactElement {
  return (
    <BaseTooltip.Portal>
      <BaseTooltip.Positioner sideOffset={sideOffset} side={side} align={align} className="z-50 outline-none">
        <BaseTooltip.Popup
          className={cn(
            "border border-border-default bg-surface-200 px-control-px-sm py-1 font-mono text-xs text-text-primary shadow-floating backdrop-blur-floating select-none",
            "rounded-control transition-all duration-100 ease-ui",
            "data-starting-style:scale-95 data-starting-style:opacity-0",
            "data-ending-style:scale-95 data-ending-style:opacity-0",
            className,
          )}
          {...props}
        />
      </BaseTooltip.Positioner>
    </BaseTooltip.Portal>
  );
}
