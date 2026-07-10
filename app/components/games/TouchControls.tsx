"use client";

import { dispatchKey } from "@/app/lib/touch";

type ButtonType = "tap" | "hold";

interface ButtonDef {
  label: string;
  key: string;
  code: string;
  type: ButtonType;
  variant: "dpad" | "action";
}

const CONTROL_MAPS: Record<string, ButtonDef[]> = {
  snake: [
    {
      label: "◄",
      key: "ArrowLeft",
      code: "ArrowLeft",
      type: "tap",
      variant: "dpad",
    },
    {
      label: "▲",
      key: "ArrowUp",
      code: "ArrowUp",
      type: "tap",
      variant: "dpad",
    },
    {
      label: "▼",
      key: "ArrowDown",
      code: "ArrowDown",
      type: "tap",
      variant: "dpad",
    },
    {
      label: "►",
      key: "ArrowRight",
      code: "ArrowRight",
      type: "tap",
      variant: "dpad",
    },
  ],
  tetris: [
    {
      label: "◄",
      key: "ArrowLeft",
      code: "ArrowLeft",
      type: "tap",
      variant: "dpad",
    },
    {
      label: "►",
      key: "ArrowRight",
      code: "ArrowRight",
      type: "tap",
      variant: "dpad",
    },
    {
      label: "▼",
      key: "ArrowDown",
      code: "ArrowDown",
      type: "tap",
      variant: "dpad",
    },
    {
      label: "⟳",
      key: "ArrowUp",
      code: "ArrowUp",
      type: "tap",
      variant: "action",
    },
    { label: "⤓", key: " ", code: "Space", type: "tap", variant: "action" },
  ],
  arkanoid: [
    {
      label: "◄",
      key: "ArrowLeft",
      code: "ArrowLeft",
      type: "hold",
      variant: "dpad",
    },
    {
      label: "►",
      key: "ArrowRight",
      code: "ArrowRight",
      type: "hold",
      variant: "dpad",
    },
  ],
  asteroides: [
    {
      label: "◄",
      key: "ArrowLeft",
      code: "ArrowLeft",
      type: "hold",
      variant: "dpad",
    },
    {
      label: "►",
      key: "ArrowRight",
      code: "ArrowRight",
      type: "hold",
      variant: "dpad",
    },
    {
      label: "THRUST",
      key: "ArrowUp",
      code: "ArrowUp",
      type: "hold",
      variant: "action",
    },
    { label: "FIRE", key: " ", code: "Space", type: "tap", variant: "action" },
  ],
};

interface TouchControlsProps {
  gameId: string;
}

export default function TouchControls({ gameId }: TouchControlsProps) {
  const buttons = CONTROL_MAPS[gameId];
  if (!buttons) return null;

  function handleButton(btn: ButtonDef) {
    if (btn.type === "tap") {
      return {
        onPointerDown: (e: React.PointerEvent) => {
          e.preventDefault();
          dispatchKey("keydown", btn.key, btn.code);
          dispatchKey("keyup", btn.key, btn.code);
        },
      };
    }
    return {
      onPointerDown: (e: React.PointerEvent) => {
        e.preventDefault();
        dispatchKey("keydown", btn.key, btn.code);
      },
      onPointerUp: (e: React.PointerEvent) => {
        e.preventDefault();
        dispatchKey("keyup", btn.key, btn.code);
      },
      onPointerLeave: (e: React.PointerEvent) => {
        e.preventDefault();
        dispatchKey("keyup", btn.key, btn.code);
      },
      onPointerCancel: (e: React.PointerEvent) => {
        e.preventDefault();
        dispatchKey("keyup", btn.key, btn.code);
      },
    };
  }

  return (
    <div className="touch-controls">
      <div className="touch-pad">
        {buttons.map((btn) => (
          <button
            key={btn.label}
            type="button"
            className={`touch-btn touch-btn-${btn.variant}`}
            style={{ touchAction: "none" }}
            {...handleButton(btn)}
          >
            {btn.label}
          </button>
        ))}
      </div>
    </div>
  );
}
