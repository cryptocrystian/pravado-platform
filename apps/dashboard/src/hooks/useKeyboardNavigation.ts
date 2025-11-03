// =====================================================
// KEYBOARD NAVIGATION HOOK
// Sprint 65 Phase 6.2: Advanced UI/UX Foundation
// =====================================================

import { useEffect, useCallback, useState } from 'react';
import { Keys, isActivationKey, handleListKeyboardNavigation } from '../utils/accessibility';

interface UseKeyboardNavigationOptions {
  enabled?: boolean;
  onEscape?: () => void;
  onEnter?: () => void;
}

/**
 * Hook for handling common keyboard interactions
 */
export const useKeyboardNavigation = (options: UseKeyboardNavigationOptions = {}) => {
  const { enabled = true, onEscape, onEnter } = options;

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === Keys.ESCAPE && onEscape) {
        onEscape();
      }
      if (event.key === Keys.ENTER && onEnter) {
        onEnter();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, onEscape, onEnter]);
};

interface UseListNavigationOptions {
  itemCount: number;
  onSelect?: (index: number) => void;
  onActivate?: (index: number) => void;
  initialIndex?: number;
  wrap?: boolean;
}

/**
 * Hook for keyboard navigation in lists
 */
export const useListNavigation = (options: UseListNavigationOptions) => {
  const {
    itemCount,
    onSelect,
    onActivate,
    initialIndex = 0,
    wrap = false,
  } = options;

  const [selectedIndex, setSelectedIndex] = useState(initialIndex);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      let newIndex = selectedIndex;

      switch (event.key) {
        case Keys.ARROW_DOWN:
          event.preventDefault();
          newIndex = wrap
            ? (selectedIndex + 1) % itemCount
            : Math.min(selectedIndex + 1, itemCount - 1);
          break;
        case Keys.ARROW_UP:
          event.preventDefault();
          newIndex = wrap
            ? (selectedIndex - 1 + itemCount) % itemCount
            : Math.max(selectedIndex - 1, 0);
          break;
        case Keys.HOME:
          event.preventDefault();
          newIndex = 0;
          break;
        case Keys.END:
          event.preventDefault();
          newIndex = itemCount - 1;
          break;
        case Keys.ENTER:
        case Keys.SPACE:
          event.preventDefault();
          if (onActivate) {
            onActivate(selectedIndex);
          }
          return;
      }

      if (newIndex !== selectedIndex) {
        setSelectedIndex(newIndex);
        if (onSelect) {
          onSelect(newIndex);
        }
      }
    },
    [selectedIndex, itemCount, wrap, onSelect, onActivate]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  return {
    selectedIndex,
    setSelectedIndex,
  };
};

/**
 * Hook for focus trap (for modals, dropdowns)
 */
export const useFocusTrap = (isActive: boolean) => {
  const [containerRef, setContainerRef] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!isActive || !containerRef) return;

    const focusableElements = containerRef.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== Keys.TAB) return;

      if (event.shiftKey) {
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          event.preventDefault();
          firstElement?.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    firstElement?.focus();

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isActive, containerRef]);

  return setContainerRef;
};

export default useKeyboardNavigation;
