import { Popover as BasePopover } from "@base-ui/react/popover";
import { cn } from "cn";
import type { ComponentProps, ReactElement } from "react";

export type PopoverProps = ComponentProps<typeof BasePopover.Root>;

export function Popover(props: PopoverProps): ReactElement {
  return <BasePopover.Root {...props} />;
}

export type PopoverTriggerProps = ComponentProps<typeof BasePopover.Trigger>;

export function PopoverTrigger(props: PopoverTriggerProps): ReactElement {
  return <BasePopover.Trigger {...props} />;
}

export interface PopoverContentProps extends ComponentProps<typeof BasePopover.Popup> {
  readonly sideOffset?: ComponentProps<typeof BasePopover.Positioner>["sideOffset"];
  readonly side?: ComponentProps<typeof BasePopover.Positioner>["side"];
  readonly align?: ComponentProps<typeof BasePopover.Positioner>["align"];
}

export function PopoverContent({
  className,
  sideOffset = 8,
  side = "bottom",
  align = "center",
  ...props
}: PopoverContentProps): ReactElement {
  return (
    <BasePopover.Portal>
      <BasePopover.Positioner sideOffset={sideOffset} side={side} align={align} className="z-50 outline-none">
        <BasePopover.Popup
          className={cn(
            "w-72 border border-border-default bg-surface-200 p-panel-sm text-text-primary shadow-floating backdrop-blur-floating outline-none",
            "rounded-panel transition-all duration-150 ease-ui",
            "data-starting-style:scale-95 data-starting-style:opacity-0",
            "data-ending-style:scale-95 data-ending-style:opacity-0",
            className,
          )}
          {...props}
        />
      </BasePopover.Positioner>
    </BasePopover.Portal>
  );
}

export type PopoverTitleProps = ComponentProps<typeof BasePopover.Title>;

export function PopoverTitle({ className, ...props }: PopoverTitleProps): ReactElement {
  return (
    <BasePopover.Title
      className={cn("font-display text-sm font-heading tracking-heading text-text-primary", className)}
      {...props}
    />
  );
}

export type PopoverDescriptionProps = ComponentProps<typeof BasePopover.Description>;

export function PopoverDescription({ className, ...props }: PopoverDescriptionProps): ReactElement {
  return <BasePopover.Description className={cn("mt-1 font-sans text-xs text-text-secondary", className)} {...props} />;
}

export type PopoverCloseProps = ComponentProps<typeof BasePopover.Close>;

export function PopoverClose(props: PopoverCloseProps): ReactElement {
  return <BasePopover.Close {...props} />;
}
