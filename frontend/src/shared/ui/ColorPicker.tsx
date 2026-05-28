import { useEffect, useRef, useState } from "react";
import { HexColorPicker } from "react-colorful";

import "./color-picker.css";

const DEFAULT_PRESETS = [
  "#2563eb",
  "#dc2626",
  "#16a34a",
  "#f59e0b",
  "#9333ea",
  "#0ea5e9",
  "#ec4899",
  "#0f172a",
];

export type ColorPickerProps = {
  value: string;
  onChange: (color: string) => void;
  presets?: string[];
  label?: string;
};

const HEX6 = /^#[0-9A-Fa-f]{6}$/;

export function ColorPicker({
  value,
  onChange,
  presets = DEFAULT_PRESETS,
  label,
}: ColorPickerProps) {
  const [open, setOpen] = useState(false);
  const [hexInput, setHexInput] = useState(value);
  const swatchRef = useRef<HTMLButtonElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({});

  useEffect(() => {
    setHexInput(value);
  }, [value]);

  // Outside-click handling. We listen on 'mousedown' (not 'click') so that
  // clicking a preset color, the hex input, or any control inside the
  // popover registers a "down inside" event and does NOT close the picker.
  //
  // Known limitation: starting a drag on the saturation/hue gradient and
  // releasing the mouse OUTSIDE the popover can close it (the next gesture
  // happens to land outside). We tried several mitigations (pointerdown
  // tracking, capture-phase click suppression) but each broke other
  // interactions (preset clicks). For now this stays as documented edge.
  useEffect(() => {
    if (!open) return;
    function handleMouseDown(e: MouseEvent) {
      const target = e.target as Node;
      if (popoverRef.current?.contains(target)) return;
      if (swatchRef.current?.contains(target)) return;
      setOpen(false);
    }
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [open]);

  // Position the popover anchored to the swatch via fixed positioning, so it
  // is NOT clipped by parent overflows or covered by navbars at lower z-index.
  useEffect(() => {
    if (!open) return;
    function reposition() {
      const swatch = swatchRef.current;
      const popover = popoverRef.current;
      if (!swatch || !popover) return;

      const swatchRect = swatch.getBoundingClientRect();
      const popoverRect = popover.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const margin = 8;

      // Default: open downward and align left edges.
      let top = swatchRect.bottom + margin;
      let left = swatchRect.left;

      // Flip up if there's not enough room below.
      if (top + popoverRect.height > vh - margin) {
        top = swatchRect.top - popoverRect.height - margin;
      }
      // Clamp horizontally inside the viewport.
      if (left + popoverRect.width > vw - margin) {
        left = vw - popoverRect.width - margin;
      }
      if (left < margin) left = margin;
      // Don't let it scroll off the top either.
      if (top < margin) top = margin;

      setPopoverStyle({
        position: "fixed",
        top: `${top}px`,
        left: `${left}px`,
        zIndex: 5000,
      });
    }
    reposition();
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [open]);

  function commitHex(next: string) {
    setHexInput(next);
    if (HEX6.test(next)) {
      onChange(next.toLowerCase());
    }
  }

  return (
    <span className="color-picker">
      {label && <span className="color-picker-label">{label}</span>}
      <button
        ref={swatchRef}
        type="button"
        className="color-picker-swatch"
        style={{ background: value }}
        onClick={() => setOpen((v) => !v)}
        aria-label="Wybierz kolor"
        aria-expanded={open}
      />
      {open && (
        <div
          ref={popoverRef}
          className="color-picker-popover"
          style={popoverStyle}
          role="dialog"
        >
          <HexColorPicker color={value} onChange={onChange} />
          <div className="color-picker-presets">
            {presets.map((c) => (
              <button
                key={c}
                type="button"
                className={`color-picker-preset ${
                  c.toLowerCase() === value.toLowerCase() ? "active" : ""
                }`}
                style={{ background: c }}
                onClick={() => onChange(c)}
                aria-label={c}
              />
            ))}
          </div>
          <div className="color-picker-hex-row">
            <span className="color-picker-hex-label">#</span>
            <input
              type="text"
              value={hexInput.replace(/^#/, "")}
              onChange={(e) => {
                const raw = e.target.value.replace(/[^0-9A-Fa-f]/g, "").slice(0, 6);
                commitHex(`#${raw}`);
              }}
              placeholder="2563eb"
              maxLength={6}
              spellCheck={false}
            />
          </div>
        </div>
      )}
    </span>
  );
}
