---
name: ChatPye Midnight Studio
colors:
  surface: '#111318'
  surface-dim: '#111318'
  surface-bright: '#37393e'
  surface-container-lowest: '#0c0e12'
  surface-container-low: '#1a1c20'
  surface-container: '#1e2024'
  surface-container-high: '#282a2e'
  surface-container-highest: '#333539'
  on-surface: '#e2e2e8'
  on-surface-variant: '#cbc3d7'
  inverse-surface: '#e2e2e8'
  inverse-on-surface: '#2f3035'
  outline: '#958ea0'
  outline-variant: '#494454'
  surface-tint: '#d0bcff'
  primary: '#d0bcff'
  on-primary: '#3c0091'
  primary-container: '#a078ff'
  on-primary-container: '#340080'
  inverse-primary: '#6d3bd7'
  secondary: '#adc6ff'
  on-secondary: '#002e6a'
  secondary-container: '#0566d9'
  on-secondary-container: '#e6ecff'
  tertiary: '#4edea3'
  on-tertiary: '#003824'
  tertiary-container: '#00a572'
  on-tertiary-container: '#00311f'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#e9ddff'
  primary-fixed-dim: '#d0bcff'
  on-primary-fixed: '#23005c'
  on-primary-fixed-variant: '#5516be'
  secondary-fixed: '#d8e2ff'
  secondary-fixed-dim: '#adc6ff'
  on-secondary-fixed: '#001a42'
  on-secondary-fixed-variant: '#004395'
  tertiary-fixed: '#6ffbbe'
  tertiary-fixed-dim: '#4edea3'
  on-tertiary-fixed: '#002113'
  on-tertiary-fixed-variant: '#005236'
  background: '#111318'
  on-background: '#e2e2e8'
  surface-variant: '#333539'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  body-base:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  code-mono:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-caps:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.1em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  2xl: 48px
  3xl: 64px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 32px
---

## Brand & Style

The design system establishes a **quietly premium, high-focus AI workspace** that functions as a "learning command center." The aesthetic is rooted in **Modern Minimalism with Glassmorphic accents**, prioritizing deep-space focus for intense professional development and skill verification.

The visual narrative is "precise yet human." It avoids the coldness of traditional enterprise software by using warm cream text and vibrant, luminous accent pulses against ink-like depths. The target audience—professionals and lifelong learners—should feel they are entering a trusted, distraction-free environment built for high-performance work.

**Key Stylistic Pillars:**
- **Inky Foundations:** Deep midnight backgrounds that eliminate visual noise.
- **Glass Depth:** Layered slate surfaces with 1px hairline borders to create structural hierarchy without heavy shadows.
- **Luminous Precision:** Using high-vibrancy accents (Violet, Cobalt, Mint) sparingly to guide attention and celebrate progress.
- **Sophisticated Utility:** Generous whitespace paired with a strict geometric rhythm to maintain clarity in complex AI-driven workflows.

## Colors

The palette is engineered for long-session readability and functional clarity in a dark-mode-first environment.

- **Foundations:** The root background is a deep **Midnight Ink (#0A0C10)**. Interactive surfaces use **Dark Shell (#111418)** or **Slate Panel (#1C2128)** to distinguish between background, mid-ground, and foreground.
- **Accents:** 
    - **Electric Pye Violet (#8B5CF6)** is reserved for AI interactions and brand-specific "magic" moments. 
    - **Cobalt (#3B82F6)** signifies standard interactive elements like links and primary controls. 
    - **Mint (#10B981)** is strictly functional, representing competency, progress, and success.
- **Text:** Primary content uses a **Warm Cream (#F0F2F5)** rather than pure white to reduce eye strain, while secondary metadata uses **Slate Gray (#9CA3AF)**.

## Typography

The typography system relies on **Inter** for its systematic, professional clarity across the majority of the UI.

- **Headings:** Use tight letter spacing (-0.01em to -0.02em) to create a "locked-in" editorial feel for display titles.
- **Labels:** Uppercase metadata labels (Eyebrows) should have wide tracking (0.1em) to differentiate them from body text at small sizes.
- **Technical Content:** **JetBrains Mono** is utilized for code blocks, terminal outputs, and system-level evidence data, emphasizing technical precision.
- **Hierarchy:** Maintain a 1.5x line-height for body content to ensure readability against the dark background.

## Layout & Spacing

The design system utilizes an **8px base spatial rhythm** to ensure mathematical consistency across all components.

- **Layout Model:** A 12-column fluid grid is used for dashboards, while the "Studio" workspace uses a flexible split-pane model that adapts to the content (Video on left, AI Tutor on right).
- **Margins & Gutters:** Desktop layouts use 32px margins with 24px gutters. Mobile layouts collapse to 16px margins.
- **Whitespace Philosophy:** Generous internal padding (16px–24px) is required for workspace panels to prevent information density from feeling overwhelming.
- **Reflow:** On mobile, side-by-side workspace panes must stack vertically or transition into a tabbed interface to preserve the 44px minimum touch target for all interactive elements.

## Elevation & Depth

Hierarchy is established through **Tonal Layers** and **Glassmorphism** rather than traditional drop shadows.

- **Base Layer:** Midnight Ink (#0A0C10) background.
- **Surface Layer:** Dark Shell (#111418) for main content areas and sidebars.
- **Elevated Layer:** Slate Panel (#1C2128) for interactive cards, modals, and popovers.
- **Depth Markers:** All elevated surfaces must feature a **1px hairline border** (#30363D). 
- **Glass Effects:** Overlays (like headers or dropdown menus) should use a `backdrop-blur` (12px-20px) with a semi-transparent black fill (e.g., `rgba(0, 0, 0, 0.8)`) to maintain context of the content beneath while providing clear focus.

## Shapes

The shape language is modern and approachable, utilizing a **large border-radius** to soften the technical nature of the AI workspace.

- **Standard Elements:** Buttons and small cards use `rounded-lg` (16px).
- **Major Containers:** Workspace panels and SkillProof cards use `rounded-xl` (24px).
- **Status Indicators:** Small tags and badges use `rounded-sm` (6px) or `rounded-full` (pill) for status signals.
- **Consistency:** Never mix sharp corners with rounded elements. If a container is rounded, its internal focus states and children must follow the same curve radius proportionally.

## Components

- **Buttons:**
    - **Primary:** Solid Warm Cream fill with Midnight text, 12px-16px radius.
    - **Secondary:** Transparent with a Slate border and subtle hover fill.
    - **Ghost:** No border, Cobalt or Violet text for low-priority actions.
- **SkillProof Cards:** Specialized containers for task verification. Use a Slate background with a left-edge accent border in Mint Teal. Include checkbox icons that pulse in Mint when completed.
- **AI Tutor Chat:**
    - **User Bubbles:** Subtle slate containers (#1C2128) with white borders.
    - **AI Responses:** No background bubble; text sits directly on the surface with a small "Pye" avatar to indicate the source.
- **Inputs:** Large, 16px rounded containers with dark slate fills. The focus state should transition the border from Slate (#30363D) to Cobalt (#3B82F6) with a subtle outer glow.
- **Progress Meters:** Thin, 4px height bars. Background should be `rgba(255, 255, 255, 0.1)` with a solid Mint Teal (#10B981) fill for the active state.
- **Navigation:** A sticky top bar with glassmorphic blur. Navigation links use Warm Cream text with a small Violet dot indicator for the active state.