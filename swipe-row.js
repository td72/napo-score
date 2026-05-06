/* swipe-row.js — wraps a row in a swipe-to-action container.
   Drag left to reveal a destructive background + threshold-trigger to delete. */
(function () {
  const THRESHOLD = 0.45; // fraction of width to trigger
  const MAX_REVEAL = 96;

  function bind(swipeFg, opts) {
    let startX = 0;
    let startY = 0;
    let dx = 0;
    let dragging = false;
    let locked = null; // 'h' | 'v'
    const wrap = swipeFg.parentElement;
    const width = () => wrap.offsetWidth;

    function onDown(x, y) {
      if (swipeFg.dataset.locked === '1') return;
      startX = x; startY = y; dx = 0;
      dragging = true; locked = null;
      swipeFg.classList.add('dragging');
    }
    function onMove(x, y, ev) {
      if (!dragging) return;
      const ddx = x - startX;
      const ddy = y - startY;
      if (!locked) {
        if (Math.abs(ddx) > 6 || Math.abs(ddy) > 6) {
          locked = Math.abs(ddx) > Math.abs(ddy) ? 'h' : 'v';
        }
      }
      if (locked !== 'h') return;
      if (ev) ev.preventDefault();
      dx = Math.min(0, ddx);
      // rubber band past max
      let visualDx = dx;
      if (visualDx < -MAX_REVEAL * 1.5) {
        visualDx = -MAX_REVEAL * 1.5 + (dx + MAX_REVEAL * 1.5) * 0.3;
      }
      swipeFg.style.transform = `translate3d(${visualDx}px,0,0)`;
    }
    function onUp() {
      if (!dragging) return;
      dragging = false;
      swipeFg.classList.remove('dragging');
      const wasHoriz = locked === 'h' && Math.abs(dx) > 6;
      if (locked !== 'h') {
        swipeFg.style.transform = '';
        return;
      }
      if (Math.abs(dx) > width() * THRESHOLD) {
        // commit
        swipeFg.style.transform = `translate3d(-${width()}px,0,0)`;
        if (opts.onDelete) {
          setTimeout(() => opts.onDelete(), 180);
        }
      } else {
        swipeFg.style.transform = '';
      }
      // Suppress any click that follows a horizontal drag
      if (wasHoriz) {
        const stop = (e) => { e.stopPropagation(); e.preventDefault(); };
        swipeFg.addEventListener('click', stop, { capture: true, once: true });
        // Some browsers don't fire click after a drag; clear after a tick.
        setTimeout(() => swipeFg.removeEventListener('click', stop, { capture: true }), 350);
      }
    }

    swipeFg.addEventListener('touchstart', (e) => {
      onDown(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: true });
    swipeFg.addEventListener('touchmove', (e) => {
      onMove(e.touches[0].clientX, e.touches[0].clientY, e);
    }, { passive: false });
    swipeFg.addEventListener('touchend', onUp);
    swipeFg.addEventListener('touchcancel', onUp);

    // Desktop mouse for testing
    swipeFg.addEventListener('mousedown', (e) => {
      onDown(e.clientX, e.clientY);
      const mv = (ev) => onMove(ev.clientX, ev.clientY, ev);
      const up = () => {
        onUp();
        window.removeEventListener('mousemove', mv);
        window.removeEventListener('mouseup', up);
      };
      window.addEventListener('mousemove', mv);
      window.addEventListener('mouseup', up);
    });
  }

  window.SwipeRow = { bind };
})();
