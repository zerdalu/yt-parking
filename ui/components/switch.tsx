import { Switch as BaseSwitch } from "@base-ui/react/switch";
import { cn } from "cn";
import type { ComponentProps, ReactElement } from "react";

export type SwitchProps = ComponentProps<typeof BaseSwitch.Root>;

export function Switch({ className, ...props }: SwitchProps): ReactElement {
  return (
    <BaseSwitch.Root
      className={cn(
        "group min-size-6 relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center border border-border-default bg-surface-sunken p-0.5 shadow-control",
        "rounded-track transition-colors duration-150 ease-ui",
        "hover:border-border-strong",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border-focus",
        "data-checked:border-accent-primary data-checked:bg-accent-primary",
        "disabled:pointer-events-none disabled:opacity-45 data-disabled:pointer-events-none data-disabled:opacity-45",
        className,
      )}
      {...props}
    >
      <BaseSwitch.Thumb
        className={cn(
          "pointer-events-none block size-4.5 rounded-track bg-text-secondary shadow-control",
          "transition-transform duration-150 ease-spring",
          "translate-x-0 data-checked:translate-x-5 data-checked:bg-text-on-accent",
        )}
      />
    </BaseSwitch.Root>
  );
}
