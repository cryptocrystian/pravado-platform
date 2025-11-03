# UX Guidelines

**Platform:** Pravado
**Version:** 1.0.0
**Sprint:** 65 Phase 6.2: Advanced UI/UX Foundation
**Last Updated:** 2025-11-03

---

## 📋 Overview

This document defines the UX patterns, animation guidelines, accessibility standards, and interaction design principles for the Pravado platform across web and mobile applications.

---

## 🎨 Design Principles

### 1. Clarity
- Information should be easy to understand at a glance
- Use clear, concise language
- Prioritize important content
- Minimize cognitive load

### 2. Consistency
- Maintain uniform patterns across all screens
- Use consistent terminology
- Apply the same interaction patterns
- Follow platform conventions (iOS, Android, Web)

### 3. Feedback
- Provide immediate visual feedback for all actions
- Show loading states for async operations
- Confirm successful actions
- Clearly communicate errors

### 4. Accessibility
- Meet WCAG 2.1 Level AA standards minimum
- Support keyboard navigation
- Provide screen reader support
- Maintain sufficient color contrast

### 5. Performance
- Animations should feel smooth (60 FPS)
- Loading states for operations >300ms
- Optimize for mobile devices
- Progressive enhancement

---

## 🎬 Animation System

### Motion Curve Presets

```typescript
// Standard - Most common use case
easings.standard = [0.4, 0.0, 0.2, 1]

// Decelerate - Elements entering screen
easings.decelerate = [0.0, 0.0, 0.2, 1]

// Accelerate - Elements leaving screen
easings.accelerate = [0.4, 0.0, 1, 1]

// Sharp - Quick, precise movements
easings.sharp = [0.4, 0.0, 0.6, 1]

// Smooth - Gentle, organic movements
easings.smooth = [0.25, 0.1, 0.25, 1]

// Bounce - Playful spring effect
easings.bounce = [0.68, -0.55, 0.265, 1.55]

// Elastic - Elastic spring effect
easings.elastic = [0.68, -0.6, 0.32, 1.6]
```

### Standard Durations

| Duration | Seconds | Use Case |
|----------|---------|----------|
| Instant | 0.1s | Hover effects, state changes |
| Fast | 0.2s | Tooltips, small UI updates |
| Normal | 0.3s | Most animations, fades, slides |
| Slow | 0.5s | Large animations, page transitions |
| Slower | 0.7s | Complex animations |
| Slowest | 1.0s | Chart animations, data visualizations |

### Animation Types

#### Fade Animations
**Use for:** Content appearing/disappearing, overlays
```typescript
fadeVariants: {
  hidden: { opacity: 0 },
  visible: { opacity: 1, duration: 0.3s },
  exit: { opacity: 0, duration: 0.2s }
}
```

#### Slide Animations
**Use for:** Modals, drawers, navigation
```typescript
slideVariants.up: {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1 }
}
```
**Directions:** up, down, left, right

#### Scale Animations
**Use for:** Cards, buttons, pop-ups
```typescript
scaleVariants: {
  hidden: { scale: 0.8, opacity: 0 },
  visible: { scale: 1, opacity: 1 }
}
```

#### Stagger Animations
**Use for:** Lists, grids, sequential reveals
```typescript
listContainerVariants: {
  staggerChildren: 0.05,
  delayChildren: 0.1
}
```

### When to Use Animations

✅ **DO animate:**
- Modal/dialog entry and exit
- Tab transitions
- Button hover and click states
- Chart data updates
- List item additions/removals
- Loading states
- Toast notifications
- Page transitions

❌ **DON'T animate:**
- Static content
- Critical alerts (too much delay)
- Frequently repeated actions
- When user has reduced motion preference

### Reduced Motion

Always respect `prefers-reduced-motion`:

```typescript
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const variants = prefersReducedMotion
  ? { hidden: { opacity: 0 }, visible: { opacity: 1 } }
  : { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } };
```

---

## 🎭 Loading States

### Types of Loading States

#### 1. Skeleton Loaders
**Use for:** List/table/card content loading
```tsx
<SkeletonCard lines={3} />
<SkeletonTable rows={5} columns={4} />
```

**Advantages:**
- Shows content structure
- Reduces perceived wait time
- Better UX than spinners

#### 2. Spinners
**Use for:** Button actions, small components
```tsx
<Button loading={isLoading}>Submit</Button>
```

#### 3. Progress Bars
**Use for:** File uploads, multi-step processes
```tsx
<ProgressBar value={uploadProgress} max={100} />
```

#### 4. Empty States
**Use for:** No data, errors, initial states
```tsx
<EmptyState
  type="no-data"
  title="No results found"
  description="Try adjusting your filters"
  action={{ label: "Clear filters", onClick: clearFilters }}
/>
```

### Loading State Guidelines

- Show loading indicator after 300ms delay
- Use skeleton loaders for >1 second loads
- Provide progress indication for >5 second operations
- Allow cancellation for long operations
- Show meaningful loading messages

---

## 🎨 Color System

### Light Mode

```typescript
colors.light = {
  primary: '#6200EE',
  secondary: '#03DAC6',
  background: '#FFFFFF',
  surface: '#FFFFFF',
  error: '#B00020',
  success: '#10b981',
  warning: '#f59e0b',
  info: '#3b82f6',
  text: '#000000',
  textSecondary: '#666666',
  border: '#E5E7EB',
}
```

### Dark Mode

```typescript
colors.dark = {
  primary: '#BB86FC',
  secondary: '#03DAC6',
  background: '#121212',
  surface: '#1E1E1E',
  error: '#CF6679',
  success: '#10b981',
  warning: '#f59e0b',
  info: '#3b82f6',
  text: '#FFFFFF',
  textSecondary: '#AAAAAA',
  border: '#2D2D2D',
}
```

### Semantic Colors

| Color | Light | Dark | Use Case |
|-------|-------|------|----------|
| Success | #10b981 | #10b981 | Success messages, confirmations |
| Error | #B00020 | #CF6679 | Errors, destructive actions |
| Warning | #f59e0b | #f59e0b | Warnings, caution |
| Info | #3b82f6 | #3b82f6 | Information, neutral alerts |

---

## ♿ Accessibility Guidelines

### WCAG 2.1 Level AA Requirements

#### Color Contrast
- **Normal text:** Minimum 4.5:1 contrast ratio
- **Large text (18pt+):** Minimum 3:1 contrast ratio
- **UI components:** Minimum 3:1 contrast ratio

**Testing:**
```typescript
import { meetsWCAGAA } from '@utils/accessibility';

const isAccessible = meetsWCAGAA('#6200EE', '#FFFFFF'); // true
```

#### Keyboard Navigation

All interactive elements must be:
- Focusable (tab order)
- Actionable (Enter/Space)
- Visible (focus indicator)

**Required keyboard shortcuts:**
- `Tab` / `Shift+Tab` - Navigate between elements
- `Enter` / `Space` - Activate buttons
- `Escape` - Close modals/dialogs
- `Arrow keys` - Navigate lists/menus
- `Home` / `End` - Jump to first/last item

**Implementation:**
```tsx
import { useKeyboardNavigation } from '@hooks/useKeyboardNavigation';

useKeyboardNavigation({
  onEscape: closeModal,
  onEnter: submitForm
});
```

#### Focus Management

- Visible focus indicator on all interactive elements
- Focus trap for modals and dialogs
- Return focus after closing overlays
- Skip links for main content

**Focus indicator:**
```css
*:focus-visible {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
  border-radius: 4px;
}
```

#### ARIA Labels

**Charts:**
```tsx
<div
  role="img"
  aria-label="Bar chart showing monthly revenue with 12 data points"
>
  <Chart data={data} />
</div>
```

**Tables:**
```tsx
<table aria-label="User list with 50 rows and 5 columns">
  <caption>Active users</caption>
  ...
</table>
```

**Modals:**
```tsx
<div
  role="dialog"
  aria-labelledby="modal-title"
  aria-describedby="modal-description"
  aria-modal="true"
>
  <h2 id="modal-title">Confirm deletion</h2>
  <p id="modal-description">This action cannot be undone</p>
</div>
```

**Live regions:**
```tsx
<div role="status" aria-live="polite" aria-atomic="true">
  {statusMessage}
</div>
```

#### Screen Reader Support

- Provide text alternatives for images
- Use semantic HTML elements
- Add ARIA labels where needed
- Announce dynamic content changes
- Use `aria-live` regions for updates

**Screen reader only text:**
```tsx
<span className="sr-only">
  This content is only visible to screen readers
</span>
```

```css
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
```

---

## 📱 Mobile-Specific Guidelines

### Touch Targets

- Minimum size: 44x44 points (iOS), 48x48dp (Android)
- Adequate spacing between targets (8px minimum)
- Visible tap states

### Gestures

- **Swipe:** Navigate between screens, delete list items
- **Pull to refresh:** Refresh content
- **Long press:** Show context menu
- **Pinch to zoom:** Image galleries

### Performance

- Animations should run at 60 FPS
- Use `react-native-reanimated` for complex animations
- Optimize list rendering with `FlatList`
- Lazy load images

### Platform-Specific

#### iOS
- Follow iOS Human Interface Guidelines
- Use iOS-style navigation (back swipe)
- Respect safe area insets
- Use platform fonts (SF Pro)

#### Android
- Follow Material Design guidelines
- Use Android-style navigation (back button)
- Respect system navigation
- Use platform fonts (Roboto)

---

## 🎛️ Component Patterns

### Buttons

#### Primary Button
**Use for:** Main action on a page
```tsx
<Button variant="primary">Save Changes</Button>
```

#### Secondary Button
**Use for:** Alternative actions
```tsx
<Button variant="secondary">Cancel</Button>
```

#### Tertiary Button
**Use for:** Less important actions
```tsx
<Button variant="tertiary">Learn More</Button>
```

#### Button States
- Default
- Hover (`scale: 1.02`)
- Active/Tap (`scale: 0.98`)
- Loading (spinner + disabled)
- Disabled (reduced opacity)

### Modals

**Entry animation:** Scale + fade
**Exit animation:** Scale + fade
**Backdrop:** Dark overlay (opacity: 0.5)
**Focus trap:** Enabled
**Close on:** Escape key, backdrop click, close button

```tsx
<AnimatedModal
  isOpen={isOpen}
  onClose={onClose}
  title="Confirm Action"
>
  <p>Are you sure?</p>
</AnimatedModal>
```

### Toasts/Alerts

**Position:** Top-right (desktop), top-center (mobile)
**Duration:** 5 seconds (info), 7 seconds (error)
**Animation:** Slide in from right
**Dismissible:** Yes (X button)

**Types:**
- Success (green)
- Error (red)
- Warning (orange)
- Info (blue)

```tsx
const { showToast } = useToast();
showToast('Settings saved successfully', 'success');
```

### Empty States

**Components:**
- Illustration (Lottie animation or icon)
- Title
- Description (optional)
- Action button (optional)

**Types:**
- No data
- Error
- Loading
- Search results
- Offline

```tsx
<EmptyState
  type="no-data"
  title="No campaigns yet"
  description="Create your first campaign to get started"
  action={{ label: "Create Campaign", onClick: createCampaign }}
/>
```

---

## 📊 Data Visualization

### Chart Animations

- **Entry:** Fade in + scale (duration: 0.5-1.0s)
- **Data updates:** Smooth transitions (duration: 0.3s)
- **Bars:** Scale from bottom
- **Lines:** Draw path (pathLength animation)
- **Points:** Fade in with stagger

### Chart Accessibility

```tsx
<div
  role="img"
  aria-label={`${chartType} chart showing ${dataDescription}`}
  tabIndex={0}
>
  <Chart data={data} />
  <table className="sr-only">
    {/* Data table for screen readers */}
  </table>
</div>
```

### Interactive Charts

- Tooltips on hover
- Click to filter/drill down
- Legend toggle
- Zoom/pan support

---

## 🎯 Best Practices

### Performance

- Use `React.memo()` for expensive components
- Implement virtualization for long lists
- Lazy load routes and components
- Optimize images (WebP, responsive sizes)
- Debounce search inputs
- Cache API responses

### Error Handling

- Show user-friendly error messages
- Provide recovery actions
- Log errors to monitoring service
- Don't expose technical details
- Offer help/support links

### Forms

- Validate on blur (not on every keystroke)
- Show inline validation errors
- Disable submit during submission
- Show success confirmation
- Preserve form data on error

### Navigation

- Breadcrumbs for deep navigation
- Active state for current page
- Loading states for route changes
- Scroll to top on page change
- Remember scroll position on back

---

## ✅ Verification Checklist

### Visual Testing

- [ ] All animations run smoothly (60 FPS)
- [ ] No layout shift during loading
- [ ] Consistent spacing and alignment
- [ ] Proper dark mode support
- [ ] Responsive across breakpoints

### Accessibility Testing

- [ ] WCAG AA contrast ratios pass
- [ ] All interactive elements focusable
- [ ] Focus indicators visible
- [ ] Screen reader compatible
- [ ] Keyboard navigation works
- [ ] ARIA labels present
- [ ] Reduced motion respected

### Interaction Testing

- [ ] Buttons provide feedback
- [ ] Loading states show
- [ ] Error states clear
- [ ] Success confirmations display
- [ ] Modals can be dismissed
- [ ] Forms validate correctly

### Mobile Testing

- [ ] Touch targets adequate size
- [ ] Gestures work as expected
- [ ] No horizontal scroll
- [ ] Safe area respected
- [ ] Platform conventions followed

---

## 📚 Resources

### Tools

- **Animation:** Framer Motion, Lottie
- **Accessibility:** axe DevTools, WAVE, Lighthouse
- **Color Contrast:** WebAIM Contrast Checker
- **Performance:** Chrome DevTools, React DevTools Profiler

### Documentation

- [Framer Motion](https://www.framer.com/motion/)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Material Design](https://material.io/design)
- [iOS Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)
- [React Native Reanimated](https://docs.swmansion.com/react-native-reanimated/)

---

## 🔄 Maintenance

This document should be reviewed and updated:
- After major feature additions
- When new patterns emerge
- Following user feedback
- Quarterly (minimum)

**Last Reviewed:** 2025-11-03
**Next Review:** 2026-02-03
**Owner:** UX Team

---

**Version:** 1.0.0
**Sprint:** 65 Phase 6.2
**Status:** ✅ Complete
