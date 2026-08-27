"use client";

import type { LucideIcon } from "lucide-react";
import type { KeyboardEvent } from "react";
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

import { cn } from "@/lib/cn";

import { Icon } from "./icon";
import { IconButton } from "./icon-button";

/**
 * `useLayoutEffect` warns when it runs during server rendering, and this
 * component is server-rendered in its closed state like any client component.
 * The measurement genuinely has to happen before paint - otherwise the panel
 * is visible in the wrong place for a frame - so the hook is aliased rather
 * than downgraded.
 */
const useBeforePaint =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

export type MenuItem = {
  id: string;
  label: string;
  icon?: LucideIcon;
  onSelect: () => void;
  tone?: "default" | "danger";
};

export type MenuProps = {
  /** Accessible name for the trigger. */
  label: string;
  /** Trigger glyph. */
  icon: LucideIcon;
  items: MenuItem[];
};

/**
 * A menu button, to the WAI-ARIA pattern.
 *
 * Items are data rather than children on purpose: the component owns every
 * keyboard and focus rule, instead of hunting a subtree for things that happen
 * to be `menuitem`s and hoping nobody nests one.
 *
 * No portal. `Card` sets no `overflow-hidden`, so absolute positioning inside
 * a `relative` wrapper is not clipped, and it avoids the scroll-tracking a
 * portal would need. The day an overlay has to escape a clipping ancestor is
 * the day to portal - not before.
 */
export function Menu({ label, icon, items }: MenuProps) {
  const id = useId();
  const triggerId = `${id}-trigger`;
  const panelId = `${id}-menu`;

  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [placement, setPlacement] = useState<"below" | "above">("below");
  const [align, setAlign] = useState<"start" | "end">("end");

  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const close = useCallback((returnFocus: boolean) => {
    setOpen(false);
    // Every close path returns focus to the trigger except dismissal by
    // pointer, where the pointer has already decided where focus belongs.
    if (returnFocus) triggerRef.current?.focus();
  }, []);

  const openAt = (index: number) => {
    setActiveIndex(index);
    setOpen(true);
  };

  // Measure, then flip. Vertical is the realistic collision for a menu anchored
  // to a card header; the inline check is direction-aware so the fallback
  // alignment is logical rather than left/right.
  useBeforePaint(() => {
    if (!open) return;
    const panel = panelRef.current;
    const trigger = triggerRef.current;
    if (!panel || !trigger) return;

    const rect = panel.getBoundingClientRect();
    const triggerRect = trigger.getBoundingClientRect();

    setPlacement(
      rect.bottom > window.innerHeight && triggerRect.top > rect.height
        ? "above"
        : "below",
    );

    const rtl = getComputedStyle(panel).direction === "rtl";
    const overflowsInlineStart = rtl
      ? rect.right > window.innerWidth
      : rect.left < 0;
    setAlign(overflowsInlineStart ? "start" : "end");
  }, [open]);

  // Roving focus: the active item is the only focusable thing inside the panel.
  useEffect(() => {
    if (!open) return;
    itemRefs.current[activeIndex]?.focus();
  }, [open, activeIndex]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (panelRef.current?.contains(target)) return;
      if (triggerRef.current?.contains(target)) return;
      close(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open, close]);

  // Enter and Space already fire `click` on a button; handling them here too
  // would open and immediately re-close.
  const onTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      openAt(0);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      openAt(items.length - 1);
    }
  };

  const onPanelKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setActiveIndex((index) => (index + 1) % items.length);
        break;
      case "ArrowUp":
        event.preventDefault();
        setActiveIndex((index) => (index - 1 + items.length) % items.length);
        break;
      case "Home":
        event.preventDefault();
        setActiveIndex(0);
        break;
      case "End":
        event.preventDefault();
        setActiveIndex(items.length - 1);
        break;
      case "Escape":
        event.preventDefault();
        close(true);
        break;
      case "Tab":
        // Not prevented: focus returns to the trigger and Tab then carries on
        // out of it, which is where the user was heading.
        close(true);
        break;
      default:
        break;
    }
  };

  return (
    <span className="relative inline-flex">
      <IconButton
        ref={triggerRef}
        id={triggerId}
        icon={icon}
        label={label}
        size="sm"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => (open ? close(true) : openAt(0))}
        onKeyDown={onTriggerKeyDown}
      />

      {open ? (
        <div
          ref={panelRef}
          id={panelId}
          role="menu"
          aria-labelledby={triggerId}
          onKeyDown={onPanelKeyDown}
          className={cn(
            "absolute z-dropdown min-w-48 animate-menu-in rounded-lg border border-edge bg-overlay p-1",
            placement === "below"
              ? "top-full mt-1 origin-top"
              : "bottom-full mb-1 origin-bottom",
            align === "end" ? "end-0" : "start-0",
          )}
        >
          {items.map((item, index) => (
            <button
              key={item.id}
              ref={(element) => {
                itemRefs.current[index] = element;
              }}
              type="button"
              role="menuitem"
              tabIndex={-1}
              onClick={() => {
                item.onSelect();
                close(true);
              }}
              className={cn(
                "flex w-full cursor-pointer items-center gap-2 rounded-md border-none bg-transparent px-3 py-2 text-sm text-start",
                "transition-colors duration-fast ease-in-out",
                item.tone === "danger"
                  ? "text-danger-text hover:bg-danger-tint"
                  : "text-fg hover:bg-raised",
              )}
            >
              {item.icon ? <Icon icon={item.icon} size={16} /> : null}
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </span>
  );
}
