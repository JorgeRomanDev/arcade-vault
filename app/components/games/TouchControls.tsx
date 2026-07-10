"use client";

import { useState } from "react";
import { dispatchKey } from "@/app/lib/touch";

type ButtonRole = "up" | "down" | "left" | "right" | "a" | "b";
type ButtonType = "tap" | "hold";

interface ButtonDef {
  role: ButtonRole;
  key: string;
  code: string;
  type: ButtonType;
}

const CONTROL_MAPS: Record<string, ButtonDef[]> = {
  snake: [
    { role: "up", key: "ArrowUp", code: "ArrowUp", type: "tap" },
    { role: "down", key: "ArrowDown", code: "ArrowDown", type: "tap" },
    { role: "left", key: "ArrowLeft", code: "ArrowLeft", type: "tap" },
    { role: "right", key: "ArrowRight", code: "ArrowRight", type: "tap" },
  ],
  arkanoid: [
    { role: "left", key: "ArrowLeft", code: "ArrowLeft", type: "hold" },
    { role: "right", key: "ArrowRight", code: "ArrowRight", type: "hold" },
  ],
  asteroides: [
    { role: "up", key: "ArrowUp", code: "ArrowUp", type: "hold" },
    { role: "left", key: "ArrowLeft", code: "ArrowLeft", type: "hold" },
    { role: "right", key: "ArrowRight", code: "ArrowRight", type: "hold" },
    { role: "a", key: " ", code: "Space", type: "tap" },
  ],
  tetris: [
    { role: "left", key: "ArrowLeft", code: "ArrowLeft", type: "tap" },
    { role: "right", key: "ArrowRight", code: "ArrowRight", type: "tap" },
    { role: "down", key: "ArrowDown", code: "ArrowDown", type: "tap" },
    { role: "a", key: "ArrowUp", code: "ArrowUp", type: "tap" },
    { role: "b", key: " ", code: "Space", type: "tap" },
  ],
};

const DPAD_ROLES: ("up" | "down" | "left" | "right")[] = [
  "up",
  "down",
  "left",
  "right",
];
const ACTION_ROLES: ("b" | "a")[] = ["b", "a"];

const DPAD_ARROW_PATH: Record<"up" | "down" | "left" | "right", string> = {
  up: "M12 4 L20 16 L4 16 Z",
  right: "M8 4 L20 12 L8 20 Z",
  down: "M4 8 L20 8 L12 20 Z",
  left: "M16 4 L16 20 L4 12 Z",
};

interface TouchControlsProps {
  gameId: string;
}

export default function TouchControls({ gameId }: TouchControlsProps) {
  const [pressed, setPressed] = useState<Set<ButtonRole>>(new Set());
  const buttons = CONTROL_MAPS[gameId];
  if (!buttons) return null;

  const byRole = new Map(buttons.map((b) => [b.role, b]));
  const dpadRoles = DPAD_ROLES.filter((role) => byRole.has(role));
  const actionRoles = ACTION_ROLES.filter((role) => byRole.has(role));
  if (dpadRoles.length === 0 && actionRoles.length === 0) return null;

  function press(role: ButtonRole) {
    setPressed((prev) => new Set(prev).add(role));
  }

  function release(role: ButtonRole) {
    setPressed((prev) => {
      const next = new Set(prev);
      next.delete(role);
      return next;
    });
  }

  function handlersFor(btn: ButtonDef) {
    if (btn.type === "tap") {
      return {
        onPointerDown: (e: React.PointerEvent) => {
          e.preventDefault();
          press(btn.role);
          dispatchKey("keydown", btn.key, btn.code);
          dispatchKey("keyup", btn.key, btn.code);
        },
        onPointerUp: () => release(btn.role),
        onPointerLeave: () => release(btn.role),
        onPointerCancel: () => release(btn.role),
      };
    }
    return {
      onPointerDown: (e: React.PointerEvent) => {
        e.preventDefault();
        press(btn.role);
        dispatchKey("keydown", btn.key, btn.code);
      },
      onPointerUp: (e: React.PointerEvent) => {
        e.preventDefault();
        release(btn.role);
        dispatchKey("keyup", btn.key, btn.code);
      },
      onPointerLeave: (e: React.PointerEvent) => {
        e.preventDefault();
        release(btn.role);
        dispatchKey("keyup", btn.key, btn.code);
      },
      onPointerCancel: (e: React.PointerEvent) => {
        e.preventDefault();
        release(btn.role);
        dispatchKey("keyup", btn.key, btn.code);
      },
    };
  }

  return (
    <div className="touch-gp" role="group" aria-label="Gamepad">
      <div className="touch-gp-body">
        {dpadRoles.length > 0 && (
          <div className="touch-gp-col touch-gp-col-left">
            <div className="touch-gp-dpad" aria-label="D-pad">
              {dpadRoles.map((role) => {
                const btn = byRole.get(role);
                if (!btn) return null;
                return (
                  <button
                    key={role}
                    type="button"
                    className={`touch-dp touch-dp-${role}${pressed.has(role) ? " on" : ""}`}
                    style={{ touchAction: "none" }}
                    aria-label={role}
                    {...handlersFor(btn)}
                  >
                    <svg className="touch-dp-arrow" viewBox="0 0 24 24">
                      <path d={DPAD_ARROW_PATH[role]} fill="currentColor" />
                    </svg>
                  </button>
                );
              })}
              <div className="touch-dp-hub" aria-hidden="true">
                <span className="touch-dp-hub-gem" />
              </div>
            </div>
          </div>
        )}
        {actionRoles.length > 0 && (
          <div className="touch-gp-col touch-gp-col-right">
            <div className="touch-gp-actions">
              {actionRoles.map((role) => {
                const btn = byRole.get(role);
                if (!btn) return null;
                const label = role.toUpperCase();
                return (
                  <button
                    key={role}
                    type="button"
                    className={`touch-ab touch-ab-${role}${pressed.has(role) ? " on" : ""}`}
                    style={{ touchAction: "none" }}
                    aria-label={label}
                    {...handlersFor(btn)}
                  >
                    <span className="touch-ab-ring" />
                    <span className="touch-ab-letter">{label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
