# Pravado Design System

This document outlines the standards and usage for the Pravado design system, implemented using TailwindCSS and custom React components with class-variance-authority (CVA).

---

## Overview

The Pravado design system is a shared UI library (`packages/design-system`) that provides:
- Reusable, accessible React components
- Consistent design tokens and theming
- Dark mode support
- Responsive design utilities
- Storybook documentation

---

## Component Structure

All components live in `packages/design-system/src/components` and follow atomic design principles:

### Atoms
- **Button**: Primary interaction element with multiple variants
- **Input**: Text input fields with validation states
- **Badge**: Status indicators and labels
- **Avatar**: User profile images (future)
- **Icon**: SVG icon components (future)

### Molecules (Future)
- **Form Field**: Input + Label + Error message
- **Modal**: Dialog overlays
- **Tooltip**: Contextual help
- **Dropdown**: Selection menus

### Organisms (Future)
- **Navigation**: App header and sidebar
- **Data Table**: Sortable, filterable tables
- **Card Grid**: Content layout grids

---

## Installation & Usage

### In Dashboard App

```typescript
import { Button, Input, Card } from '@pravado/design-system';

export function MyComponent() {
  return (
    <Card>
      <Input placeholder="Enter your name" />
      <Button variant="default">Submit</Button>
    </Card>
  );
}
```

### Component Import Path
Components are exported from the package root:
```typescript
import { Button } from '@pravado/design-system';
// NOT: import Button from '@pravado/design-system/components/button';
```

---

## Design Tokens

Design tokens are defined via CSS custom properties in `apps/dashboard/src/app/globals.css` and configured in Tailwind:

### Colors

#### Light Mode
```css
--background: 0 0% 100%;
--foreground: 222.2 84% 4.9%;
--primary: 221.2 83.2% 53.3%;
--secondary: 210 40% 96.1%;
--destructive: 0 84.2% 60.2%;
--muted: 210 40% 96.1%;
--accent: 210 40% 96.1%;
```

#### Dark Mode
```css
--background: 222.2 84% 4.9%;
--foreground: 210 40% 98%;
--primary: 217.2 91.2% 59.8%;
--secondary: 217.2 32.6% 17.5%;
--destructive: 0 62.8% 30.6%;
--muted: 217.2 32.6% 17.5%;
--accent: 217.2 32.6% 17.5%;
```

### Usage in Tailwind
```tsx
<div className="bg-background text-foreground">
  <Button className="bg-primary text-primary-foreground">
    Click me
  </Button>
</div>
```

### Border Radius
```css
--radius: 0.5rem; /* 8px */
```

Utility classes:
- `rounded-lg`: `var(--radius)`
- `rounded-md`: `calc(var(--radius) - 2px)`
- `rounded-sm`: `calc(var(--radius) - 4px)`

### Spacing
Uses Tailwind's default spacing scale (0, 1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24, etc.)

---

## Typography

### Font Stack
```css
font-family: Inter, system-ui, sans-serif;
```

### Scale
- `text-xs`: 0.75rem (12px)
- `text-sm`: 0.875rem (14px)
- `text-base`: 1rem (16px)
- `text-lg`: 1.125rem (18px)
- `text-xl`: 1.25rem (20px)
- `text-2xl`: 1.5rem (24px)
- `text-3xl`: 1.875rem (30px)
- `text-4xl`: 2.25rem (36px)

### Headings
```tsx
<h1 className="text-4xl font-bold">Page Title</h1>
<h2 className="text-3xl font-semibold">Section</h2>
<h3 className="text-2xl font-semibold">Subsection</h3>
<h4 className="text-xl font-medium">Component Title</h4>
```

### Body Text
```tsx
<p className="text-base leading-relaxed">
  Regular paragraph text
</p>
<p className="text-sm text-muted-foreground">
  Secondary or helper text
</p>
```

---

## Component API

### Button

```tsx
<Button variant="default" size="default">
  Click me
</Button>
```

**Variants**:
- `default`: Primary blue button
- `destructive`: Red danger button
- `outline`: Border with transparent background
- `secondary`: Light gray background
- `ghost`: Transparent with hover state
- `link`: Styled as underlined link

**Sizes**:
- `default`: h-10, standard padding
- `sm`: h-9, compact padding
- `lg`: h-11, larger padding
- `icon`: h-10 w-10, square for icons

---

### Input

```tsx
<Input
  type="email"
  placeholder="Enter your email"
  className="max-w-sm"
/>
```

**Props**:
- Standard HTML input props (`type`, `placeholder`, `value`, `onChange`, etc.)
- `className`: Additional Tailwind classes
- Automatically styled with focus rings and validation states

---

### Card

```tsx
<Card>
  <CardHeader>
    <CardTitle>Campaign Analytics</CardTitle>
    <CardDescription>Performance over last 30 days</CardDescription>
  </CardHeader>
  <CardContent>
    {/* Main content */}
  </CardContent>
  <CardFooter>
    {/* Actions */}
  </CardFooter>
</Card>
```

**Components**:
- `Card`: Container with border and shadow
- `CardHeader`: Top section with padding
- `CardTitle`: Heading (h3 by default)
- `CardDescription`: Subtitle text
- `CardContent`: Main content area
- `CardFooter`: Bottom actions area

---

### Badge

```tsx
<Badge variant="default">Active</Badge>
<Badge variant="secondary">Pending</Badge>
<Badge variant="destructive">Failed</Badge>
<Badge variant="outline">Draft</Badge>
```

**Variants**:
- `default`: Primary colored badge
- `secondary`: Muted background
- `destructive`: Red error/warning
- `outline`: Border only

---

## Layout & Grid

### Container
```tsx
<div className="container mx-auto px-4">
  {/* Content */}
</div>
```

### Grid Layout
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  <Card>Column 1</Card>
  <Card>Column 2</Card>
  <Card>Column 3</Card>
</div>
```

### Flexbox
```tsx
<div className="flex items-center justify-between gap-4">
  <div>Left</div>
  <div>Right</div>
</div>
```

---

## Responsive Design

### Breakpoints
- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px
- `2xl`: 1536px

### Usage
```tsx
<div className="text-sm md:text-base lg:text-lg">
  Responsive text size
</div>

<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
  Responsive grid
</div>
```

---

## Accessibility

All components follow WCAG 2.1 AA standards:

- **Keyboard Navigation**: All interactive elements are keyboard accessible
- **Focus Indicators**: Visible focus rings on interactive elements
- **ARIA Attributes**: Proper `aria-*` attributes where needed
- **Color Contrast**: All text meets contrast requirements
- **Screen Reader Support**: Semantic HTML and labels

### Example
```tsx
<Button aria-label="Close dialog">
  <X className="h-4 w-4" />
</Button>
```

---

## Theming

### Dark Mode Toggle
```tsx
'use client';

import { useEffect, useState } from 'react';

export function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  return (
    <Button
      variant="ghost"
      onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
    >
      Toggle theme
    </Button>
  );
}
```

---

## Storybook

Run Storybook locally to view all components:

```bash
cd packages/design-system
pnpm storybook
```

Access at `http://localhost:6006`

---

## Extension Rules

When adding new components:

1. **Approval Required**: Discuss new components with the team first
2. **Follow Patterns**: Match existing component structure and API
3. **Use Variants**: Leverage CVA for component variants
4. **Document Props**: Add TypeScript types and JSDoc comments
5. **Add Stories**: Create Storybook stories for all variants
6. **Test Accessibility**: Ensure keyboard navigation and screen reader support
7. **Keep it Minimal**: Avoid feature bloat, focus on common use cases

---

## Utilities

### cn() Helper
Combines Tailwind classes with proper precedence:

```typescript
import { cn } from '@pravado/design-system';

<Button className={cn('w-full', isDisabled && 'opacity-50')} />
```

---

## Future Enhancements

- **Form Components**: FormField, Select, Checkbox, Radio, Textarea
- **Navigation Components**: Tabs, Breadcrumbs, Pagination
- **Feedback Components**: Toast, Alert, Progress
- **Data Display**: Table, DataGrid, Chart wrappers
- **Layout Components**: Sheet, Dialog, Popover
- **Animation Presets**: Framer Motion integration
