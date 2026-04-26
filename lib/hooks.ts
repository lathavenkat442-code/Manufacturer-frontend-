import { useCallback, useRef } from 'react';

export const useLongPress = (
  onLongPress: (event: any) => void,
  onClick: (event: any) => void,
  { delay = 500, shouldPreventDefault = true } = {}
) => {
  const timeout = useRef<any>(null);
  const isLongPressTriggered = useRef(false);
  const startPos = useRef<{ x: number, y: number } | null>(null);
  const lastTouchTime = useRef(0);

  const start = useCallback(
    (event: any) => {
      // Prevent mouse events from firing right after touch events
      if (event.type === 'mousedown' && Date.now() - lastTouchTime.current < 500) {
        return;
      }

      if (event.type.startsWith('touch')) {
        lastTouchTime.current = Date.now();
      }

      // For multitouch, don't start long press
      if (event.touches && event.touches.length > 1) return;

      if (timeout.current) return;
      isLongPressTriggered.current = false;
      
      const pos = event.touches ? event.touches[0] : event;
      startPos.current = { x: pos.clientX, y: pos.clientY };

      timeout.current = setTimeout(() => {
        onLongPress(event);
        isLongPressTriggered.current = true;
        timeout.current = null;
      }, delay);
    },
    [onLongPress, delay]
  );

  const clear = useCallback(
    (event: any, shouldTriggerClick = true) => {
      const wasActive = !!timeout.current;
      if (timeout.current) {
        clearTimeout(timeout.current);
        timeout.current = null;
      }
      
      const target = event.target as HTMLElement;
      const isInteractive = target && typeof target.closest === 'function' 
        ? target.closest('button, a, input, select, textarea, [role="button"], .is-interactive')
        : null;

      if (shouldTriggerClick && wasActive && !isLongPressTriggered.current && !isInteractive) {
        onClick(event);
      }
      
      setTimeout(() => {
        isLongPressTriggered.current = false;
        startPos.current = null;
      }, 10);
    },
    [onClick]
  );

  const handleMove = useCallback((event: any) => {
    if (!startPos.current) return;

    const pos = event.touches ? event.touches[0] : event;
    const dx = Math.abs(pos.clientX - startPos.current.x);
    const dy = Math.abs(pos.clientY - startPos.current.y);

    // If moved more than 25px, it's likely a scroll, cancel long press
    if (dx > 25 || dy > 25) {
      if (timeout.current) {
        clearTimeout(timeout.current);
        timeout.current = null;
      }
    }
  }, []);

  return {
    onMouseDown: (e: any) => start(e),
    onTouchStart: (e: any) => start(e),
    onMouseMove: (e: any) => handleMove(e),
    onTouchMove: (e: any) => handleMove(e),
    onMouseUp: (e: any) => clear(e),
    onMouseLeave: (e: any) => clear(e, false),
    onTouchEnd: (e: any) => {
      const target = e.target as HTMLElement;
      const isInteractive = target && typeof target.closest === 'function'
        ? target.closest('button, a, input, select, textarea, [role="button"], .is-interactive')
        : null;
      if (isLongPressTriggered.current && shouldPreventDefault && !isInteractive) {
        e.preventDefault();
      }
      clear(e);
    },
    onContextMenu: (e: any) => {
      if (isLongPressTriggered.current && shouldPreventDefault) {
        e.preventDefault();
      }
    }
  };
};
