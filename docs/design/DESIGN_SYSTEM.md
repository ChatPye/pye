# ChatPye Workspace — Design System

**Source of truth:** `design.md` (ChatPye Midnight Studio)  
**Product brand:** ChatPye Workspace · AI tutor: **Pye** · Evidence capability: **SkillProof** (integrated, not a separate product)

This document defines implementable tokens and rules for engineering. Visual prototypes live in the parent workspace `stitch_skillproof_studio/` HTML exports.

---

## Design principles

1. **Quietly premium** — deep ink backgrounds, warm text, restrained accent use.
2. **Evidence-first** — every task shows what counts as proof and who can see it.
3. **No surveillance aesthetic** — avoid monitoring language, scores without evidence, or hidden automation.
4. **Accessible by default** — WCAG 2.2 AA target; keyboard-first workspace.
5. **State-complete** — loading, empty, error, success, disabled on every surface.

---

## Colour tokens

### CSS custom properties (implement in `globals.css`)

```css
:root {
  /* Foundations */
  --color-background: #0A0C10;           /* Midnight Ink */
  --color-background-elevated: #111418;    /* Dark Shell */
  --color-surface: #1C2128;                /* Slate Panel */
  --color-surface-muted: #111318;
  --color-border: #30363D;               /* Hairline */
  --color-border-subtle: #282a2e;

  /* Text */
  --color-text-primary: #F0F2F5;         /* Warm Cream */
  --color-text-secondary: #9CA3AF;       /* Slate Gray */
  --color-text-muted: #958ea0;

  /* Brand accents */
  --color-accent-ai: #8B5CF6;             /* Electric Pye Violet — AI moments */
  --color-accent-interactive: #3B82F6;     /* Cobalt — links, focus */
  --color-accent-progress: #10B981;        /* Mint — progress, competency */
  --color-accent-warning: #F59E0B;
  --color-accent-danger: #F87171;

  /* Material 3 mapping (from design.md YAML) */
  --color-primary: #d0bcff;
  --color-on-primary: #3c0091;
  --color-tertiary: #4edea3;
  --color-error: #ffb4ab;
}
```

### Semantic usage

| Token | Use |
|-------|-----|
| `--color-accent-ai` | Pye avatar, AI actions, magic moments |
| `--color-accent-interactive` | Primary buttons (secondary style), links, input focus |
| `--color-accent-progress` | Progress bars, completed tasks, competency borders |
| `--color-surface` | Cards, panels, modals |
| `--color-border` | 1px hairline on all elevated surfaces |

### Light mode (secondary)

Light mode inverts surfaces: background `#F8FAFC`, text `#0F172A`, borders `#E2E8F0`. Accents unchanged. Default product experience remains **dark-first**.

---

## Typography

**Primary:** Inter (Google Fonts)  
**Monospace:** JetBrains Mono — code, evidence IDs, audit timestamps

| Token | Size | Weight | Line height | Tracking |
|-------|------|--------|-------------|----------|
| `display-lg` | 48px (32 mobile) | 700 | 56px (40 mobile) | -0.02em |
| `headline-md` | 24px | 600 | 32px | -0.01em |
| `body-base` | 16px | 400 | 24px | 0 |
| `label-caps` | 12px | 600 | 16px | 0.1em (uppercase) |
| `code-mono` | 14px | 400 | 20px | 0 |

Tailwind extension:

```js
fontFamily: {
  sans: ['Inter', 'system-ui', 'sans-serif'],
  mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
}
```

---

## Spacing

Base unit: **4px**. Preferred rhythm: **8px multiples**.

| Token | Value |
|-------|-------|
| `xs` | 4px |
| `sm` | 8px |
| `md` | 16px |
| `lg` | 24px |
| `xl` | 32px |
| `2xl` | 48px |
| `3xl` | 64px |
| `gutter` | 24px |
| `margin-mobile` | 16px |
| `margin-desktop` | 32px |

Panel internal padding: **16–24px**.

---

## Radius

| Token | Value | Use |
|-------|-------|-----|
| `sm` | 6px | Badges, tags |
| `DEFAULT` | 8px | Small controls |
| `lg` | 16px | Buttons, small cards |
| `xl` | 24px | Workspace panels, SkillProof cards |
| `full` | 9999px | Pills, avatars |

---

## Shadows

Prefer **tonal layers + 1px border** over heavy shadows.

| Token | Value |
|-------|-------|
| `shadow-none` | none (default) |
| `shadow-panel` | `0 1px 0 rgba(255,255,255,0.04) inset` |
| `shadow-overlay` | `0 24px 48px rgba(0,0,0,0.4)` (modals only) |

---

## Surfaces

| Layer | Background | Border |
|-------|------------|--------|
| Base | `#0A0C10` | none |
| Shell | `#111418` | `#30363D` 1px |
| Panel | `#1C2128` | `#30363D` 1px |
| Glass overlay | `rgba(0,0,0,0.8)` + `backdrop-blur(16px)` | `#30363D` |

---

## Status colours

| Status | Colour | Icon treatment |
|--------|--------|----------------|
| Success | Mint `#10B981` | Check + text label |
| Processing | Cobalt `#3B82F6` | Spinner + label |
| Warning | Amber `#F59E0B` | Triangle + label |
| Error | Rose `#F87171` | X + label |
| Private | Slate gray | Lock + “Private to you” |
| Shared | Violet `#8B5CF6` | Share + named recipient |

Never convey status by colour alone.

---

## Layout grid

- **Marketing / dashboard:** 12-column fluid grid, max-width `1280px`, gutter 24px.
- **Workspace:** Flexible split-pane — primary media left (~60%), Pye + tasks right (~40%). Resizable divider on desktop.
- **Breakpoints:** `sm` 640, `md` 768, `lg` 1024, `xl` 1280, `2xl` 1536.
- **Mobile:** Stack panes vertically or tabbed (`Learn | Pye | Tasks | Notes`).

---

## Accessibility rules

- Minimum touch target **44×44px**.
- Visible focus ring: `2px solid var(--color-accent-interactive)` offset 2px.
- `prefers-reduced-motion`: disable panel animations and pulse effects.
- All icon buttons require `aria-label`.
- Live regions for chat streaming and processing status updates.

---

## Component catalogue

### Button

| Variant | Style |
|---------|-------|
| Primary | Warm cream fill `#F0F2F5`, midnight text, `rounded-lg`, px-4 py-2 |
| Secondary | Transparent, slate border, hover surface tint |
| Ghost | No border; violet or cobalt text |
| Danger | Rose border, rose text |

States: hover (+4% lightness), active (scale 0.98), disabled (40% opacity), loading (spinner replaces label).

### Input

- Background `--color-surface`, border `--color-border`, `rounded-lg`, min-height 44px.
- Focus: border cobalt + outer glow `0 0 0 3px rgba(59,130,246,0.25)`.

### Card / SkillProof task card

- Surface panel, `rounded-xl`, left accent border 3px mint when active.
- Header: label-caps eyebrow + headline-md title.

### Pye chat

- User: slate bubble, subtle border.
- Pye: no bubble; avatar + markdown body; citations as mono chips with timestamp links.

### Progress meter

- Height 4px, track `rgba(255,255,255,0.1)`, fill mint.

### Navigation

- Sticky top bar, glass blur.
- Active item: warm cream text + violet dot indicator.

### Data states

Shared primitives: `EmptyState`, `ErrorState`, `LoadingSkeleton`, `ProcessingBanner` — each with icon, title, description, primary action.

---

## Interaction and motion

- Panel open/close: 200ms ease-out.
- Toast notifications: slide from bottom-right, 4s auto-dismiss.
- No gamified confetti or XP animations in Workspace.
- Processing states use deterministic copy from `processing-labels.ts`.

---

## Implementation checklist

- [ ] Add CSS variables to `globals.css`
- [ ] Extend `tailwind.config.js` with semantic colours
- [ ] Create `src/components/ui/` primitives (Button, Input, Card, Dialog, Tabs, Tooltip, Skeleton)
- [ ] Refactor `WorkspaceShell` to consume tokens
- [ ] Add Storybook or Ladle (optional, Milestone 1+)

---

## References

- `design.md` — token YAML + narrative
- `docs/product/DESIGN_SYSTEM.md` — product behaviour rules (SkillProof cards, learning map)
- Prototypes: `stitch_skillproof_studio/*/code.html`
