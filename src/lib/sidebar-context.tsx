"use client";

import { createContext, useContext, useState } from "react";

interface SidebarContextValue {
  open: boolean;
  toggle: () => void;
  close: () => void;
}

const SidebarContext = createContext<SidebarContextValue | null>(null);

/**
 * Shares the nav drawer's open/closed state between the top bar (which owns
 * the hamburger button that toggles it) and the sidebar itself (which owns
 * the overlay panel and its own backdrop/close button) — they're siblings
 * in the layout, not parent/child, so this is a small context rather than
 * lifted local state.
 */
export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  const value: SidebarContextValue = {
    open,
    toggle: () => setOpen((o) => !o),
    close: () => setOpen(false),
  };

  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>;
}

/** Reads the nav drawer's open state and toggle/close handlers. */
export function useSidebar(): SidebarContextValue {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error("useSidebar must be used within a SidebarProvider");
  return ctx;
}
