import { Toast as BaseToast } from "@base-ui/react/toast";
import { XIcon } from "@phosphor-icons/react";
import { toastManager, useToastManager } from "@ui/toast-manager";
import type { StatusVariant } from "@ui/variants";
import { cn } from "cn";
import type { ComponentProps, ReactElement, ReactNode } from "react";

const statusClasses: Record<StatusVariant, string> = {
  default: "border-border-default bg-surface-200 text-text-primary",
  success: "border-status-success-border bg-surface-200 text-text-primary",
  warning: "border-status-warning-border bg-surface-200 text-text-primary",
  danger: "border-status-danger-border bg-surface-200 text-text-primary",
  info: "border-status-info-border bg-surface-200 text-text-primary",
};

const indicatorDotClasses: Record<StatusVariant, string> = {
  default: "bg-accent-primary",
  success: "bg-status-success",
  warning: "bg-status-warning",
  danger: "bg-status-danger",
  info: "bg-status-info",
};

function resolveStatusVariant(type: string | undefined): StatusVariant {
  switch (type) {
    case "success":
      return "success";
    case "warning":
      return "warning";
    case "danger":
    case "error":
      return "danger";
    case "info":
      return "info";
    default:
      return "default";
  }
}

export interface ToastProviderProps extends Omit<ComponentProps<typeof BaseToast.Provider>, "toastManager"> {
  readonly children?: ReactNode;
}

export function ToastProvider({ children, timeout = 4000, limit = 4, ...props }: ToastProviderProps): ReactElement {
  return (
    <BaseToast.Provider toastManager={toastManager} timeout={timeout} limit={limit} {...props}>
      {children}
      <BaseToast.Portal>
        <BaseToast.Viewport className="fixed right-4 bottom-4 z-50 flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2 outline-none">
          <ToastList />
        </BaseToast.Viewport>
      </BaseToast.Portal>
    </BaseToast.Provider>
  );
}

function ToastList(): ReactElement {
  const { toasts } = useToastManager();

  return (
    <>
      {toasts.map((toast) => {
        const variant = resolveStatusVariant(toast.type);
        return (
          <BaseToast.Root
            key={toast.id}
            toast={toast}
            className={cn(
              "group relative flex w-full items-start justify-between gap-3 border p-panel-sm shadow-floating backdrop-blur-floating",
              "rounded-panel transition-all duration-150 ease-ui",
              "data-starting-style:translate-y-2 data-starting-style:opacity-0",
              "data-ending-style:translate-y-2 data-ending-style:opacity-0",
              statusClasses[variant],
            )}
          >
            <div className="flex min-w-0 flex-1 items-start gap-2.5">
              <span className={cn("mt-1.5 size-2 shrink-0 rounded-track", indicatorDotClasses[variant])} />
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <BaseToast.Title className="font-mono text-xs font-ui tracking-ui text-text-primary" />
                <BaseToast.Description className="font-sans text-xs text-text-secondary" />
              </div>
            </div>
            <BaseToast.Close
              aria-label="Dismiss notification"
              className={cn(
                "inline-flex size-control-xs min-h-6 min-w-6 shrink-0 cursor-pointer items-center justify-center text-text-muted",
                "rounded-control transition-colors duration-150 ease-ui",
                "hover:bg-surface-hover hover:text-text-primary",
                "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-border-focus",
              )}
            >
              <XIcon className="size-4" />
            </BaseToast.Close>
          </BaseToast.Root>
        );
      })}
    </>
  );
}
