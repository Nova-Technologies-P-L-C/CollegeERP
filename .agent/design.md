# Design System

This document is the single source of truth for the application's UI and styling rules. It uses Tailwind CSS conventions mapped to specific brand tokens.

## 1. Typography

All text uses the `Roboto` font family.

**Global Baseline:**
* Body text: 14px (Regular)

### Display Headings
Used for hero sections, large banners, and high-impact areas.
* **Display 1:** 40px (`text-display-1`)
* **Display 2:** 32px (`text-display-2`)
* **Display 3:** 24px (`text-display-3`)
* **Display 4:** 20px (`text-display-4`)
* **Display 5:** 18px (`text-display-5`)
* **Display 6:** 16px (`text-display-6`)

### Content Headings
Used for page hierarchy and standard section titles.
* **H1:** 28px (`text-h1`)
* **H2:** 24px (`text-h2`)
* **H3:** 20px (`text-h3`)
* **H4:** 18px (`text-h4`)
* **H5:** 16px (`text-h5`)
* **H6:** 15px (`text-h6`)

---

## 2. Color Palette

### Brand Colors
Used for the core identity, backgrounds, and primary actions.
* **Primary:** `#3D5EE1` (`bg-brand-primary`, `text-brand-primary`)
* **Secondary:** `#6FCCD8` (`bg-brand-secondary`, `text-brand-secondary`)
* **Dark:** `#131022` (`bg-brand-dark`, `text-brand-dark`) - Default text color
* **Light:** `#E9EDF4` (`bg-brand-light`, `text-brand-light`) - Default background color
* **White:** `#FFFFFF` (`bg-brand-white`, `text-brand-white`)

### System Colors
Used strictly for feedback, alerts, and status indicators.
* **Info:** `#0F65CD` (`bg-system-info`)
* **Success:** `#1ABE17` (`bg-system-success`)
* **Warning:** `#EAB300` (`bg-system-warning`)
* **Danger:** `#E82646` (`bg-system-danger`)
* **Sky Blue:** `#05C3FB` (`bg-system-skyblue`)
* **Stroke Card:** `#FFFFFF` (`border-system-strokecard`)

---

## 3. Spacing & Layout

We strictly follow an 8-point grid system using standard Tailwind spacing units. Avoid magic numbers in padding or margins.

* **Micro:** 4px (`p-1`, `m-1`, `gap-1`)
* **Small:** 8px (`p-2`, `m-2`, `gap-2`)
* **Base:** 16px (`p-4`, `m-4`, `gap-4`)
* **Medium:** 24px (`p-6`, `m-6`, `gap-6`)
* **Large:** 32px (`p-8`, `m-8`, `gap-8`)
* **Extra Large:** 48px (`p-12`, `m-12`, `gap-12`)

---

## 4. Component Guidelines

When generating UI components, adhere to these standard practices based on the color palette. Note: There is NO mobile app component logic needed, this applies exclusively to web browser rendering.

### Data Visualization
* **ShadCN Charts:** All analytic dashboards, attendance graphs, and KPI metric visualisers must utilize `ShadCN Charts` (which wraps Recharts). Do not use Chart.js. Use the defined brand semantics (Primary and Secondary colors) inside the chart configurations.

### Buttons
* **Primary Button:** Background `bg-brand-primary`, text `text-brand-white`. Hover state should reduce opacity slightly (`hover:opacity-90`).
* **Secondary Button:** Background `bg-brand-secondary`, text `text-brand-dark`. 
* **Destructive Button:** Background `bg-system-danger`, text `text-brand-white`.
* **Radius:** Use `rounded-md` (standard Tailwind 6px) for all buttons.

### Cards & Containers
* **Background:** Use `bg-brand-white` for content cards sitting on top of the default `bg-brand-light` app background.
* **Border:** Use the Stroke Card color (`border-system-strokecard`) if a visible boundary is needed.
* **Radius:** Use `rounded-lg` (8px) or `rounded-xl` (12px) for structural cards.
* **Shadow:** Keep elevations subtle. Use Tailwind's default `shadow-sm` or `shadow` for standard cards.

### Forms & Inputs
* **Background:** `bg-brand-white`.
* **Borders:** Subtle gray borders by default. On focus, shift the border color to `focus:border-brand-primary` and add `focus:ring-brand-primary`.
* **Text:** Input text should be `text-brand-dark`. Placeholder text should be a muted gray.
* **Validation:** Use `text-system-danger` for error messages below inputs and `border-system-danger` for invalid input states.

---

## 5. Tailwind Configuration

**Crucial Setup Note:** The application uses Tailwind CSS v4 token configuration via `src/app/globals.css`. 
1. The font `Roboto` is injected via a CSS variable (`--font-roboto`) and mapped to `font-sans`.
2. Custom color/theme tokens are declared in the `@theme` block in `src/app/globals.css` and consumed via utility classes.
3. Do not hardcode hex values in the JSX/TSX files. Always use the predefined utility classes (e.g., use `text-brand-primary`, not `text-[#3D5EE1]`).

---

## 6. Animation, Interaction & Iconography

* **Icons:** Use `lucide-react` exclusively for iconography. Icons should maintain a consistent stroke weight and scale proportionately with surrounding typography.
* **Animation (`framer-motion`):** We use `framer-motion` to achieve our premium "dark glassmorphism" aesthetic and interactive feel.
  * Structural page transitions should utilize `initial={{ opacity: 0, y: 20 }}` and `animate={{ opacity: 1, y: 0 }}`.
  * List items (like dashboard feeds) should employ staggered entrance animations with layout transitions (`AnimatePresence mode="popLayout"`).
  * Hover states should be responsive, utilizing scale effects and subtle opacity shifts to give an organic, high-end feel without being distracting.