---
name: Industrial Grid
colors:
  surface: '#111317'
  surface-dim: '#111317'
  surface-bright: '#37393e'
  surface-container-lowest: '#0c0e12'
  surface-container-low: '#1a1c20'
  surface-container: '#1e2024'
  surface-container-high: '#282a2e'
  surface-container-highest: '#333539'
  on-surface: '#e2e2e8'
  on-surface-variant: '#bac9cc'
  inverse-surface: '#e2e2e8'
  inverse-on-surface: '#2f3035'
  outline: '#849396'
  outline-variant: '#3b494c'
  surface-tint: '#00daf3'
  primary: '#c3f5ff'
  on-primary: '#00363d'
  primary-container: '#00e5ff'
  on-primary-container: '#00626e'
  inverse-primary: '#006875'
  secondary: '#ffd799'
  on-secondary: '#432c00'
  secondary-container: '#feb300'
  on-secondary-container: '#6a4800'
  tertiary: '#e3eeff'
  on-tertiary: '#233143'
  tertiary-container: '#c3d2e8'
  on-tertiary-container: '#4c5a6d'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#9cf0ff'
  primary-fixed-dim: '#00daf3'
  on-primary-fixed: '#001f24'
  on-primary-fixed-variant: '#004f58'
  secondary-fixed: '#ffdeac'
  secondary-fixed-dim: '#ffba38'
  on-secondary-fixed: '#281900'
  on-secondary-fixed-variant: '#604100'
  tertiary-fixed: '#d4e4fa'
  tertiary-fixed-dim: '#b9c8de'
  on-tertiary-fixed: '#0d1c2d'
  on-tertiary-fixed-variant: '#39485a'
  background: '#111317'
  on-background: '#e2e2e8'
  surface-variant: '#333539'
typography:
  display-lg:
    fontFamily: Barlow Condensed
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: 0.05em
  headline-md:
    fontFamily: Barlow Condensed
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: 0.02em
  body-base:
    fontFamily: Hanken Grotesk
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  data-tabular:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '500'
    lineHeight: '1.4'
  label-xs:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '700'
    lineHeight: '1'
    letterSpacing: 0.1em
spacing:
  grid-unit: 4px
  gutter: 12px
  margin-edge: 24px
  stack-tight: 4px
  stack-default: 16px
---

## Brand & Style
This design system is engineered for large-scale institutional management, prioritizing high-density information architecture and rugged technical reliability. The aesthetic draws from industrial control panels and aerospace telemetry systems, utilizing a "Rugged Technical" style. 

The personality is authoritative, precise, and utilitarian. It aims to evoke a sense of absolute control over vast, complex data environments. Visual complexity is embraced as a means of efficiency, using heavy structural lines, monospaced data readouts, and a strict adherence to a logic-driven grid.

## Colors
The palette is built upon a foundation of deep charcoal and obsidian surfaces to minimize eye strain during long-duration monitoring. 

- **Primary (Cyan):** Used for active states, data selection, and "Go" signals. It provides a sharp, high-contrast focal point against the dark background.
- **Secondary (Amber):** Reserved for warnings, status alerts, and high-priority indicators. 
- **Neutral (Metallic/Charcoal):** A range of greys from `#0F1115` (Base) to `#334155` (Borders) create the structural framework.
- **Surface Accents:** Low-opacity metallic tints are used to differentiate container depths without relying on shadows.

## Typography
Typography is treated as a functional component. 

- **Headlines:** Use **Barlow Condensed** in bold, uppercase formats to mimic industrial signage and stamped metal plates.
- **Interface Text:** **Hanken Grotesk** provides a clean, neutral sans-serif for general reading and interface labels.
- **Technical Data:** **JetBrains Mono** is the standard for all numerical values, timestamps, and system IDs, ensuring perfect vertical alignment in dense tables and schematics.

## Layout & Spacing
The layout utilizes a 12-column **Fixed Grid** for internal modules within an expansive, fluid-width viewport. 

- **Density:** Spacing is tight (4px increments) to maximize information density. 
- **Grid Alignment:** Every element must snap to the 4px baseline. No "soft" floating elements are permitted.
- **Breakpoints:**
  - **Desktop (1440px+):** Full multi-pane dashboard layout.
  - **Tablet (768px-1439px):** Collapsed sidebars, vertical stack of primary modules.
  - **Mobile:** Not prioritized, but follows a single-column strict stack with 12px horizontal margins.

## Elevation & Depth
In this design system, depth is conveyed through **Bold Borders** and **Tonal Layering** rather than shadows. 

- **Structural Outlines:** Containers use a 1px or 2px solid border (`#334155`). 
- **Active State:** Elements gain a "glow" effect via a thin Primary Cyan border and a subtle 0.1 opacity inner fill.
- **Z-Index:** Higher-level elements (modals, dropdowns) use a slightly lighter background surface (`#1E293B`) to physically separate them from the base layer.
- **Schematic Lines:** Use thin, dashed lines to connect related data points or to indicate flow in management diagrams.

## Shapes
The shape language is strictly **Sharp (0px)**. 

Curves are perceived as decorative and inefficient in this industrial context. Every button, input, and container features hard 90-degree corners. Angular "clipped" corners (45-degree chamfers) may be used for status badges or primary action buttons to reinforce the rugged, mechanical feel.

## Components
- **Buttons:** Rectangular with 2px borders. Primary buttons use a solid Cyan background with black text. Secondary buttons are "ghost" style with Cyan borders and text.
- **Inputs:** Darker than the background surface, with a constant 1px grey border that turns Cyan on focus. Include a "Data Label" in monospaced uppercase above the field.
- **Chips/Status:** Small, sharp blocks. "Online" uses Cyan; "Warning" uses Amber; "Critical" uses a high-contrast Red. All use monospaced text.
- **Cards/Modules:** Defined by heavy top-borders (4px) and sub-headers that include a "Serial Number" or "Module ID" in the top right corner.
- **Data Grids:** High-density rows with zebra-striping. Hover states should highlight the entire row with a subtle Cyan tint.
- **Schematic Indicators:** Custom icons built on a 2px stroke weight, strictly geometric and non-organic.