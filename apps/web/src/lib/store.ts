"use client";
import { create } from "zustand";
type UI = {
  section: string;
  setSection: (s: string) => void;
  mobileOpen: boolean;
  setMobileOpen: (v: boolean) => void;
};
export const useUI = create<UI>((set) => ({
  section: "Overview",
  setSection: (section) => set({ section, mobileOpen: false }),
  mobileOpen: false,
  setMobileOpen: (mobileOpen) => set({ mobileOpen }),
}));
