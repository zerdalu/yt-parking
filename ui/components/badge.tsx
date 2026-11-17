import { BadgeVariants, type BadgeVariant } from "@ui/variants";
import { cn } from "cn";
import type { HTMLAttributes, ReactElement } from "react";

export type { BadgeVariant };

const badgeVariantClasses: Record<BadgeVariant, string> = {
  default: "border-border-default bg-surface-300 text-text-secondary",
  accent: "border-accent-border bg-accent-subtle text-accent-primary",
  success: "border-status-success-border bg-status-success-bg text-status-success-text",
  warning: "border-status-warning-border bg-status-warning-bg text-status-warning-text",
  danger: "border-status-danger-border bg-status-danger-bg text-status-danger-text",
  info: "border-status-info-border bg-status-info-bg text-status-info-text",
  outline: "border-border-default bg-transparent text-text-secondary",
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  readonly variant?: BadgeVariant;
}

export function Badge({ variant = BadgeVariants.Default, className, ...props }: BadgeProps): ReactElement {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center gap-1.5 border px-2 py-0.5 font-mono text-xs font-ui tracking-mono whitespace-nowrap tabular-nums select-none",
        "rounded-badge transition-colors duration-150 ease-ui",
        badgeVariantClasses[variant],
        className,
      )}
      {...props}
    />
  );
}
