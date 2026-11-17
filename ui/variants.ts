export const ButtonVariants = {
  Primary: "primary",
  Secondary: "secondary",
  Outline: "outline",
  Ghost: "ghost",
  Danger: "danger",
} as const;

export type ButtonVariant = (typeof ButtonVariants)[keyof typeof ButtonVariants];

export const ButtonSizes = {
  Xs: "xs",
  Sm: "sm",
  Md: "md",
  Lg: "lg",
  IconXs: "icon-xs",
  IconSm: "icon-sm",
  IconMd: "icon-md",
} as const;

export type ButtonSize = (typeof ButtonSizes)[keyof typeof ButtonSizes];

export const InputSizes = {
  Xs: "xs",
  Sm: "sm",
  Md: "md",
  Lg: "lg",
} as const;

export type InputSize = (typeof InputSizes)[keyof typeof InputSizes];

export const BadgeVariants = {
  Default: "default",
  Accent: "accent",
  Success: "success",
  Warning: "warning",
  Danger: "danger",
  Info: "info",
  Outline: "outline",
} as const;

export type BadgeVariant = (typeof BadgeVariants)[keyof typeof BadgeVariants];

export const StatusVariants = {
  Default: "default",
  Success: "success",
  Warning: "warning",
  Danger: "danger",
  Info: "info",
} as const;

export type StatusVariant = (typeof StatusVariants)[keyof typeof StatusVariants];
