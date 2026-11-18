import { Dialog as BaseDialog } from "@base-ui/react/dialog";
import { XIcon } from "@phosphor-icons/react";
import { cn } from "cn";
import type { ComponentProps, HTMLAttributes, ReactElement } from "react";

export type DialogProps = ComponentProps<typeof BaseDialog.Root>;

export function Dialog(props: DialogProps): ReactElement {
  return <BaseDialog.Root {...props} />;
}

export type DialogTriggerProps = ComponentProps<typeof BaseDialog.Trigger>;

export function DialogTrigger(props: DialogTriggerProps): ReactElement {
  return <BaseDialog.Trigger {...props} />;
}

export interface DialogContentProps extends ComponentProps<typeof BaseDialog.Popup> {
  readonly showCloseButton?: boolean;
}

export function DialogContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: DialogContentProps): ReactElement {
  return (
    <BaseDialog.Portal>
      <BaseDialog.Backdrop
        className={cn(
          "fixed inset-0 z-50 bg-surface-backdrop backdrop-blur-overlay",
          "transition-opacity duration-150 ease-ui",
          "data-ending-style:opacity-0 data-starting-style:opacity-0",
        )}
      />
      <BaseDialog.Popup
        className={cn(
          "fixed top-1/2 left-1/2 z-50 grid w-full max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 border border-border-default bg-surface-100 p-panel text-text-primary shadow-modal outline-none",
          "rounded-panel transition-all duration-150 ease-ui",
          "data-starting-style:scale-95 data-starting-style:opacity-0",
          "data-ending-style:scale-95 data-ending-style:opacity-0",
          className,
        )}
        {...props}
      >
        {children}
        {showCloseButton ? (
          <BaseDialog.Close
            aria-label="Close dialog"
            className={cn(
              "absolute top-3.5 right-3.5 inline-flex size-control-xs min-h-6 min-w-6 cursor-pointer items-center justify-center text-text-muted",
              "rounded-control transition-colors duration-150 ease-ui",
              "hover:bg-surface-hover hover:text-text-primary",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border-focus",
            )}
          >
            <XIcon className="size-4.5" />
          </BaseDialog.Close>
        ) : null}
      </BaseDialog.Popup>
    </BaseDialog.Portal>
  );
}

export type DialogHeaderProps = HTMLAttributes<HTMLDivElement>;

export function DialogHeader({ className, ...props }: DialogHeaderProps): ReactElement {
  return <div className={cn("flex flex-col gap-1.5 pr-6", className)} {...props} />;
}

export type DialogFooterProps = HTMLAttributes<HTMLDivElement>;

export function DialogFooter({ className, ...props }: DialogFooterProps): ReactElement {
  return <div className={cn("flex flex-wrap items-center justify-end gap-2 pt-2", className)} {...props} />;
}

export type DialogTitleProps = ComponentProps<typeof BaseDialog.Title>;

export function DialogTitle({ className, ...props }: DialogTitleProps): ReactElement {
  return (
    <BaseDialog.Title
      className={cn("font-display text-base font-heading tracking-heading text-text-primary", className)}
      {...props}
    />
  );
}

export type DialogDescriptionProps = ComponentProps<typeof BaseDialog.Description>;

export function DialogDescription({ className, ...props }: DialogDescriptionProps): ReactElement {
  return <BaseDialog.Description className={cn("font-sans text-xs text-text-secondary", className)} {...props} />;
}

export type DialogCloseProps = ComponentProps<typeof BaseDialog.Close>;

export function DialogClose(props: DialogCloseProps): ReactElement {
  return <BaseDialog.Close {...props} />;
}
