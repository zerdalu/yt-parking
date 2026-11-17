import { Separator as BaseSeparator } from "@base-ui/react/separator";
import { cn } from "cn";
import type { ComponentProps, ReactElement } from "react";

export type SeparatorProps = ComponentProps<typeof BaseSeparator>;

export function Separator({ className, orientation = "horizontal", ...props }: SeparatorProps): ReactElement {
  return (
    <BaseSeparator
      orientation={orientation}
      className={cn(
        "shrink-0 bg-border-subtle",
        orientation === "horizontal" ? "h-px w-full" : "h-full w-px",
        className,
      )}
      {...props}
    />
  );
}
