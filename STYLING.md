# Styling & Design System Architecture

Parking uses a **100% CSS-variable-driven design system** built on top of **Tailwind CSS v4** and **Base UI** (`@base-ui/react`).

When you clone Parking to start a new project, you never need to edit the component files inside `ui/components/`. Every visual dimension—colors, contrast, typography, border radii, shadows, blurs, control density, and motion curves—is controlled from `src/index.css`.

---

## 1. Architecture Overview

`src/index.css` organizes tokens into two complementary layers:

1. **`@theme` Tokens (Tailwind Theme Namespace)**
   Variables defined inside `@theme` are automatically exposed as `:root` CSS variables and compiled into native Tailwind utility classes (e.g., `--color-surface-100` generates `bg-surface-100`, `text-surface-100`, `border-surface-100`; `--radius-control` generates `rounded-control`).
2. **`:root` Density Tokens + `@utility` Rules**
   Component sizing and padding tokens (`--control-h-*`, `--control-px-*`, `--panel-p-*`) are defined on `:root` and mapped via explicit `@utility` directives (`h-control-md`, `px-control-px-md`, `p-panel`, etc.). Keeping them out of `@theme`'s `--spacing-*` namespace prevents collisions with Tailwind's standard spacing scale (such as `size-4.5` or `size-6`).

---

## 2. Base Spacing

| CSS Variable | Default           | Generated Utilities                           | Purpose & Usage                                                                                                                                                             |
| :----------- | :---------------- | :-------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--spacing`  | `0.25rem` (`4px`) | `p-*`, `m-*`, `gap-*`, `size-*`, `w-*`, `h-*` | Multiplier for all standard Tailwind spacing and sizing utilities (`size-4.5` = `18px`, `min-size-6` = `24px`). Scaling this value scales the entire layout proportionally. |

---

## 3. Typography Tokens

### Font Families

| CSS Variable     | Default             | Tailwind Utility | Purpose & Usage                                                                                                                                                                                                                |
| :--------------- | :------------------ | :--------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--font-sans`    | `"Inter", ...`      | `font-sans`      | General UI labels (`FieldLabel`), descriptions (`FieldDescription`, `CardDescription`), form inputs (`Input`, `Select`), and menu items.                                                                                       |
| `--font-mono`    | `"Geist Mono", ...` | `font-mono`      | Interactive buttons (`Button`), tab triggers (`TabsTrigger`), badges (`Badge`), numeric readouts (`Slider`, `Progress`), tooltips (`TooltipContent`), and group headers. Always paired with `tabular-nums` on numbers/metrics. |
| `--font-display` | `"Inter", ...`      | `font-display`   | Structural titles (`CardTitle`, `DialogTitle`, `PopoverTitle`). Swap this variable in a new project to give headings a distinct display or serif typeface.                                                                     |

### Font Weights & Letter Spacing

| CSS Variable            | Default    | Tailwind Utility   | Purpose & Usage                                                                                                 |
| :---------------------- | :--------- | :----------------- | :-------------------------------------------------------------------------------------------------------------- |
| `--font-weight-ui`      | `500`      | `font-ui`          | Medium weight applied to interactive controls (`Button`, `Badge`, `FieldLabel`, `TabsTrigger`, selected items). |
| `--font-weight-heading` | `600`      | `font-heading`     | Semibold weight applied to titles (`CardTitle`, `DialogTitle`, `PopoverTitle`).                                 |
| `--tracking-ui`         | `-0.01em`  | `tracking-ui`      | Tight, legible letter-spacing for buttons, labels, and tabs.                                                    |
| `--tracking-mono`       | `0.015em`  | `tracking-mono`    | Slightly open letter-spacing for monospace badges, section headers, and numeric values.                         |
| `--tracking-heading`    | `-0.025em` | `tracking-heading` | Crisp letter-spacing for card, popover, and dialog headings.                                                    |

---

## 4. Surface Hierarchy (`--color-surface-*`)

Surfaces establish depth across the viewport, from the lowest recessed input well to the highest floating popup.

| CSS Variable               | Dark Default                   | Light Default                 | Tailwind Utility (`bg-*`) | Purpose & Usage                                                                                                                              |
| :------------------------- | :----------------------------- | :---------------------------- | :------------------------ | :------------------------------------------------------------------------------------------------------------------------------------------- |
| `--color-surface-canvas`   | `oklch(0.13 0.008 265)`        | `oklch(0.975 0.004 265)`      | `bg-surface-canvas`       | Root page background (`<body>` and `<main>`).                                                                                                |
| `--color-surface-sunken`   | `oklch(0.105 0.007 265)`       | `oklch(0.92 0.008 265)`       | `bg-surface-sunken`       | Recessed wells: `Input`, `SelectTrigger`, unchecked `Checkbox` and `Switch`, `TabsList`, `Slider` track, `Progress` track, and `CardFooter`. |
| `--color-surface-100`      | `oklch(0.17 0.01 265)`         | `oklch(1 0 0)`                | `bg-surface-100`          | Primary container surface: `Card`, `DialogContent`, and `Slider` thumb.                                                                      |
| `--color-surface-200`      | `oklch(0.21 0.012 265)`        | `oklch(0.99 0.003 265)`       | `bg-surface-200`          | Elevated floating overlays: `SelectContent`, `MenuContent`, `PopoverContent`, `TooltipContent`, `Toast`, and active `Tabs.Indicator`.        |
| `--color-surface-300`      | `oklch(0.25 0.014 265)`        | `oklch(0.945 0.006 265)`      | `bg-surface-300`          | Resting interactive surface: `Button` (`secondary` variant) and `Badge` (`default` variant).                                                 |
| `--color-surface-hover`    | `oklch(0.27 0.015 265)`        | `oklch(0.91 0.009 265)`       | `bg-surface-hover`        | Hover and keyboard-highlighted states on `Button` (`secondary`, `outline`, `ghost`), `SelectItem`, `MenuItem`, and close buttons.            |
| `--color-surface-active`   | `oklch(0.31 0.018 265)`        | `oklch(0.88 0.012 265)`       | `bg-surface-active`       | Pressed (`active:`) state on `Button` (`secondary`, `outline`, `ghost`).                                                                     |
| `--color-surface-backdrop` | `oklch(0.08 0.005 265 / 0.72)` | `oklch(0.15 0.01 265 / 0.45)` | `bg-surface-backdrop`     | Modal dimming backdrop behind `DialogContent`.                                                                                               |

---

## 5. Text Hierarchy (`--color-text-*`)

All text colors are calibrated for strict WCAG AA contrast compliance against both dark and light surfaces.

| CSS Variable             | Dark Default            | Light Default            | Tailwind Utility (`text-*`) | Purpose & Usage                                                                                                                                 |
| :----------------------- | :---------------------- | :----------------------- | :-------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------- |
| `--color-text-primary`   | `oklch(0.96 0.005 265)` | `oklch(0.16 0.01 265)`   | `text-text-primary`         | Primary body copy, input values, headings, active tabs, and highlighted menu/select items.                                                      |
| `--color-text-secondary` | `oklch(0.8 0.012 265)`  | `oklch(0.34 0.014 265)`  | `text-text-secondary`       | Field labels (`FieldLabel`), card/dialog/popover descriptions, resting menu/select items, and `ghost` buttons.                                  |
| `--color-text-muted`     | `oklch(0.68 0.014 265)` | `oklch(0.46 0.014 265)`  | `text-text-muted`           | Input placeholders, unselected `TabsTrigger`, `FieldDescription`, group labels, and auxiliary icons.                                            |
| `--color-text-disabled`  | `oklch(0.52 0.01 265)`  | `oklch(0.62 0.01 265)`   | `text-text-disabled`        | Explicitly disabled text elements when not using opacity dimming.                                                                               |
| `--color-text-on-accent` | `oklch(0.13 0.01 265)`  | `oklch(0.99 0.003 265)`  | `text-text-on-accent`       | High-contrast foreground text/icons rendered on top of `--color-accent-primary` (`Button` primary, checked `Checkbox`, checked `Switch` thumb). |
| `--color-text-inverse`   | `oklch(0.13 0.008 265)` | `oklch(0.975 0.004 265)` | `text-text-inverse`         | Text rendered on inverted surfaces.                                                                                                             |

---

## 6. Borders & Focus Rings (`--color-border-*`)

| CSS Variable             | Dark Default            | Light Default           | Tailwind Utility                              | Purpose & Usage                                                                                                                                                                                                  |
| :----------------------- | :---------------------- | :---------------------- | :-------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--color-border-subtle`  | `oklch(0.25 0.012 265)` | `oklch(0.9 0.008 265)`  | `border-border-subtle`, `bg-border-subtle`    | Low-emphasis structural borders: `Card`, `CardHeader`, `CardFooter`, `Separator`, `MenuSeparator`, `SelectSeparator`, `TabsList`, and `Slider`/`Progress` tracks.                                                |
| `--color-border-default` | `oklch(0.32 0.015 265)` | `oklch(0.83 0.012 265)` | `border-border-default`                       | Standard interactive control and overlay borders: `Input`, `SelectTrigger`, `Checkbox`, `Switch`, `Button` (`outline`), `DialogContent`, `PopoverContent`, `MenuContent`, `SelectContent`, and scrollbar thumbs. |
| `--color-border-strong`  | `oklch(0.45 0.02 265)`  | `oklch(0.7 0.016 265)`  | `border-border-strong`                        | Hover state border on `Input`, `SelectTrigger`, `Checkbox`, `Switch`, `Button` (`outline`), and hovered scrollbar thumbs.                                                                                        |
| `--color-border-focus`   | `oklch(0.76 0.15 195)`  | `oklch(0.5 0.16 205)`   | `outline-border-focus`, `border-border-focus` | Keyboard `:focus-visible` ring and focused input border across all interactive primitives.                                                                                                                       |

---

## 7. Brand & Accent Tokens (`--color-accent-*`)

| CSS Variable                    | Dark Default                  | Light Default                | Tailwind Utility                                                    | Purpose & Usage                                                                                                                                                       |
| :------------------------------ | :---------------------------- | :--------------------------- | :------------------------------------------------------------------ | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--color-accent-primary`        | `oklch(0.76 0.15 195)`        | `oklch(0.5 0.16 205)`        | `bg-accent-primary`, `text-accent-primary`, `border-accent-primary` | Primary brand color: `Button` (`primary`), checked `Checkbox`, checked `Switch`, `Slider` indicator & thumb border, `Progress` (`default`), and selection checkmarks. |
| `--color-accent-primary-hover`  | `oklch(0.81 0.15 195)`        | `oklch(0.45 0.16 205)`       | `hover:bg-accent-primary-hover`                                     | Hovered state for primary buttons and checked checkboxes.                                                                                                             |
| `--color-accent-primary-active` | `oklch(0.71 0.15 195)`        | `oklch(0.4 0.16 205)`        | `active:bg-accent-primary-active`                                   | Active/pressed state for primary buttons.                                                                                                                             |
| `--color-accent-subtle`         | `oklch(0.76 0.15 195 / 0.14)` | `oklch(0.5 0.16 205 / 0.12)` | `bg-accent-subtle`                                                  | Translucent accent fill used in `Badge` (`accent` variant) and highlighted callouts.                                                                                  |
| `--color-accent-border`         | `oklch(0.76 0.15 195 / 0.42)` | `oklch(0.5 0.16 205 / 0.38)` | `border-accent-border`                                              | Tinted border used in `Badge` (`accent` variant).                                                                                                                     |
| `--color-accent-secondary`      | `oklch(0.72 0.14 280)`        | `oklch(0.52 0.17 280)`       | `bg-accent-secondary`, `text-accent-secondary`                      | Secondary accent for charts, secondary highlights, or multi-series data.                                                                                              |

---

## 8. Semantic Status Tokens (`--color-status-*`)

Each semantic state (`success`, `warning`, `danger`, `info`) provides four coordinated tokens: solid indicator, translucent background, tinted border, and accessible foreground text.

| Status Group | CSS Variables                                                                                                               | Where Used                                                                                                                                                                                                                  |
| :----------- | :-------------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Success**  | `--color-status-success`<br>`--color-status-success-bg`<br>`--color-status-success-border`<br>`--color-status-success-text` | `Badge` (`variant="success"`), `Progress` (`variant="success"`), and `Toast` (`type="success"`).                                                                                                                            |
| **Warning**  | `--color-status-warning`<br>`--color-status-warning-bg`<br>`--color-status-warning-border`<br>`--color-status-warning-text` | `Badge` (`variant="warning"`), `Progress` (`variant="warning"`), and `Toast` (`type="warning"`).                                                                                                                            |
| **Danger**   | `--color-status-danger`<br>`--color-status-danger-bg`<br>`--color-status-danger-border`<br>`--color-status-danger-text`     | `Button` (`variant="danger"`), `Badge` (`variant="danger"`), `FieldError`, invalid `Input` (`data-invalid`), destructive `MenuItem` (`danger`), `Progress` (`variant="danger"`), and `Toast` (`type="danger"` / `"error"`). |
| **Info**     | `--color-status-info`<br>`--color-status-info-bg`<br>`--color-status-info-border`<br>`--color-status-info-text`             | `Badge` (`variant="info"`), `Progress` (`variant="info"`), and `Toast` (`type="info"`).                                                                                                                                     |

---

## 9. Architectural Geometry (`--radius-*`)

Changing these five variables transforms the entire silhouette of the UI—from sharp `0px` terminal aesthetics to soft rounded or pill-shaped interfaces.

| CSS Variable       | Default             | Tailwind Utility  | Components Controlled                                                                                                                                                                             |
| :----------------- | :------------------ | :---------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `--radius-control` | `0.375rem` (`6px`)  | `rounded-control` | `Button`, `Input`, `SelectTrigger`, `SelectItem`, `MenuItem`, `MenuCheckboxItem`, `MenuRadioItem`, `TabsList`, `TabsTrigger`, `Tabs.Indicator`, `TooltipContent`, and dialog/toast close buttons. |
| `--radius-panel`   | `0.625rem` (`10px`) | `rounded-panel`   | `Card`, `DialogContent`, `PopoverContent`, `SelectContent`, `MenuContent`, and `Toast`.                                                                                                           |
| `--radius-badge`   | `0.25rem` (`4px`)   | `rounded-badge`   | `Badge`.                                                                                                                                                                                          |
| `--radius-toggle`  | `0.25rem` (`4px`)   | `rounded-toggle`  | `Checkbox`.                                                                                                                                                                                       |
| `--radius-track`   | `9999px` (pill)     | `rounded-track`   | `Switch` track & thumb, `Slider` track, indicator & thumb, `Progress` track & indicator, and status indicator dots in `Toast`.                                                                    |

---

## 10. Elevation, Shadows & Blur

| CSS Variable        | Default (Dark)                    | Tailwind Utility         | Components Controlled                                                                                  |
| :------------------ | :-------------------------------- | :----------------------- | :----------------------------------------------------------------------------------------------------- |
| `--shadow-control`  | `0 1px 2px 0 oklch(0 0 0 / 0.24)` | `shadow-control`         | `Button`, `Input`, `SelectTrigger`, `Checkbox`, `Switch`, `Slider` thumb, and active `Tabs.Indicator`. |
| `--shadow-panel`    | `0 4px 12px -2px ...`             | `shadow-panel`           | `Card`.                                                                                                |
| `--shadow-floating` | `0 12px 28px -4px ...`            | `shadow-floating`        | Floating overlays: `SelectContent`, `MenuContent`, `PopoverContent`, `TooltipContent`, and `Toast`.    |
| `--shadow-modal`    | `0 24px 48px -12px ...`           | `shadow-modal`           | `DialogContent`.                                                                                       |
| `--blur-overlay`    | `6px`                             | `backdrop-blur-overlay`  | `Dialog.Backdrop`.                                                                                     |
| `--blur-floating`   | `12px`                            | `backdrop-blur-floating` | `SelectContent`, `MenuContent`, `PopoverContent`, `TooltipContent`, and `Toast`.                       |

---

## 11. Motion Curves (`--ease-*`)

| CSS Variable    | Default                             | Tailwind Utility | Purpose & Usage                                                                                       |
| :-------------- | :---------------------------------- | :--------------- | :---------------------------------------------------------------------------------------------------- |
| `--ease-ui`     | `cubic-bezier(0.16, 1, 0.3, 1)`     | `ease-ui`        | Snappy exponential-out curve used on all color, border, opacity, and popup entry/exit transitions.    |
| `--ease-spring` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | `ease-spring`    | Subtle overshoot spring curve used on physical toggle motions such as the `Switch` thumb translation. |

---

## 12. Control Density & Panel Spacing (`:root` + `@utility`)

Defined in `:root` and exposed through `@utility` directives in `src/index.css`, these variables control the vertical height and horizontal padding of interactive controls and containers.

### Control Heights & Square Icon Targets

| CSS Variable     | Default             | Custom Utilities                                      | Components Controlled                                                                                                                                      |
| :--------------- | :------------------ | :---------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--control-h-xs` | `1.5rem` (`24px`)   | `h-control-xs`, `size-control-xs`                     | `Button` (`size="xs"`, `size="icon-xs"`), `Input` (`size="xs"`), and close buttons in `Dialog` and `Toast`. Meets the 24px × 24px minimum hit-target rule. |
| `--control-h-sm` | `1.875rem` (`30px`) | `h-control-sm`, `min-h-control-sm`, `size-control-sm` | `Button` (`size="sm"`, `size="icon-sm"`), `Input` (`size="sm"`), `TabsTrigger`, `SelectItem`, and `MenuItem`.                                              |
| `--control-h-md` | `2.25rem` (`36px`)  | `h-control-md`, `size-control-md`                     | Default size for `Button` (`size="md"`, `size="icon-md"`), `Input` (`size="md"`), and `SelectTrigger`.                                                     |
| `--control-h-lg` | `2.625rem` (`42px`) | `h-control-lg`                                        | `Button` (`size="lg"`) and `Input` (`size="lg"`).                                                                                                          |

### Control Horizontal Padding

| CSS Variable      | Default             | Custom Utility     | Components Controlled                                                                                        |
| :---------------- | :------------------ | :----------------- | :----------------------------------------------------------------------------------------------------------- |
| `--control-px-xs` | `0.5rem` (`8px`)    | `px-control-px-xs` | `Button` (`size="xs"`) and `Input` (`size="xs"`).                                                            |
| `--control-px-sm` | `0.625rem` (`10px`) | `px-control-px-sm` | `Button` (`size="sm"`), `Input` (`size="sm"`), `SelectItem`, `MenuItem`, `TooltipContent`, and group labels. |
| `--control-px-md` | `0.875rem` (`14px`) | `px-control-px-md` | `Button` (`size="md"`), `Input` (`size="md"`), `SelectTrigger`, and `TabsTrigger`.                           |
| `--control-px-lg` | `1.125rem` (`18px`) | `px-control-px-lg` | `Button` (`size="lg"`) and `Input` (`size="lg"`).                                                            |

### Panel Padding

| CSS Variable   | Default             | Custom Utilities            | Components Controlled                                                                                             |
| :------------- | :------------------ | :-------------------------- | :---------------------------------------------------------------------------------------------------------------- |
| `--panel-p-sm` | `0.875rem` (`14px`) | `p-panel-sm`, `py-panel-sm` | Compact floating containers: `PopoverContent`, `Toast`, and vertical padding in `CardFooter`.                     |
| `--panel-p`    | `1.25rem` (`20px`)  | `p-panel`, `px-panel`       | Standard container padding: `CardHeader`, `CardContent`, `DialogContent`, and horizontal padding in `CardFooter`. |
| `--panel-p-lg` | `1.5rem` (`24px`)   | `p-panel-lg`                | Spacious container padding for large modals or feature cards.                                                     |

---

## 13. Re-Skinning Checklist for New Projects

When cloning Parking for a new project, open `src/index.css` and adjust:

1. **Brand Hue**: Change the OKLCH hue angle (the third number in `oklch(L C H)`) on `--color-accent-primary*` and `--color-border-focus`, and optionally tint the neutral surface/border hue (`265` by default).
2. **Corner Silhouette**: Set `--radius-control`, `--radius-panel`, `--radius-badge`, and `--radius-toggle` (`0rem` for brutalist/terminal, `0.25rem` for dense technical tools, `0.75rem+` for consumer apps).
3. **Typography**: Replace the Google Fonts link in `index.html` and update `--font-sans`, `--font-mono`, and `--font-display`.
4. **Density**: Tighten or relax `--control-h-*`, `--control-px-*`, and `--panel-p*` in `:root` for compact pro-tools vs. spacious layouts.
5. **Theme Mode**: Toggle `data-theme="light"` on `<html>` (`document.documentElement`) to switch between the dark default and the light palette defined under `:root[data-theme="light"]`.
