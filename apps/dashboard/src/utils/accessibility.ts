// =====================================================
// ACCESSIBILITY UTILITIES
// Sprint 65 Phase 6.2: Advanced UI/UX Foundation
// =====================================================

/**
 * Keyboard Navigation Keys
 */
export const Keys = {
  ENTER: 'Enter',
  SPACE: ' ',
  ESCAPE: 'Escape',
  TAB: 'Tab',
  ARROW_UP: 'ArrowUp',
  ARROW_DOWN: 'ArrowDown',
  ARROW_LEFT: 'ArrowLeft',
  ARROW_RIGHT: 'ArrowRight',
  HOME: 'Home',
  END: 'End',
} as const;

/**
 * Check if key matches
 */
export const isKey = (event: KeyboardEvent, key: string): boolean => {
  return event.key === key;
};

/**
 * Check if Enter or Space (for button activation)
 */
export const isActivationKey = (event: KeyboardEvent): boolean => {
  return event.key === Keys.ENTER || event.key === Keys.SPACE;
};

/**
 * Check if arrow key
 */
export const isArrowKey = (event: KeyboardEvent): boolean => {
  return [Keys.ARROW_UP, Keys.ARROW_DOWN, Keys.ARROW_LEFT, Keys.ARROW_RIGHT].includes(
    event.key as any
  );
};

/**
 * Handle keyboard navigation in a list
 */
export const handleListKeyboardNavigation = (
  event: KeyboardEvent,
  currentIndex: number,
  totalItems: number,
  onSelect: (index: number) => void,
  onActivate?: (index: number) => void
) => {
  let newIndex = currentIndex;

  switch (event.key) {
    case Keys.ARROW_DOWN:
      event.preventDefault();
      newIndex = Math.min(currentIndex + 1, totalItems - 1);
      onSelect(newIndex);
      break;
    case Keys.ARROW_UP:
      event.preventDefault();
      newIndex = Math.max(currentIndex - 1, 0);
      onSelect(newIndex);
      break;
    case Keys.HOME:
      event.preventDefault();
      onSelect(0);
      break;
    case Keys.END:
      event.preventDefault();
      onSelect(totalItems - 1);
      break;
    case Keys.ENTER:
    case Keys.SPACE:
      event.preventDefault();
      if (onActivate) {
        onActivate(currentIndex);
      }
      break;
  }
};

/**
 * Focus Management
 */

/**
 * Set focus on element
 */
export const setFocus = (element: HTMLElement | null) => {
  if (element) {
    element.focus();
  }
};

/**
 * Get all focusable elements within a container
 */
export const getFocusableElements = (container: HTMLElement): HTMLElement[] => {
  const focusableSelectors = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(',');

  return Array.from(container.querySelectorAll(focusableSelectors));
};

/**
 * Trap focus within a container (for modals)
 */
export const trapFocus = (container: HTMLElement) => {
  const focusableElements = getFocusableElements(container);
  const firstFocusable = focusableElements[0];
  const lastFocusable = focusableElements[focusableElements.length - 1];

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key !== Keys.TAB) return;

    if (event.shiftKey) {
      // Shift + Tab
      if (document.activeElement === firstFocusable) {
        event.preventDefault();
        lastFocusable?.focus();
      }
    } else {
      // Tab
      if (document.activeElement === lastFocusable) {
        event.preventDefault();
        firstFocusable?.focus();
      }
    }
  };

  container.addEventListener('keydown', handleKeyDown);

  // Set initial focus
  firstFocusable?.focus();

  // Return cleanup function
  return () => {
    container.removeEventListener('keydown', handleKeyDown);
  };
};

/**
 * ARIA Attributes
 */

/**
 * Generate ARIA label for a chart
 */
export const getChartAriaLabel = (
  chartType: string,
  title: string,
  dataPoints: number
): string => {
  return `${chartType} chart titled "${title}" with ${dataPoints} data points`;
};

/**
 * Generate ARIA label for a table
 */
export const getTableAriaLabel = (title: string, rows: number, columns: number): string => {
  return `Table "${title}" with ${rows} rows and ${columns} columns`;
};

/**
 * Generate ARIA label for a modal
 */
export const getModalAriaLabel = (title: string): string => {
  return `Modal dialog: ${title}`;
};

/**
 * Generate ARIA label for a tab
 */
export const getTabAriaLabel = (
  tabName: string,
  index: number,
  total: number,
  isSelected: boolean
): string => {
  return `${tabName}, tab ${index + 1} of ${total}${isSelected ? ', selected' : ''}`;
};

/**
 * Generate ARIA live region announcement
 */
export const announce = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
  const announcement = document.createElement('div');
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.textContent = message;

  document.body.appendChild(announcement);

  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
};

/**
 * Color Contrast Utilities
 */

/**
 * Calculate relative luminance
 */
const getRelativeLuminance = (r: number, g: number, b: number): number => {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
};

/**
 * Calculate contrast ratio between two colors
 */
export const getContrastRatio = (color1: string, color2: string): number => {
  // Parse hex colors
  const parseHex = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : { r: 0, g: 0, b: 0 };
  };

  const rgb1 = parseHex(color1);
  const rgb2 = parseHex(color2);

  const l1 = getRelativeLuminance(rgb1.r, rgb1.g, rgb1.b);
  const l2 = getRelativeLuminance(rgb2.r, rgb2.g, rgb2.b);

  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  return (lighter + 0.05) / (darker + 0.05);
};

/**
 * Check if contrast ratio meets WCAG AA (4.5:1 for normal text, 3:1 for large text)
 */
export const meetsWCAGAA = (
  foreground: string,
  background: string,
  isLargeText = false
): boolean => {
  const ratio = getContrastRatio(foreground, background);
  const threshold = isLargeText ? 3 : 4.5;
  return ratio >= threshold;
};

/**
 * Check if contrast ratio meets WCAG AAA (7:1 for normal text, 4.5:1 for large text)
 */
export const meetsWCAGAAA = (
  foreground: string,
  background: string,
  isLargeText = false
): boolean => {
  const ratio = getContrastRatio(foreground, background);
  const threshold = isLargeText ? 4.5 : 7;
  return ratio >= threshold;
};

/**
 * Screen Reader Only Styles
 */
export const srOnlyStyles: React.CSSProperties = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  padding: '0',
  margin: '-1px',
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: '0',
};

/**
 * Focus Visible Styles
 */
export const focusVisibleStyles = {
  outline: '2px solid #3b82f6',
  outlineOffset: '2px',
  borderRadius: '4px',
};

/**
 * Skip Link Component Helper
 */
export const createSkipLink = (targetId: string, label: string = 'Skip to main content') => {
  return {
    href: `#${targetId}`,
    className: 'skip-link',
    children: label,
    style: srOnlyStyles,
  };
};
