"use client";

import { createContext, useContext, useId, useState, type ReactNode } from "react";

import { Tabs, panelId, tabId, type TabItem } from "@/components/ui/tabs";

const GoToTabContext = createContext<((value: string) => void) | null>(null);

/**
 * Lets a panel move the user to a sibling tab - the empty posts state points a
 * visitor at the one tab that does have content.
 *
 * Context rather than a prop because the panels are rendered on the server and
 * handed in as slots; a server component cannot be passed a function.
 */
export function useGoToTab(): (value: string) => void {
  const goToTab = useContext(GoToTabContext);
  if (!goToTab) {
    throw new Error("useGoToTab must be used inside ProfileTabs");
  }
  return goToTab;
}

export type ProfileTabsProps = {
  tabs: TabItem[];
  /** Panel content keyed by tab value. Server-rendered and passed as slots. */
  panels: Record<string, ReactNode>;
  defaultValue: string;
  label: string;
};

/**
 * Where `use client` stops.
 *
 * The tablist owns the selected tab, but the panels arrive already rendered on
 * the server, so the About and Career surfaces never ship to the browser. All
 * three are in the DOM at once and toggled with `hidden`, which also makes
 * arrow-key switching instant.
 */
export function ProfileTabs({
  tabs,
  panels,
  defaultValue,
  label,
}: ProfileTabsProps) {
  const idPrefix = useId();
  const [value, setValue] = useState(defaultValue);

  return (
    <GoToTabContext.Provider value={setValue}>
      <div className="grid gap-4">
        <Tabs
          tabs={tabs}
          value={value}
          onChange={setValue}
          label={label}
          idPrefix={idPrefix}
        />
        {tabs.map((tab) => (
          <div
            key={tab.value}
            role="tabpanel"
            id={panelId(idPrefix, tab.value)}
            aria-labelledby={tabId(idPrefix, tab.value)}
            hidden={tab.value !== value}
            tabIndex={0}
          >
            {panels[tab.value]}
          </div>
        ))}
      </div>
    </GoToTabContext.Provider>
  );
}
