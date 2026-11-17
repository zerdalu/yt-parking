import { Tabs as BaseTabs } from "@base-ui/react/tabs";
import { cn } from "cn";
import type { ComponentProps, ReactElement } from "react";

export type TabsProps = ComponentProps<typeof BaseTabs.Root>;

export function Tabs({ className, ...props }: TabsProps): ReactElement {
  return <BaseTabs.Root className={cn("flex flex-col gap-3", className)} {...props} />;
}

export type TabsListProps = ComponentProps<typeof BaseTabs.List>;

export function TabsList({ className, children, ...props }: TabsListProps): ReactElement {
  return (
    <BaseTabs.List
      className={cn(
        "relative inline-flex w-fit items-center gap-1 border border-border-subtle bg-surface-sunken p-1",
        "rounded-control",
        className,
      )}
      {...props}
    >
      {children}
      <BaseTabs.Indicator
        className={cn(
          "absolute top-(--active-tab-top) left-(--active-tab-left) z-0 h-(--active-tab-height) w-(--active-tab-width)",
          "rounded-control border border-border-default bg-surface-200 shadow-control",
          "transition-all duration-150 ease-ui",
        )}
      />
    </BaseTabs.List>
  );
}

export type TabsTriggerProps = ComponentProps<typeof BaseTabs.Tab>;

export function TabsTrigger({ className, ...props }: TabsTriggerProps): ReactElement {
  return (
    <BaseTabs.Tab
      className={cn(
        "min-size-6 relative z-10 inline-flex h-control-sm cursor-pointer items-center justify-center gap-1.5 px-control-px-md font-mono text-xs font-ui tracking-ui text-text-muted select-none",
        "rounded-control transition-colors duration-150 ease-ui",
        "hover:text-text-secondary",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border-focus",
        "data-active:text-text-primary",
        "data-disabled:pointer-events-none data-disabled:opacity-45",
        className,
      )}
      {...props}
    />
  );
}

export type TabsContentProps = ComponentProps<typeof BaseTabs.Panel>;

export function TabsContent({ className, ...props }: TabsContentProps): ReactElement {
  return (
    <BaseTabs.Panel
      className={cn(
        "outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border-focus",
        className,
      )}
      {...props}
    />
  );
}
