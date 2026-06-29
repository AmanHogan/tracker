import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

export function getMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export const CATEGORIES = [
  "Rent",
  "Groceries",
  "Dining & Drinks",
  "Car",
  "Subscriptions",
  "Household",
  "Utilities",
  "Medical",
  "Entertainment",
  "Shopping",
  "Personal Care",
  "Other",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const FIDELITY_CATEGORY_MAP: Record<string, Category> = {
  Rent: "Rent",
  Groceries: "Groceries",
  "Restaurants, convenience & coffee": "Dining & Drinks",
  "Alcoholic beverages": "Dining & Drinks",
  "Gas, fuel, & charging": "Car",
  "Concerts, sports, events & attractions": "Entertainment",
  "Movies, music, books & games": "Entertainment",
  "General merchandise": "Shopping",
  "Electronics & software": "Shopping",
  "Children's clothing, supplies & toys": "Shopping",
  "Gym & sports equipment": "Personal Care",
  "Doctors & hospitals": "Medical",
  Pharmacy: "Medical",
  "Professional (legal, accounting & services)": "Other",
};
