import { useEffect, useRef, type ReactNode } from "react";

const THRESHOLD = 0.45;
const MAX_REVEAL = 96;

interface Props {
  onDelete: () => void;
  background: ReactNode;
  children: ReactNode;
}

/**
 * Wraps a row in a swipe-to-delete container. Drag left past 45% width to
 * commit; rubber-bands past `MAX_REVEAL`. The background is revealed behind
 * the foreground as it slides.
 */
export function SwipeRow({ onDelete, background, children }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const fgRef = useRef<HTMLDivElement>(null);
  const onDeleteRef = useRef(onDelete);
  onDeleteRef.current = onDelete;

  useEffect(() => {
    const wrap = wrapRef.current;
    const fg = fgRef.current;
    if (!wrap || !fg) return;

    let startX = 0;
    let startY = 0;
    let dx = 0;
    let dragging = false;
    let locked: "h" | "v" | null = null;

    function onDown(x: number, y: number) {
      startX = x;
      startY = y;
      dx = 0;
      dragging = true;
      locked = null;
      fg!.classList.add("dragging");
    }

    function onMove(x: number, y: number, ev?: Event) {
      if (!dragging) return;
      const ddx = x - startX;
      const ddy = y - startY;
      if (!locked) {
        if (Math.abs(ddx) > 6 || Math.abs(ddy) > 6) {
          locked = Math.abs(ddx) > Math.abs(ddy) ? "h" : "v";
        }
      }
      if (locked !== "h") return;
      ev?.preventDefault();
      dx = Math.min(0, ddx);
      let visualDx = dx;
      if (visualDx < -MAX_REVEAL * 1.5) {
        visualDx = -MAX_REVEAL * 1.5 + (dx + MAX_REVEAL * 1.5) * 0.3;
      }
      fg!.style.transform = `translate3d(${visualDx}px,0,0)`;
    }

    function onUp() {
      if (!dragging) return;
      dragging = false;
      fg!.classList.remove("dragging");
      const wasHoriz = locked === "h" && Math.abs(dx) > 6;
      if (locked !== "h") {
        fg!.style.transform = "";
        return;
      }
      if (Math.abs(dx) > wrap!.offsetWidth * THRESHOLD) {
        fg!.style.transform = `translate3d(-${wrap!.offsetWidth}px,0,0)`;
        setTimeout(() => onDeleteRef.current(), 180);
      } else {
        fg!.style.transform = "";
      }
      if (wasHoriz) {
        const stop = (e: Event) => {
          e.stopPropagation();
          e.preventDefault();
        };
        fg!.addEventListener("click", stop, { capture: true, once: true });
        setTimeout(() => fg!.removeEventListener("click", stop, { capture: true }), 350);
      }
    }

    const onTouchStart = (e: TouchEvent) => onDown(e.touches[0]!.clientX, e.touches[0]!.clientY);
    const onTouchMove = (e: TouchEvent) => onMove(e.touches[0]!.clientX, e.touches[0]!.clientY, e);
    const onMouseDown = (e: MouseEvent) => {
      onDown(e.clientX, e.clientY);
      const mv = (ev: MouseEvent) => onMove(ev.clientX, ev.clientY, ev);
      const up = () => {
        onUp();
        window.removeEventListener("mousemove", mv);
        window.removeEventListener("mouseup", up);
      };
      window.addEventListener("mousemove", mv);
      window.addEventListener("mouseup", up);
    };

    fg.addEventListener("touchstart", onTouchStart, { passive: true });
    fg.addEventListener("touchmove", onTouchMove, { passive: false });
    fg.addEventListener("touchend", onUp);
    fg.addEventListener("touchcancel", onUp);
    fg.addEventListener("mousedown", onMouseDown);

    return () => {
      fg.removeEventListener("touchstart", onTouchStart);
      fg.removeEventListener("touchmove", onTouchMove);
      fg.removeEventListener("touchend", onUp);
      fg.removeEventListener("touchcancel", onUp);
      fg.removeEventListener("mousedown", onMouseDown);
    };
  }, []);

  return (
    <div ref={wrapRef} className="lswipe">
      <div className="lswipe-bg">{background}</div>
      <div ref={fgRef} className="lswipe-fg">
        {children}
      </div>
    </div>
  );
}
