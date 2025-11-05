# Pravado Platform - Accessibility (A11y) Guidelines

**Sprint 76 - Track C: Accessibility Improvements**

This document outlines accessibility standards, guidelines, and improvements for the Pravado platform to ensure WCAG 2.1 Level AA compliance.

## Table of Contents

1. [Overview](#overview)
2. [WCAG 2.1 Principles](#wcag-21-principles)
3. [Current Accessibility Status](#current-accessibility-status)
4. [Required Improvements](#required-improvements)
5. [Component-Specific Guidelines](#component-specific-guidelines)
6. [Testing Procedures](#testing-procedures)
7. [Tools and Resources](#tools-and-resources)

---

## Overview

### Why Accessibility Matters

- **Legal Compliance**: Avoid ADA lawsuits and Section 508 violations
- **Market Reach**: 15% of the world's population has some form of disability
- **SEO Benefits**: Accessible sites rank better in search engines
- **Better UX**: Accessibility improvements benefit all users, not just those with disabilities

### Accessibility Target

- **Level**: WCAG 2.1 Level AA
- **Lighthouse Score**: 95+ for all public pages
- **Screen Readers**: Full compatibility with NVDA, JAWS, VoiceOver

---

## WCAG 2.1 Principles

### POUR Framework

1. **Perceivable**: Information must be presentable to users in ways they can perceive
2. **Operable**: UI components must be operable by all users
3. **Understandable**: Information and operation must be understandable
4. **Robust**: Content must be robust enough for assistive technologies

---

## Current Accessibility Status

### Compliant Areas ✅

- Semantic HTML structure (header, nav, main, footer)
- Form labels associated with inputs
- Alt text for informational images
- Sufficient heading hierarchy (H1 → H6)
- Focus visible on interactive elements

### Non-Compliant Areas ❌

- Missing ARIA labels on some icon buttons
- Insufficient color contrast on some text (< 4.5:1)
- Missing skip navigation link
- Some interactive elements not keyboard accessible
- Missing role attributes on custom components

---

## Required Improvements

### Priority 1: Critical (Must Fix Before Launch)

#### 1. Color Contrast

**Issue**: Some text fails WCAG AA contrast ratio (4.5:1 for normal text, 3:1 for large text)

**Examples**:
- Light gray text on white background (#9CA3AF on #FFFFFF = 2.8:1 ❌)
- Blue links on light blue background (#3B82F6 on #DBEAFE = 2.1:1 ❌)

**Fix**:

```css
/* apps/dashboard/src/styles/globals.css */

/* Before: Insufficient contrast */
.text-gray-400 {
  color: #9CA3AF; /* 2.8:1 contrast on white */
}

/* After: WCAG AA compliant */
.text-gray-600 {
  color: #4B5563; /* 7:1 contrast on white ✅ */
}

/* Links on light backgrounds */
.link-primary {
  color: #1D4ED8; /* 8:1 contrast on white ✅ */
}
```

**Verification**:
- Use https://webaim.org/resources/contrastchecker/
- Target: 4.5:1 for body text, 3:1 for headings (18px+)

---

#### 2. ARIA Labels for Icon Buttons

**Issue**: Icon-only buttons lack accessible names

**Examples**:
```tsx
// ❌ Bad: No accessible name
<button onClick={handleClose}>
  <XIcon />
</button>

// ✅ Good: Has aria-label
<button onClick={handleClose} aria-label="Close dialog">
  <XIcon />
</button>
```

**Required Fixes**:

```tsx
// apps/dashboard/src/components/KpiTiles.tsx
<button
  onClick={() => setSelectedPeriod('30d')}
  aria-label="Show 30-day metrics"
  aria-pressed={selectedPeriod === '30d'}
>
  30d
</button>

// apps/dashboard/src/components/RevenueTrends.tsx
<button
  onClick={toggleChartType}
  aria-label={`Switch to ${chartType === 'line' ? 'bar' : 'line'} chart`}
>
  <ChartIcon />
</button>
```

---

#### 3. Keyboard Navigation

**Issue**: Some interactive elements not reachable via keyboard

**Required**:
- All buttons, links, and form inputs must be keyboard accessible
- Tab order must be logical (top → bottom, left → right)
- Modal/dialog focus trapping
- Escape key to close modals

**Example Fix**:

```tsx
// apps/dashboard/src/components/Modal.tsx
import { useEffect, useRef } from 'react';
import { useFocusTrap } from '@/hooks/useFocusTrap';

export function Modal({ isOpen, onClose, children }) {
  const modalRef = useRef<HTMLDivElement>(null);

  // Trap focus inside modal
  useFocusTrap(modalRef, isOpen);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={modalRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <h2 id="modal-title">{/* Title */}</h2>
      {children}
      <button onClick={onClose} aria-label="Close">×</button>
    </div>
  );
}
```

---

#### 4. Form Accessibility

**Issue**: Some forms lack proper labels, error handling, or validation feedback

**Required**:
- All inputs must have associated labels
- Error messages must be announced to screen readers
- Required fields must be indicated
- Validation errors must be clear and actionable

**Example Fix**:

```tsx
// apps/dashboard/src/components/LoginForm.tsx
<form aria-labelledby="login-heading">
  <h2 id="login-heading">Sign In</h2>

  <div>
    <label htmlFor="email">
      Email <span aria-label="required">*</span>
    </label>
    <input
      id="email"
      type="email"
      required
      aria-required="true"
      aria-invalid={errors.email ? 'true' : 'false'}
      aria-describedby={errors.email ? 'email-error' : undefined}
    />
    {errors.email && (
      <span id="email-error" role="alert" className="text-red-600">
        {errors.email}
      </span>
    )}
  </div>

  <div>
    <label htmlFor="password">
      Password <span aria-label="required">*</span>
    </label>
    <input
      id="password"
      type="password"
      required
      aria-required="true"
      aria-invalid={errors.password ? 'true' : 'false'}
      aria-describedby={errors.password ? 'password-error' : undefined}
    />
    {errors.password && (
      <span id="password-error" role="alert" className="text-red-600">
        {errors.password}
      </span>
    )}
  </div>

  <button type="submit">Sign In</button>
</form>
```

---

### Priority 2: Important (Fix Within 30 Days)

#### 5. Skip Navigation Link

**Issue**: Keyboard users must tab through entire navigation to reach main content

**Fix**:

```tsx
// apps/dashboard/src/components/Layout.tsx
export function Layout({ children }) {
  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-blue-600 focus:text-white focus:px-4 focus:py-2 focus:rounded"
      >
        Skip to main content
      </a>

      <header>{/* Navigation */}</header>

      <main id="main-content" tabIndex={-1}>
        {children}
      </main>
    </>
  );
}
```

**Tailwind CSS utility for screen reader only content**:

```css
/* apps/dashboard/src/styles/globals.css */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}

.focus\:not-sr-only:focus {
  position: static;
  width: auto;
  height: auto;
  padding: 0;
  margin: 0;
  overflow: visible;
  clip: auto;
  white-space: normal;
}
```

---

#### 6. Landmark Regions

**Issue**: Missing ARIA landmark roles for screen reader navigation

**Required**:
- `<header>` or `role="banner"`
- `<nav>` or `role="navigation"`
- `<main>` or `role="main"`
- `<aside>` or `role="complementary"`
- `<footer>` or `role="contentinfo"`

**Example**:

```tsx
export function AppShell() {
  return (
    <>
      <header role="banner">
        <nav aria-label="Main navigation">
          {/* Navigation links */}
        </nav>
      </header>

      <main role="main">
        {/* Page content */}
      </main>

      <aside role="complementary" aria-label="Sidebar">
        {/* Sidebar content */}
      </aside>

      <footer role="contentinfo">
        {/* Footer content */}
      </footer>
    </>
  );
}
```

---

#### 7. Focus Management

**Issue**: Focus lost when opening/closing modals or navigating

**Fix**:

```tsx
export function useRestoreFocus(isOpen: boolean) {
  const previousActiveElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement as HTMLElement;
    } else {
      previousActiveElement.current?.focus();
    }
  }, [isOpen]);
}

// Usage in Modal
function Modal({ isOpen, onClose }) {
  useRestoreFocus(isOpen);

  return (
    <div role="dialog" aria-modal="true">
      {/* Modal content */}
    </div>
  );
}
```

---

### Priority 3: Nice to Have (Continuous Improvement)

#### 8. Reduced Motion Support

**Issue**: Animations can cause discomfort for users with vestibular disorders

**Fix**:

```css
/* Respect prefers-reduced-motion */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

---

#### 9. High Contrast Mode

**Issue**: Users with low vision may enable high contrast mode

**Fix**:

```css
/* Support Windows High Contrast Mode */
@media (prefers-contrast: high) {
  :root {
    --color-primary: #0000FF;
    --color-text: #000000;
    --color-background: #FFFFFF;
    --border-width: 2px;
  }

  button,
  a {
    border: 2px solid currentColor;
  }
}
```

---

#### 10. Internationalization (i18n)

**Issue**: `lang` attribute missing on HTML element

**Fix**:

```tsx
// apps/dashboard/src/pages/_document.tsx
import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="en">
      <Head />
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
```

---

## Component-Specific Guidelines

### Buttons

```tsx
// ✅ Good: Clear accessible name, keyboard accessible
<button
  type="button"
  aria-label="Delete item"
  onClick={handleDelete}
  className="focus:ring-2 focus:ring-blue-500 focus:outline-none"
>
  <TrashIcon aria-hidden="true" />
  <span className="sr-only">Delete</span>
</button>
```

### Links

```tsx
// ✅ Good: Descriptive link text, external link indicator
<a
  href="https://docs.pravado.com"
  target="_blank"
  rel="noopener noreferrer"
  aria-label="Pravado documentation (opens in new tab)"
>
  Documentation
  <ExternalLinkIcon aria-hidden="true" />
</a>
```

### Images

```tsx
// Informational image
<img
  src="/logo.png"
  alt="Pravado logo"
/>

// Decorative image (empty alt)
<img
  src="/decorative-pattern.svg"
  alt=""
  aria-hidden="true"
/>
```

### Tables

```tsx
<table>
  <caption>Monthly revenue by plan tier</caption>
  <thead>
    <tr>
      <th scope="col">Tier</th>
      <th scope="col">MRR</th>
      <th scope="col">Customers</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th scope="row">Starter</th>
      <td>$12,450</td>
      <td>83</td>
    </tr>
  </tbody>
</table>
```

---

## Testing Procedures

### Automated Testing

#### Lighthouse Audit

```bash
# Run Lighthouse CI
npm install -g @lhci/cli
lhci autorun --config=lighthouserc.json
```

**Target Scores**:
- Performance: 90+
- Accessibility: 95+
- Best Practices: 95+
- SEO: 100

#### axe-core

```bash
# Install axe DevTools Chrome extension
# Or use @axe-core/playwright for automated tests

npm install --save-dev @axe-core/playwright
```

```typescript
// tests/e2e/accessibility.spec.ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('pricing page should have no accessibility violations', async ({ page }) => {
  await page.goto('/pricing');

  const accessibilityScanResults = await new AxeBuilder({ page }).analyze();

  expect(accessibilityScanResults.violations).toEqual([]);
});
```

### Manual Testing

#### Keyboard-Only Testing

1. Unplug mouse
2. Navigate using only keyboard:
   - Tab: Move to next focusable element
   - Shift+Tab: Move to previous focusable element
   - Enter/Space: Activate button or link
   - Arrow keys: Navigate within component (tabs, dropdown)
   - Escape: Close modal or cancel action

3. Verify:
   - All interactive elements are reachable
   - Focus indicator is clearly visible
   - Tab order is logical
   - No keyboard traps

#### Screen Reader Testing

**Tools**:
- **NVDA** (Windows, free): https://www.nvaccess.org/
- **JAWS** (Windows, paid): https://www.freedomscientific.com/products/software/jaws/
- **VoiceOver** (macOS/iOS, built-in): Cmd+F5 to enable
- **TalkBack** (Android, built-in)

**Test Checklist**:
- [ ] Page title is read correctly
- [ ] Headings announce proper level (H1, H2, etc.)
- [ ] Buttons announce "button" role and accessible name
- [ ] Links announce "link" role and destination
- [ ] Form inputs announce label and validation errors
- [ ] Landmarks are announced (navigation, main, etc.)
- [ ] Images have alt text or are marked decorative

---

## Tools and Resources

### Automated Tools

- **Lighthouse**: https://developers.google.com/web/tools/lighthouse
- **axe DevTools**: https://www.deque.com/axe/devtools/
- **WAVE**: https://wave.webaim.org/
- **Pa11y**: https://pa11y.org/

### Manual Testing Tools

- **NVDA Screen Reader**: https://www.nvaccess.org/
- **Color Contrast Checker**: https://webaim.org/resources/contrastchecker/
- **Keyboard Navigation Tester**: https://webaim.org/resources/keyboard/

### Guidelines and Standards

- **WCAG 2.1**: https://www.w3.org/WAI/WCAG21/quickref/
- **WAI-ARIA Authoring Practices**: https://www.w3.org/WAI/ARIA/apg/
- **A11y Project**: https://www.a11yproject.com/

### Training Resources

- **WebAIM**: https://webaim.org/
- **Deque University**: https://dequeuniversity.com/
- **Microsoft Inclusive Design**: https://www.microsoft.com/design/inclusive/

---

## Implementation Checklist

**Sprint 76 - Track C**:

- [x] Document accessibility guidelines
- [ ] Fix color contrast issues on pricing page
- [ ] Add ARIA labels to icon buttons
- [ ] Implement keyboard navigation for modals
- [ ] Add skip navigation link
- [ ] Run Lighthouse audit on /pricing (target: 95+)
- [ ] Test with screen reader (NVDA or VoiceOver)
- [ ] Add automated axe-core tests to Playwright suite

**Post-Sprint**:
- [ ] Apply accessibility fixes to all pages
- [ ] Conduct full accessibility audit
- [ ] Get WCAG 2.1 Level AA certification
- [ ] Add accessibility statement to website
- [ ] Train team on accessibility best practices

---

**Last Updated**: Sprint 76 (generated automatically)
**Maintained By**: Frontend Team
**Review Frequency**: Quarterly + after each major UI update
