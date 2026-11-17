import { Checkbox as BaseCheckbox } from "@base-ui/react/checkbox";
import { CheckIcon, MinusIcon } from "@phosphor-icons/react";
import { cn } from "cn";
import type { ComponentProps, ReactElement } from "react";

export type CheckboxProps = ComponentProps<typeof BaseCheckbox.Root>;

export function Checkbox({ className, indeterminate, ...props }: CheckboxProps): ReactElement {
  return (
    <BaseCheckbox.Root
      indeterminate={indeterminate}
      className={cn(
        "min-size-6 inline-flex size-6 shrink-0 cursor-pointer items-center justify-center border border-border-default bg-surface-sunken text-text-on-accent shadow-control",
        "rounded-toggle transition-colors duration-150 ease-ui",
        "hover:border-border-strong",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border-focus",
        "data-checked:border-accent-primary data-checked:bg-accent-primary data-checked:hover:bg-accent-primary-hover",
        "data-indeterminate:border-accent-primary data-indeterminate:bg-accent-primary",
        "disabled:pointer-events-none disabled:opacity-45 data-disabled:pointer-events-none data-disabled:opacity-45",
        className,
      )}
      {...props}
    >
      <BaseCheckbox.Indicator className="flex items-center justify-center text-current data-unchecked:hidden">
        {indeterminate ? (
          <MinusIcon weight="bold" className="size-3.5" />
        ) : (
          <CheckIcon weight="bold" className="size-3.5" />
        )}
      </BaseCheckbox.Indicator>
    </BaseCheckbox.Root>
  );
}
