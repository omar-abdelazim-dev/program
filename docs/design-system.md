# Program Design System & UI Specification

This document is the single source of truth for the Program platform's visual design, UI architecture, and component library. It exactly reflects the current codebase implementation and serves as the official reference for all future development.

## 1. Design Philosophy

The Program platform employs a deeply immersive **Glassmorphism** visual language. The design philosophy centers on:
- **Depth and Layering**: Using semi-transparent backgrounds with deep background blurs to create a sense of physical layers and depth, allowing colorful underlying gradients to bleed through softly.
- **Role-Based Immersion**: The UI adapts its primary accent colors, border glows, and hover states depending on the active user role (Student = Slate, Instructor = Orange, Admin = Purple, Super Admin = Red), ensuring contextual awareness without layout shifts.
- **Dynamic Interactions**: The interface feels alive. Hover states trigger subtle structural lifts (`translateY(-2px)` or `-3px`), enhanced border opacity, and expanded glow shadows (`box-shadow` transitions).
- **Dark-Mode First**: The application is natively designed for dark mode, using deep outer space grays (`#0f1117`, `#1a1c28`) that allow colorful accents and glass elements to pop. Light mode is a high-contrast, heavily softened inversion.
- **Consistency**: Relies entirely on vanilla CSS variables (no Tailwind classes) structured in `index.css` (globals) and `content.css` (components).

---

## 2. Color System

The application relies heavily on CSS variables to manage its color tokens. All values are extracted from `index.css` and `content.css`.

### Global Color Variables (`index.css`)

| Variable | Light Mode | Dark Mode | Usage |
| :--- | :--- | :--- | :--- |
| `--text` | `#4b5563` | `#9ca3af` | Primary body text |
| `--text-h` | `#111827` | `#f3f4f6` | Headings (h1, h2, h3) and prominent text |
| `--bg` | `#f9fafb` | `#16171d` | Base page background outside of content areas |
| `--border` | `#e5e7eb` | `#2e303a` | Default solid borders and dividers |
| `--code-bg` | `#f3f4f6` | `#1f2028` | Background for monospace text |
| `--c-sub` | `#64748b` | `#9ca3af` | Subdued, secondary text (captions, labels) |

### Accent Colors (Shared across themes)
- `--c-orange`: `#f97316` (Used heavily in instructor roles, primary gradients)
- `--c-yellow`: `#facc15` (Used in primary gradients `linear-gradient(135deg, var(--c-orange), var(--c-yellow))`)
- `--c-purple`: `#8b5cf6` (Used in admin roles, marketplace category tags)
- `--c-pink`: `#ec4899`
- `--c-blue`: `#3b82f6`
- `--c-red`: `#ef4444` (Used for errors, destructive actions, super admin role)

### Component Color Tokens (`content.css`)

| Variable | Light Mode | Dark Mode | Usage |
| :--- | :--- | :--- | :--- |
| `--c-bg` | `#e5e7eb` | `#0f1117` | Deepest background for main content wrapping |
| `--c-card` | `rgba(255, 255, 255, 0.7)`| `#1a1c28` | Solid fallback for cards, often overridden by glass |
| `--c-light` | `#1f2937` | `#F9FAFB` | High-contrast text on top of glass elements |
| `--c-input-bg` | `rgba(0, 0, 0, 0.03)` | `rgba(255, 255, 255, 0.03)` | Base background for text inputs and textareas |
| `--c-bg-subtle` | `rgba(0, 0, 0, 0.02)` | `rgba(255, 255, 255, 0.02)` | Extremely subtle table row or list item backgrounds |
| `--c-bg-hover` | `rgba(0, 0, 0, 0.05)` | `rgba(255, 255, 255, 0.1)` | Hover state background for list items and table rows |

### Glow Colors
- `--c-glow` (Dark/Light): `-10px 0 25px rgba(249, 115, 22, 0.3), 10px 0 25px rgba(250, 204, 21, 0.3)`
- Defines the signature split-color horizontal glow used on primary buttons and active states.

---

## 3. Theme System

The application supports robust Dark and Light modes.
- **Default Theme**: Dark Mode.
- **Implementation**: Theme state is managed in React (`App.jsx`), persisted in `localStorage('isLightMode')`, and applied via the `body.light-mode` CSS class.
- **Inheritance**: The `.light-mode` class redefines CSS variables at the `:root` equivalent level, instantly cascading color changes without modifying component classes.
- **Overrides**: Certain glassmorphism properties are hardcoded specifically for `.light-mode` to ensure legibility (e.g., border opacities increase to `0.5`, card backgrounds shift to `rgba(229, 231, 235, 0.6)`).

---

## 4. Typography

- **Font Family**: Natively relies on system fonts via `--sans: system-ui, 'Segoe UI', Roboto, sans-serif;`
- **Headings**: `--heading: system-ui, 'Segoe UI', Roboto, sans-serif;`
- **Monospace**: `--mono: ui-monospace, Consolas, monospace;`
- **Base Size**: `18px` with `145%` line height (`font: 18px/145% var(--sans);`).
- **Responsive Scaling**: At `<= 1024px`, the base font size drops to `16px`.
- **Letter Spacing**: Default `0.18px`.
- **H1**: `56px`, `letter-spacing: -1.68px`, weight `500`. Scales to `36px` on mobile.
- **H2**: `24px`, `letter-spacing: -0.24px`, weight `500`. Scales to `20px` on mobile.
- **H3**: Commonly `1.15rem` or `1.2rem` inside cards.
- **Labels/Captions**: Usually `0.85rem` or `0.9rem` with `var(--c-sub)` color.

---

## 5. Spacing System

- **Main Content**: `padding: 140px 32px 40px 32px;` to safely clear the fixed `TopNav`.
- **Max Width**: `max-width: 1400px;` applied to the main layout (`.content`).
- **Grid Gaps**: Standard gaps are `24px` for layouts and `16px` for component interiors.
- **Card Padding**: Typically `24px` or `20px` internally.
- **Button Padding**: `.glass-btn` uses `14px 24px` (large) or `10px 24px` (standard).

---

## 6. Border Radius

- **Glass Cards**: `16px` (`border-radius: 16px;`)
- **Buttons (`.glass-btn`)**: `20px` (Pill-shaped)
- **Role Badges**: `999px` (Fully rounded)
- **Inputs & Search Bars**: `12px` or `8px`
- **Thumbnails**: `12px` (`.dash-thumb`), `16px 16px 0 0` (Marketplace `.cc-card` thumbnails)
- **Three-Dot Menu Dropdowns**: `12px` or `8px`

---

## 7. Border System

Program relies extensively on directional and translucent borders to simulate physical glass edges capturing light.
- **Top Edge Highlight**: `--c-border-top: 1px solid rgba(255, 255, 255, 0.15);`
- **Left Edge Highlight**: `--c-border-left: 1px solid rgba(255, 255, 255, 0.15);`
- **General Glass Border**: `--c-border: 1px solid rgba(255, 255, 255, 0.05);` (Dark) / `rgba(0, 0, 0, 0.1)` (Light)
- **Subtle Dividers**: `1px solid var(--c-border-subtle)` (`rgba(255, 255, 255, 0.05)`)
- **Focus Borders**: `1px solid rgba(255, 255, 255, 0.4)` (inputs)

Every `.glass-card` implements:
```css
border: var(--c-border);
border-top: 1px solid rgba(255, 255, 255, 0.15);
border-left: 1px solid rgba(255, 255, 255, 0.15);
```

---

## 8. Shadow System

- **Global Variable**: `--shadow: 0 4px 25px rgba(251, 146, 60, 0.15), 0 8px 10px rgba(251, 146, 60, 0.05);` (An ambient, warm orange-tinted drop shadow).
- **Light Mode Shadow**: `0 12px 40px rgba(0, 0, 0, 0.08)` for cards.
- **Button Glow**: `--c-glow` (described in colors) triggers on `.glass-btn:hover`.
- **Role Glows**: `var(--role-glow)` applies contextual shadows on hover (e.g. `0 10px 24px rgba(139, 92, 246, 0.18)` for Admin/Purple).
- **Input Shadow**: `inset 0 2px 4px rgba(0, 0, 0, 0.2)`
- **Pill / Badge Depth**: `box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.12), 0 8px 20px rgba(0, 0, 0, 0.14);` creates a tactile, physical button feel.

---

## 9. Blur System

- **Glass Cards**: `backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);`
- **Marketplace Cards (`.cc-card`)**: `backdrop-filter: blur(16px);`
- **TopNav**: `backdrop-filter: blur(16px);`
- **Role Badges**: `backdrop-filter: blur(10px);`
- **Modals/Overlays**: High blur values `blur(20px)` on modal backgrounds.

---

## 10. Animation System

- **`.animate-entrance`**: Global entrance animation. `animation: fadeSlideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;` with `opacity: 0` initially. Staggered via inline `animationDelay` (e.g. `0.1s`, `0.2s`).
- **`.hover-glow:hover`**: Universal hover interaction. `transform: translateY(-2px); transition: all 0.3s;`
- **`.glass-btn:hover`**: `transform: translateY(-3px) scale(1.02);`
- **`.glass-btn:active`**: `transform: scale(0.95);` (or `scale(0.85)` for `.auth-submit-btn`)
- **Keyframes**:
  ```css
  @keyframes fadeSlideUp {
      from { opacity: 0; transform: translateY(30px); }
      to { opacity: 1; transform: translateY(0); }
  }
  @keyframes spin {
      100% { transform: rotate(360deg); }
  }
  ```

---

## 11. Layout System

- **Top Navigation**: Fixed at top, highly blurred, absolute z-index.
- **Main Container**: Centered column, max `1400px`, substantial padding.
- **Portal Layouts**: `LearningPortal` uses a 100vh layout with a top header, left video pane (`flex: 1`), and right sliding sidebar (`400px` fixed). `AdminPortal` uses a fixed left sidebar (`280px`) and right content area.
- **Breakpoints**: Extensively documented in section 19.

---

## 12. Grid System

- **`.stats-grid`**: `grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 24px;`
- **`.dashboard-grid`**: Used for dashboard sections, vertically stacking `flex` elements or utilizing `grid`.
- **Marketplace Grid (`.cc-grid`)**: Auto-scaling grid.
  - Desktop: `repeat(4, 1fr)`
  - Laptop: `repeat(3, 1fr)`
  - Tablet: `repeat(2, 1fr)`
  - Mobile: `1fr`

---

## 13. Components

### `.glass-card`
- **Purpose**: Foundational surface for all content blocks.
- **Variants**: `.hover-glow` (adds interactive hover state).

### `.glass-btn`
- **Purpose**: Primary call to action.
- **Appearance**: Orange/Yellow linear gradient background, high padding, fully rounded. Lift and glow on hover.

### `CourseCard` (Marketplace) / `.cc-card`
- **Purpose**: Display courses in ExploreTab.
- **Layout**: Flex column. Thumb > Instructor Row > Title > Rating/Price > Category Tag.
- **Specifics**: Features specific `cc-logo-box` for Program integration.

### `DashboardTab Cards` (`InProgressCard`, `CompletedCard`)
- **Purpose**: Display student progress.
- **Layout**: Horizontal split layout (`.dash-card`, `.dash-card-left`, `.dash-card-right`).
- **Variants**: `.completed-variant` adds a thick green left border (`border-left: 4px solid #10B981`) and checkmark.

### `ThreeDotMenu`
- **Purpose**: Contextual actions.
- **Appearance**: Trigger is a transparent button (`⋮`). Dropdown is an absolute positioned `.glass-card` with vertical `.dropdown-item` buttons.

---

## 14. Iconography

- **Library**: Inline SVG icons (Feather icons / Heroicons aesthetic).
- **Stroke**: Standard `strokeWidth="2"` or `"2.5"`.
- **Colors**: `currentColor` inherited from text, or explicitly styled (e.g., `#10B981` for success, `#F59E0B` for resources).

---

## 15. Images

- **`.dash-thumb` / Course Thumbnails**: `object-fit: cover` or applied as `backgroundImage` with `background-size: cover; background-position: center;`.
- **Aspect Ratio**: 16:9 for course thumbnails.
- **Avatars**: Circular (`border-radius: 50%`), small size (usually `24px` or `32px`).

---

## 16. Forms

- **`.auth-input` / Form Inputs**:
  - `background: var(--c-input-bg)`
  - `border: 1px solid var(--c-border-medium)`
  - `padding: 14px 16px`
  - `border-radius: 12px`
- **Focus State**: `border-color: rgba(255, 255, 255, 0.4); background: rgba(255, 255, 255, 0.06); outline: none; box-shadow: 0 0 0 4px rgba(255, 255, 255, 0.05);`

---

## 17. Tables

- **Appearance**: Glass styling. Rows (`.admin-table tr`, `.role-row`) utilize hover states.
- **Hover**: Background shifts to gradient `linear-gradient(...)`, border illuminates, text shifts to `var(--c-light)`.

---

## 18. Charts

- **Revenue Charts**: Built with `recharts`.
- **Styling**: `AreaChart` uses `url(#colorRev)` and `url(#colorSales)` gradients defined in SVG `defs`. Tooltips use standard `glass-card` CSS applied to the Recharts `contentStyle` prop.

---

## 19. Responsive Design

- **`<= 1200px` (Laptop)**: `cc-grid` switches to 3 columns.
- **`<= 1024px` (Tablet Landscape)**:
  - Base font scales to `16px`.
  - H1 scales from `56px` to `36px`.
  - Sidebars may collapse or adjust.
  - `cc-grid` switches to 2 columns.
- **`<= 900px` (Tablet Portrait)**:
  - Dashboard cards (`.dash-card`) shift from row to column layout. Right side content aligns to bottom.
- **`<= 768px` (Mobile)**:
  - TopNav converts to a bottom/mobile nav format.
  - `cc-grid` switches to 1 column.
- **`<= 600px` (Small Mobile)**:
  - Dashboard card left sections collapse vertically (Thumbnails become full width `100%`, `160px` height).

---

## 20. Role-Based Theme System

This is the platform's core architectural uniqueness. A `data-role` attribute injected on a wrapper updates CSS variables for all children, dynamically re-theming the entire layout.

| Role | Token `data-role` | Base Color | Hover/Glow Color |
| :--- | :--- | :--- | :--- |
| **Student** | `student` | `#94A3B8` (Slate) | `rgba(148, 163, 184, 0.16)` |
| **Instructor**| `instructor` | `#f97316` (Orange)| `rgba(249, 115, 22, 0.18)` |
| **Admin** | `admin` | `#8B5CF6` (Purple)| `rgba(139, 92, 246, 0.18)` |
| **Super Admin**|`superadmin` | `#EF4444` (Red) | `rgba(239, 68, 68, 0.18)` |

**Usage**:
```html
<div data-role="instructor">
   <div class="role-badge">Instructor Badge</div> <!-- Automatically Orange -->
   <tr class="role-row">...</tr> <!-- Hovers Orange -->
</div>
```

---

## 21. Accessibility

- **Contrast**: Text uses high contrast (`var(--c-light)` on dark glass, `#1f2937` on light mode).
- **Reduced Motion**: Currently, `.animate-entrance` runs globally. Future implementation should respect `@media (prefers-reduced-motion: reduce)`.
- **Keyboard Navigation**: Buttons include focus states (`box-shadow` outlines).

---

## 22. Design Tokens Summary

- **Primary Radius**: `16px`
- **Primary Spacing**: `24px` gap, `32px` padding.
- **Primary Glass**: `rgba(15, 17, 23, 0.7)` with `blur(20px)` and `.15` white top/left borders.

---

## 23. CSS Architecture

- **`index.css`**: Global resets, base typographic scale, root theme variables (`:root` and `body.light-mode`), foundational `.content` wrapper.
- **`content.css`**: Massive component library. Contains `.glass-card`, `.glass-btn`, inputs, tables, portals, dashboard classes, marketplace classes (`.cc-*`), role overrides (`data-role`), and media queries.
- **Methodology**: BEM-like prefixing for complex components (e.g., `cc-card`, `dash-card`) mixed with global utility classes (`.glass-card`, `.hover-glow`).

---

## 24. Component Inventory

1. **`CourseCard.jsx`**: Public facing marketplace cards.
2. **`DashboardTab.jsx`**: Internal student progress cards (`InProgressCard`, `CompletedCard`).
3. **`ExploreTab.jsx`**: Grid wrapper and category filters.
4. **`TopNav.jsx`**: Universal global navigation.
5. **`LearningPortal.jsx`**: Isolated immersive video player and curriculum sidebar.
6. **`AdminPortal.jsx` & `InstructorPortal.jsx`**: CMS layouts with vertical sidebars and tabular data views.
7. **`CheckoutPage.jsx`**: Shopping cart and payment form.

---

## 25. Page Inventory

- **`/student`**: Explore Tab (Marketplace)
- **`/student/dashboard`**: Dashboards Tab
- **`/course/:id`**: Course detail and sales page
- **`/checkout/cart`**: Cart and payment processing
- **`/learn/:id`**: Immersive student learning environment
- **`/instructor`**: Instructor dashboard (course creation, stats)
- **`/admin`**: Complete CMS (users, courses, categories, revenues)
- **`/auth/*`**: Authentication flows

---

## 26. UI Patterns

- **Horizontal Tabs**: Filters (`ExploreTab`), Dashboard (`DashboardTab`). Uses pill-shaped transparent buttons that highlight actively.
- **Stat Cards**: 3-up or 4-up grids of `.stat-card.glass-card` showing a massive number above a subtle label.
- **CMS Tables**: Roles, revenues, or users displayed in `role-row` styled `tr` elements.
- **Drawers**: Right-side sliding sheets for editing data (used in Admin/Instructor portals).

---

## 27. Performance

- **Glass Render Cost**: Heavy use of `backdrop-filter: blur(20px)`. While performant on modern hardware, massive tables or lists use `will-change: transform` or reduce blur on children to maintain 60fps scrolling.
- **Images**: `loading="lazy"` and `decoding="async"` implemented on marketplace cards.

---

## 28. Accessibility Checklist

- [ ] Ensure all SVGs have `aria-label` or `aria-hidden="true"`.
- [ ] Add `@media (prefers-reduced-motion)` to disable `.animate-entrance`.
- [ ] Verify `color-contrast` ratio on `--c-sub` against `.glass-card` backgrounds in light mode.

---

## 29. Deployment Checklist

- [ ] Build verification (`npm run build` succeeds).
- [ ] Light/Dark mode visual QA across all components.
- [ ] Role-based CSS leakage check (ensure `data-role` properly resets).
- [ ] Backend route matching (validate all data points exist in schemas).

---

## 30. Future Expansion

To scale this design system natively:
- **Community / Forums**: Build upon the `LearningPortal.jsx` Q&A tab styling. Use `data-role="student"` for user posts to give a unified blue/slate tint.
- **Certificates**: A dedicated `/certificates` route utilizing the `.completed-variant` card design from the dashboard, expanding into full-page PDF rendering glass-views.
- **Dark Mode Optimizations**: Extract the specific hardcoded alpha channels in `content.css` into `--alpha-low`, `--alpha-high` tokens to reduce media-query bloat.
