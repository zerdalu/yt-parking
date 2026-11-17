import { Field as BaseField } from "@base-ui/react/field";
import { cn } from "cn";
import type { ComponentProps, ReactElement } from "react";

export type FieldProps = ComponentProps<typeof BaseField.Root>;

export function Field({ className, ...props }: FieldProps): ReactElement {
  return <BaseField.Root className={cn("flex w-full flex-col gap-1.5", className)} {...props} />;
}

export type FieldLabelProps = ComponentProps<typeof BaseField.Label>;

export function FieldLabel({ className, ...props }: FieldLabelProps): ReactElement {
  return (
    <BaseField.Label
      className={cn(
        "font-sans text-xs font-ui tracking-ui text-text-secondary select-none",
        "data-disabled:opacity-45",
        className,
      )}
      {...props}
    />
  );
}

export type FieldDescriptionProps = ComponentProps<typeof BaseField.Description>;

export function FieldDescription({ className, ...props }: FieldDescriptionProps): ReactElement {
  return <BaseField.Description className={cn("font-sans text-xs text-text-muted", className)} {...props} />;
}

export type FieldErrorProps = ComponentProps<typeof BaseField.Error>;

export function FieldError({ className, ...props }: FieldErrorProps): ReactElement {
  return <BaseField.Error className={cn("font-sans text-xs font-ui text-status-danger-text", className)} {...props} />;
}

export type FieldControlProps = ComponentProps<typeof BaseField.Control>;

export function FieldControl(props: FieldControlProps): ReactElement {
  return <BaseField.Control {...props} />;
}
