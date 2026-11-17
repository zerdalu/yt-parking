import { Button as BaseButton } from "@base-ui/react/button";
import { ButtonSizes, type ButtonSize, ButtonVariants, type ButtonVariant } from "@ui/variants";
import { cn } from "cn";
import type { ComponentProps, ReactElement } from "react";

export type { ButtonSize, ButtonVariant };

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-accent-primary text-text-on-accent border-transparent shadow-control hover:bg-accent-primary-hover active:bg-accent-primary-active",
  secondary:
    "bg-surface-300 text-text-primary border-border-subtle shadow-control hover:bg-surface-hover hover:border-border-default active:bg-surface-active",
  outline:
    "bg-transparent text-text-primary border-border-default hover:bg-surface-hover hover:border-border-strong active:bg-surface-active",
  ghost:
    "bg-transparent text-text-secondary border-transparent hover:bg-surface-hover hover:text-text-primary active:bg-surface-active",
  danger:
    "bg-status-danger-bg text-status-danger-text border-status-danger-border shadow-control hover:bg-status-danger hover:text-text-on-accent hover:border-transparent active:opacity-90",
};

const sizeClasses: Record<ButtonSize, string> = {
  xs: "h-control-xs px-control-px-xs text-xs gap-1.5",
  sm: "h-control-sm px-control-px-sm text-xs gap-1.5",
  md: "h-control-md px-control-px-md text-xs gap-2",
  lg: "h-control-lg px-control-px-lg text-sm gap-2.5",
  "icon-xs": "size-control-xs p-0",
  "icon-sm": "size-control-sm p-0",
  "icon-md": "size-control-md p-0",
};

export interface ButtonProps extends ComponentProps<typeof BaseButton> {
  readonly variant?: ButtonVariant;
  readonly size?: ButtonSize;
}

export function Button({
  variant = ButtonVariants.Primary,
  size = ButtonSizes.Md,
  className,
  ...props
}: ButtonProps): ReactElement {
  return (
    <BaseButton
      className={cn(
        "inline-flex shrink-0 cursor-pointer items-center justify-center border font-mono font-ui tracking-ui whitespace-nowrap select-none",
        "min-size-6 rounded-control transition-colors duration-150 ease-ui",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border-focus",
        "disabled:pointer-events-none disabled:opacity-45 data-disabled:pointer-events-none data-disabled:opacity-45",
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    />
  );
}
