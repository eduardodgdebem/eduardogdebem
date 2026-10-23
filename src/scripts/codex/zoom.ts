// Zooming a plate: the wheel (or a trackpad's pinch, which arrives as a wheel
// with ctrl held), two fingers on a touch screen, or the plate's + and −
// buttons (PlateTools.astro, which send `plate:zoom` to the canvas). The scene
// reads `value` (1 = as framed; more is closer) when it frames its view.

export interface Zoom {
  readonly value: number;
  /** Two fingers are down (or just were): a tap now isn't a tap. */
  readonly gesturing: boolean;
  by(factor: number): void;
  dispose(): void;
}

export function createZoom(canvas: HTMLCanvasElement, { min, max, onChange }: { min: number; max: number; onChange: () => void }): Zoom {
  let value = 1;
  let gestureEnd = 0;
  const set = (v: number) => {
    const next = Math.min(max, Math.max(min, v));
    if (Math.abs(next - value) < 1e-4) return;
    value = next;
    onChange();
  };

  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    set(value * Math.exp(-e.deltaY * (e.ctrlKey ? 0.012 : 0.0016)));
  };

  // Pinch: the distance between two touches, against what it was when the second came down.
  const touches = new Map<number, { x: number; y: number }>();
  let pinch: { d: number; v: number } | null = null;
  const spread = () => {
    const [a, b] = [...touches.values()];
    return Math.hypot(a.x - b.x, a.y - b.y) || 1;
  };
  const onDown = (e: PointerEvent) => {
    if (e.pointerType !== 'touch') return;
    touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (touches.size === 2) pinch = { d: spread(), v: value };
  };
  const onMove = (e: PointerEvent) => {
    if (!touches.has(e.pointerId)) return;
    touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch && touches.size === 2) set(pinch.v * (spread() / pinch.d));
  };
  const onUp = (e: PointerEvent) => {
    if (!touches.delete(e.pointerId)) return;
    if (pinch) gestureEnd = performance.now();
    if (touches.size < 2) pinch = null;
  };
  const onButton = (e: Event) => set(value * (e as CustomEvent<number>).detail);

  canvas.addEventListener('wheel', onWheel, { passive: false });
  canvas.addEventListener('pointerdown', onDown);
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onUp);
  canvas.addEventListener('plate:zoom', onButton);

  return {
    get value() {
      return value;
    },
    get gesturing() {
      return pinch !== null || performance.now() - gestureEnd < 300;
    },
    by: (f) => set(value * f),
    dispose() {
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      canvas.removeEventListener('plate:zoom', onButton);
    },
  };
}
