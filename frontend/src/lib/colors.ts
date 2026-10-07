// Canonical source of color values is src/app/globals.css.
// Keep this module CSS-token-based to avoid duplicating hex values in TS.
export const colors = {
  brandPrimary: "var(--color-brand-primary)",
  brandSecondary: "var(--color-brand-secondary)",
  brandDark: "var(--color-brand-dark)",
  brandLight: "var(--color-brand-light)",
  brandWhite: "var(--color-brand-white)",
  brandSoft: "var(--color-brand-soft)",
  systemInfo: "var(--color-system-info)",
  systemSuccess: "var(--color-system-success)",
  systemWarning: "var(--color-system-warning)",
  systemDanger: "var(--color-system-danger)",
  data1: "var(--color-data-1)",
  data2: "var(--color-data-2)",
  data3: "var(--color-data-3)",
  data4: "var(--color-data-4)",
  data5: "var(--color-data-5)",
  data6: "var(--color-data-6)",
  data7: "var(--color-data-7)",
  data8: "var(--color-data-8)",
} as const;

export const rgbTokens = {
  brandPrimary: "var(--color-brand-primary-rgb)",
  brandSecondary: "var(--color-brand-secondary-rgb)",
  success: "var(--color-system-success-rgb)",
  warning: "var(--color-system-warning-rgb)",
  danger: "var(--color-system-danger-rgb)",
} as const;

export type ColorKey = keyof typeof colors;
