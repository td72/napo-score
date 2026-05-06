import { useEffect, useRef } from "react";

const ITEM_H = 36;

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

function tryVibrate(pattern: number | number[]) {
  if (navigator.vibrate) {
    try {
      navigator.vibrate(pattern);
    } catch {
      /* ignore */
    }
  }
}

interface Props {
  items: number[];
  value: number;
  onChange: (v: number) => void;
}

/**
 * iOS-style scrollable picker. Supports touch drag with momentum, mouse drag,
 * mouse wheel, and tap-to-select. Item height is fixed at 36px (matches the
 * .picker-band CSS).
 */
export function WheelPicker({ items, value, onChange }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const valueRef = useRef(value);
  const onChangeRef = useRef(onChange);
  const itemsRef = useRef(items);

  valueRef.current = value;
  onChangeRef.current = onChange;
  itemsRef.current = items;

  // Imperatively snap when the prop value changes (without firing onChange).
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const idx = items.indexOf(value);
    if (idx < 0) return;
    list.style.transition = "transform .28s cubic-bezier(.2,.8,.3,1)";
    list.style.transform = `translate3d(0, ${-idx * ITEM_H}px, 0)`;
    [...list.children].forEach((el, i) => {
      const dist = Math.abs(i - idx);
      (el as HTMLElement).classList.toggle("center", dist === 0);
      (el as HTMLElement).classList.toggle("near", dist === 1);
    });
  }, [value, items]);

  // Bind drag/wheel handlers once. Internal mutable state via closures.
  useEffect(() => {
    const host = hostRef.current;
    const list = listRef.current;
    if (!host || !list) return;

    let idx = clamp(itemsRef.current.indexOf(valueRef.current), 0, itemsRef.current.length - 1);
    let offset = -idx * ITEM_H;
    let dragging = false;
    let startY = 0;
    let startOffset = 0;
    let velocity = 0;
    let lastMoveY = 0;
    let lastMoveT = 0;
    let raf: number | null = null;
    let wheelTimer: number | null = null;

    function restyleAt(liveIdx: number) {
      [...list!.children].forEach((el, i) => {
        const dist = Math.abs(i - liveIdx);
        (el as HTMLElement).classList.toggle("center", dist < 0.5);
        (el as HTMLElement).classList.toggle("near", dist >= 0.5 && dist < 1.5);
      });
    }

    function commit(newIdx: number, animate: boolean) {
      const items = itemsRef.current;
      newIdx = clamp(Math.round(newIdx), 0, items.length - 1);
      if (newIdx !== idx) {
        idx = newIdx;
        const v = items[idx];
        onChangeRef.current(v);
        tryVibrate(8);
      }
      offset = -idx * ITEM_H;
      list!.style.transition = animate ? "transform .28s cubic-bezier(.2,.8,.3,1)" : "none";
      list!.style.transform = `translate3d(0, ${offset}px, 0)`;
      restyleAt(idx);
    }

    function decay() {
      const friction = 0.94;
      const minVel = 0.4;
      function step() {
        velocity *= friction;
        offset += velocity;
        list!.style.transition = "none";
        list!.style.transform = `translate3d(0, ${offset}px, 0)`;
        restyleAt(clamp(-offset / ITEM_H, 0, itemsRef.current.length - 1));
        if (Math.abs(velocity) > minVel) {
          raf = requestAnimationFrame(step);
        } else {
          commit(Math.round(-offset / ITEM_H), true);
        }
      }
      raf = requestAnimationFrame(step);
    }

    function onPointerDown(y: number) {
      if (raf != null) cancelAnimationFrame(raf);
      dragging = true;
      startY = y;
      startOffset = offset;
      lastMoveY = y;
      lastMoveT = performance.now();
      velocity = 0;
      list!.style.transition = "none";
    }

    function onPointerMove(y: number, ev?: Event) {
      if (!dragging) return;
      const dy = y - startY;
      offset = startOffset + dy;
      const maxOff = 0;
      const minOff = -(itemsRef.current.length - 1) * ITEM_H;
      if (offset > maxOff) offset = maxOff + (offset - maxOff) * 0.4;
      if (offset < minOff) offset = minOff + (offset - minOff) * 0.4;
      if (ev) ev.preventDefault();
      list!.style.transform = `translate3d(0, ${offset}px, 0)`;
      const now = performance.now();
      const dt = now - lastMoveT;
      if (dt > 0) velocity = ((y - lastMoveY) / dt) * 16;
      lastMoveY = y;
      lastMoveT = now;
      restyleAt(clamp(-offset / ITEM_H, 0, itemsRef.current.length - 1));
    }

    function onPointerUp() {
      if (!dragging) return;
      dragging = false;
      if (Math.abs(velocity) > 1.5) {
        decay();
      } else {
        commit(Math.round(-offset / ITEM_H), true);
      }
    }

    const onTouchStart = (e: TouchEvent) => onPointerDown(e.touches[0]!.clientY);
    const onTouchMove = (e: TouchEvent) => onPointerMove(e.touches[0]!.clientY, e);
    const onTouchEnd = () => onPointerUp();

    const onMouseDown = (e: MouseEvent) => {
      onPointerDown(e.clientY);
      const mv = (ev: MouseEvent) => onPointerMove(ev.clientY, ev);
      const up = () => {
        onPointerUp();
        window.removeEventListener("mousemove", mv);
        window.removeEventListener("mouseup", up);
      };
      window.addEventListener("mousemove", mv);
      window.addEventListener("mouseup", up);
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      offset -= e.deltaY * 0.5;
      const maxOff = 0;
      const minOff = -(itemsRef.current.length - 1) * ITEM_H;
      offset = clamp(offset, minOff, maxOff);
      list!.style.transition = "none";
      list!.style.transform = `translate3d(0, ${offset}px, 0)`;
      restyleAt(clamp(-offset / ITEM_H, 0, itemsRef.current.length - 1));
      if (wheelTimer != null) clearTimeout(wheelTimer);
      wheelTimer = window.setTimeout(() => commit(Math.round(-offset / ITEM_H), true), 110);
    };

    const onListClick = (e: Event) => {
      const target = (e.target as HTMLElement).closest<HTMLElement>(".picker-item");
      if (!target?.dataset.idx) return;
      commit(parseInt(target.dataset.idx, 10), true);
    };

    host.addEventListener("touchstart", onTouchStart, { passive: true });
    host.addEventListener("touchmove", onTouchMove, { passive: false });
    host.addEventListener("touchend", onTouchEnd);
    host.addEventListener("touchcancel", onTouchEnd);
    host.addEventListener("mousedown", onMouseDown);
    host.addEventListener("wheel", onWheel, { passive: false });
    list.addEventListener("click", onListClick);

    // Initial position without firing onChange.
    list.style.transition = "none";
    list.style.transform = `translate3d(0, ${offset}px, 0)`;
    restyleAt(idx);

    return () => {
      if (raf != null) cancelAnimationFrame(raf);
      if (wheelTimer != null) clearTimeout(wheelTimer);
      host.removeEventListener("touchstart", onTouchStart);
      host.removeEventListener("touchmove", onTouchMove);
      host.removeEventListener("touchend", onTouchEnd);
      host.removeEventListener("touchcancel", onTouchEnd);
      host.removeEventListener("mousedown", onMouseDown);
      host.removeEventListener("wheel", onWheel);
      list.removeEventListener("click", onListClick);
    };
  }, []);

  return (
    <div ref={hostRef} className="picker-wrap">
      <div className="picker-band" />
      <div ref={listRef} className="picker-list">
        {items.map((it, i) => (
          <div key={it} className="picker-item" data-idx={i}>
            {it}
          </div>
        ))}
      </div>
    </div>
  );
}
