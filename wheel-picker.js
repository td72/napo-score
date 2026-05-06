/* wheel-picker.js — touch/wheel scrollable iOS-style picker.
   Plain JS, no framework. Each picker manages its own state and emits a
   change callback when the centered item changes. Designed for declared
   (13–20) and taken (0–20) integer ranges, but works on any string list. */
(function () {
  const ITEM_H = 36;

  function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }

  function createPicker(host, options) {
    // options: { items:[string|number], value, onChange }
    const items = options.items;
    let value = options.value;
    let idx = items.indexOf(value);
    if (idx < 0) idx = 0;

    host.innerHTML = '';
    host.classList.add('picker-wrap');

    const band = document.createElement('div');
    band.className = 'picker-band';

    const list = document.createElement('div');
    list.className = 'picker-list';

    items.forEach((it, i) => {
      const el = document.createElement('div');
      el.className = 'picker-item';
      el.textContent = it;
      el.dataset.idx = i;
      list.appendChild(el);
    });

    host.appendChild(band);
    host.appendChild(list);

    // The list's first item should be vertically centered when offset === 0.
    // We translate by (offset - idx*ITEM_H), where offset is also in px.
    let offset = 0;
    let dragging = false;
    let startY = 0;
    let startOffset = 0;
    let velocity = 0;
    let lastMoveY = 0;
    let lastMoveT = 0;
    let raf = null;

    function setIdx(newIdx, animate = true) {
      newIdx = clamp(Math.round(newIdx), 0, items.length - 1);
      if (newIdx !== idx) {
        idx = newIdx;
        value = items[idx];
        if (options.onChange) options.onChange(value, idx);
        // light haptic on iOS / android
        if (navigator.vibrate) try { navigator.vibrate(8); } catch (e) {}
      }
      offset = -idx * ITEM_H;
      list.style.transition = animate ? 'transform .28s cubic-bezier(.2,.8,.3,1)' : 'none';
      list.style.transform = `translate3d(0, ${offset}px, 0)`;
      // restyle items
      [...list.children].forEach((el, i) => {
        const dist = Math.abs(i - idx);
        el.classList.toggle('center', dist === 0);
        el.classList.toggle('near', dist === 1);
      });
    }

    function decay() {
      // momentum after release
      const friction = 0.94;
      const minVel = 0.4;
      function step() {
        velocity *= friction;
        offset += velocity;
        list.style.transition = 'none';
        list.style.transform = `translate3d(0, ${offset}px, 0)`;
        const liveIdx = clamp(-offset / ITEM_H, 0, items.length - 1);
        // restyle live
        [...list.children].forEach((el, i) => {
          const dist = Math.abs(i - liveIdx);
          el.classList.toggle('center', dist < 0.5);
          el.classList.toggle('near', dist >= 0.5 && dist < 1.5);
        });
        if (Math.abs(velocity) > minVel) {
          raf = requestAnimationFrame(step);
        } else {
          // snap
          const target = clamp(Math.round(-offset / ITEM_H), 0, items.length - 1);
          setIdx(target, true);
        }
      }
      raf = requestAnimationFrame(step);
    }

    function pointerDown(y) {
      if (raf) cancelAnimationFrame(raf);
      dragging = true;
      startY = y;
      startOffset = offset;
      lastMoveY = y;
      lastMoveT = performance.now();
      velocity = 0;
      list.style.transition = 'none';
    }
    function pointerMove(y) {
      if (!dragging) return;
      const dy = y - startY;
      offset = startOffset + dy;
      // clamp with rubber-band
      const maxOff = 0;
      const minOff = -(items.length - 1) * ITEM_H;
      if (offset > maxOff) offset = maxOff + (offset - maxOff) * 0.4;
      if (offset < minOff) offset = minOff + (offset - minOff) * 0.4;

      list.style.transform = `translate3d(0, ${offset}px, 0)`;

      const now = performance.now();
      const dt = now - lastMoveT;
      if (dt > 0) velocity = (y - lastMoveY) / dt * 16; // ~px/frame
      lastMoveY = y;
      lastMoveT = now;

      const liveIdx = clamp(-offset / ITEM_H, 0, items.length - 1);
      [...list.children].forEach((el, i) => {
        const dist = Math.abs(i - liveIdx);
        el.classList.toggle('center', dist < 0.5);
        el.classList.toggle('near', dist >= 0.5 && dist < 1.5);
      });
    }
    function pointerUp() {
      if (!dragging) return;
      dragging = false;
      if (Math.abs(velocity) > 1.5) {
        decay();
      } else {
        const target = clamp(Math.round(-offset / ITEM_H), 0, items.length - 1);
        setIdx(target, true);
      }
    }

    host.addEventListener('touchstart', (e) => {
      pointerDown(e.touches[0].clientY);
    }, { passive: true });
    host.addEventListener('touchmove', (e) => {
      pointerMove(e.touches[0].clientY);
      e.preventDefault();
    }, { passive: false });
    host.addEventListener('touchend', pointerUp);
    host.addEventListener('touchcancel', pointerUp);

    // Mouse for desktop
    host.addEventListener('mousedown', (e) => {
      pointerDown(e.clientY);
      const onMove = (e) => pointerMove(e.clientY);
      const onUp = () => {
        pointerUp();
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      };
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    });

    // Wheel for desktop
    let wheelTimer = null;
    host.addEventListener('wheel', (e) => {
      e.preventDefault();
      offset -= e.deltaY * 0.5;
      const maxOff = 0;
      const minOff = -(items.length - 1) * ITEM_H;
      offset = clamp(offset, minOff, maxOff);
      list.style.transition = 'none';
      list.style.transform = `translate3d(0, ${offset}px, 0)`;
      const liveIdx = clamp(-offset / ITEM_H, 0, items.length - 1);
      [...list.children].forEach((el, i) => {
        const dist = Math.abs(i - liveIdx);
        el.classList.toggle('center', dist < 0.5);
        el.classList.toggle('near', dist >= 0.5 && dist < 1.5);
      });
      clearTimeout(wheelTimer);
      wheelTimer = setTimeout(() => {
        const target = clamp(Math.round(-offset / ITEM_H), 0, items.length - 1);
        setIdx(target, true);
      }, 110);
    }, { passive: false });

    // Tap on item to select
    list.addEventListener('click', (e) => {
      const t = e.target.closest('.picker-item');
      if (!t) return;
      setIdx(parseInt(t.dataset.idx, 10), true);
    });

    setIdx(idx, false);

    return {
      get value() { return value; },
      set: (v) => {
        const i = items.indexOf(v);
        if (i >= 0) setIdx(i, true);
      },
      destroy: () => {
        if (raf) cancelAnimationFrame(raf);
        host.innerHTML = '';
      },
    };
  }

  window.WheelPicker = { create: createPicker };
})();
