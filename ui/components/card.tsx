import { cn } from "cn";
import type { HTMLAttributes, ReactElement } from "react";

export type CardProps = HTMLAttributes<HTMLDivElement>;

export function Card({ className, ...props }: CardProps): ReactElement {
  return (
    <div
      className={cn(
        "flex flex-col border border-border-subtle bg-surface-100 text-text-primary shadow-panel",
        "rounded-panel",
        className,
      )}
      {...props}
    />
  );
}

export type CardHeaderProps = HTMLAttributes<HTMLDivElement>;

export function CardHeader({ className, ...props }: CardHeaderProps): ReactElement {
  return <div className={cn("flex flex-col gap-1 border-b border-border-subtle p-panel", className)} {...props} />;
}

export type CardTitleProps = HTMLAttributes<HTMLHeadingElement>;

export function CardTitle({ className, children, ...props }: CardTitleProps): ReactElement {
  return (
    <h3 className={cn("font-display text-sm font-heading tracking-heading text-text-primary", className)} {...props}>
      {children}
    </h3>
  );
}

export type CardDescriptionProps = HTMLAttributes<HTMLParagraphElement>;

export function CardDescription({ className, ...props }: CardDescriptionProps): ReactElement {
  return <p className={cn("font-sans text-xs text-text-secondary", className)} {...props} />;
}

export type CardContentProps = HTMLAttributes<HTMLDivElement>;

export function CardContent({ className, ...props }: CardContentProps): ReactElement {
  return <div className={cn("flex flex-col gap-4 p-panel", className)} {...props} />;
}

export type CardFooterProps = HTMLAttributes<HTMLDivElement>;

export function CardFooter({ className, ...props }: CardFooterProps): ReactElement {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-2 border-t border-border-subtle bg-surface-sunken/50 px-panel py-panel-sm",
        "rounded-b-panel",
        className,
      )}
      {...props}
    />
  );
}
