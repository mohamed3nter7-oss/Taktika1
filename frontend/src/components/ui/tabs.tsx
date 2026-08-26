"use client";

import type { KeyboardEvent } from "react";
import { useRef } from "react";

import { cn } from "@/lib/cn";

export type TabItem = {
  value: string;
  label: string;
  /** Rendered in tabular figures beside the label. Omit for no count. */
  count?: number;
};

export const tabId = (prefix: string, value: string) => `${prefix}-tab-${value}`;
export const panelId = (prefix: string, value: string) =>
  `${prefix}-panel-${value}`;

export type TabsProps = {
  tabs: TabItem[];
  value: string;
  onChange: (value: string) => void;
  /** Accessible name for the tablist. */
  label: string;
  /** Shared with the panels so `aria-controls` and `aria-labelledby` line up. */
  idPrefix: string;
};

/**
 * Roving-tabindex tablist with a 2px accent underline on the active tab.
 *
 * Arrow keys follow the reading direction rather than the physical one. The
 * design system's own implementation maps ArrowRight to "next" unconditionally,
 * which moves focus backwards through a mirrored Arabic layout.
 */
export function Tabs({ tabs, value, onChange, label, idPrefix }: TabsProps) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const index = Math.max(
    0,
    tabs.findIndex((tab) => tab.value === value),
  );

  const move = (next: number) => {
    const tab = tabs[next];
    if (!tab) return;
    onChange(tab.value);
    refs.current[next]?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const rtl = getComputedStyle(event.currentTarget).direction === "rtl";
    const forward = rtl ? "ArrowLeft" : "ArrowRight";
    const backward = rtl ? "ArrowRight" : "ArrowLeft";

    if (event.key === forward) {
      event.preventDefault();
      move((index + 1) % tabs.length);
    } else if (event.key === backward) {
      event.preventDefault();
      move((index - 1 + tabs.length) % tabs.length);
    } else if (event.key === "Home") {
      event.preventDefault();
      move(0);
    } else if (event.key === "End") {
      event.preventDefault();
      move(tabs.length - 1);
    }
  };

  return (
    <div
      role="tablist"
      aria-label={label}
      onKeyDown={onKeyDown}
      className="flex gap-6 border-b border-edge"
    >
      {tabs.map((tab, i) => {
        const active = i === index;
        return (
          <button
            key={tab.value}
            ref={(element) => {
              refs.current[i] = element;
            }}
            id={tabId(idPrefix, tab.value)}
            role="tab"
            type="button"
            aria-selected={active}
            aria-controls={panelId(idPrefix, tab.value)}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(tab.value)}
            className={cn(
              "-mb-px cursor-pointer border-b-2 bg-transparent py-3 text-body whitespace-nowrap",
              "transition-colors duration-fast ease-in-out",
              active
                ? "border-accent font-medium text-fg"
                : "border-transparent font-regular text-fg-secondary hover:text-fg",
            )}
          >
            {tab.label}
            {typeof tab.count === "number" ? (
              <span className="ms-1.5 font-numeric tabular-nums text-fg-muted">
                {tab.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
