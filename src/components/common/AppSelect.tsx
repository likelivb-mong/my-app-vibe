import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type AppSelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

type Props = {
  value: string;
  options: AppSelectOption[];
  onChange: (value: string) => void;
  style?: React.CSSProperties;
  menuStyle?: React.CSSProperties;
  optionStyle?: React.CSSProperties;
  disabled?: boolean;
  placeholder?: string;
};

const baseTriggerStyle: React.CSSProperties = {
  width: "100%",
  minHeight: "44px",
  borderRadius: "8px",
  border: "1px solid #444",
  background: "#1a1a1a",
  color: "#fff",
  boxSizing: "border-box",
  padding: "12px 14px",
  fontSize: "18px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  cursor: "pointer",
  textAlign: "left",
};

const baseMenuStyle: React.CSSProperties = {
  position: "absolute",
  top: "calc(100% + 6px)",
  left: 0,
  right: 0,
  background: "#25272b",
  border: "1px solid rgba(255,255,255,0.18)",
  borderRadius: "8px",
  overflow: "hidden",
  zIndex: 3000,
  boxShadow: "0 12px 28px rgba(0,0,0,0.45)",
};

const baseOptionStyle: React.CSSProperties = {
  width: "100%",
  background: "transparent",
  border: "none",
  color: "#fff",
  textAlign: "left",
  padding: "10px 12px",
  fontSize: "18px",
  cursor: "pointer",
  minHeight: "42px",
};

export default function AppSelect({
  value,
  options,
  onChange,
  style,
  menuStyle,
  optionStyle,
  disabled = false,
  placeholder,
}: Props) {
  const MENU_MAX_HEIGHT = 280;
  const PADDING = 6;

  const [open, setOpen] = useState(false);
  const [menuRect, setMenuRect] = useState<{ top?: number; bottom?: number; left: number; width: number; openUp: boolean } | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const { flex, width, minWidth, maxWidth, ...triggerStyle } = style || {};

  const selected = useMemo(
    () => options.find((opt) => opt.value === value),
    [options, value]
  );

  useLayoutEffect(() => {
    if (!open || !wrapRef.current) {
      setMenuRect(null);
      return;
    }
    const el = wrapRef.current;
    const rect = el.getBoundingClientRect();
    const spaceBelow = typeof window !== "undefined" ? window.innerHeight - rect.bottom - PADDING : MENU_MAX_HEIGHT;
    const openUp = spaceBelow < MENU_MAX_HEIGHT && rect.top > spaceBelow;
    setMenuRect({
      ...(openUp ? { bottom: window.innerHeight - rect.top + PADDING } : { top: rect.bottom + PADDING }),
      left: rect.left,
      width: Math.max(rect.width, 120),
      openUp,
    });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (!wrapRef.current) return;
      const targetNode = e.target as Node | null;
      if (!targetNode) return;
      if (wrapRef.current.contains(targetNode)) return;
      const menuEl = document.querySelector("[data-app-select-menu]");
      if (menuEl?.contains(targetNode)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
  }, [open]);

  const menuContent = open && !disabled && menuRect && (
    <div
      data-app-select-menu
      style={{
        ...baseMenuStyle,
        ...menuStyle,
        position: "fixed",
        top: menuRect.openUp ? "auto" : menuRect.top,
        bottom: menuRect.openUp ? menuRect.bottom : "auto",
        left: menuRect.left,
        right: "auto",
        width: menuRect.width,
        minWidth: menuRect.width,
        maxHeight: MENU_MAX_HEIGHT,
        overflowY: "auto",
        zIndex: 99999,
      }}
    >
      {options.map((opt) => {
        const isSelected = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            disabled={opt.disabled}
            onClick={() => {
              if (opt.disabled) return;
              onChange(opt.value);
              setOpen(false);
            }}
            style={{
              ...baseOptionStyle,
              ...(isSelected
                ? { background: "rgba(168, 85, 247, 0.9)", fontWeight: 700 }
                : {}),
              ...(opt.disabled ? { color: "#9ca3af", cursor: "not-allowed" } : {}),
              ...optionStyle,
            }}
          >
            {isSelected ? "✓ " : ""}
            {opt.label}
          </button>
        );
      })}
    </div>
  );

  return (
    <>
      <div
        ref={wrapRef}
        style={{
          position: "relative",
          width: width || "100%",
          flex,
          minWidth,
          maxWidth,
        }}
      >
        <button
          type="button"
          disabled={disabled}
          onClick={() => !disabled && setOpen((v) => !v)}
          style={{
            ...baseTriggerStyle,
            ...(disabled ? { opacity: 0.55, cursor: "not-allowed" } : {}),
            ...triggerStyle,
          }}
        >
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {selected?.label || placeholder || "선택"}
          </span>
          <span style={{ marginLeft: "10px", lineHeight: 1, opacity: 0.9 }}>▾</span>
        </button>
      </div>
      {typeof document !== "undefined" && menuContent ? createPortal(menuContent, document.body) : null}
    </>
  );
}
