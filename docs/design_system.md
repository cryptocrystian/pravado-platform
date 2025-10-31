# Pravado Design System

This document outlines the standards and usage for the Pravado design system, implemented using TailwindCSS, shadcn/ui, and custom component wrappers.

---

## 🧩 Component Structure

All components live in `packages/design-system/src/components`.

- **Atomic**: `Button`, `Input`, `Badge`, `Avatar`, `Card`
- **Molecules**: `Form`, `Modal`, `Tooltip`
- **Organisms**: `LayoutShell`, `Sidebar`, `Toolbar`

---

## 🎨 Design Tokens

Defined in `tailwind.config.ts` and `tokens.ts`:

| Token          | Usage                      |
|----------------|----------------------------|
| `--color-primary` | Buttons, links             |
| `--radius-md`     | Border radius, cards       |
| `--spacing-lg`    | Padding, grid gaps         |

Supports theme switching (light/dark) via CSS variables and Tailwind.

---

## 📐 Layout & Grid

- Grid-based layout using `grid-cols`, `gap-x`, `gap-y`
- Responsive from `sm` to `2xl`
- Uses Tailwind’s `container` with max widths

---

## 🔠 Typography

- Uses `font-sans` stack by default
- Headings via `<h1>–<h4>` styled by `prose`
- Body via `text-base`, `leading-relaxed`

---

## ♿ Accessibility

- All components are WCAG AA compliant
- Focus rings, `aria-*` support, keyboard navigation

---

## 📚 Storybook

Run locally with:

```bash
cd packages/design-system
pnpm storybook
Visualizes all components in light/dark variants and mobile views.

🧩 Extension Rules
Only add components after approval

Use semantic tokens (primary-bg, danger-outline)

Keep variants minimal (no component bloat)
