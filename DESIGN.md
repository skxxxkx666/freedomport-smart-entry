---
name: FreedomPort 智能入口
description: 一个安静、精确的入口测速仪表：测量、推荐、进入
colors:
  primary: "#0e6f64"
  neutral-bg: "#f4f3ef"
  neutral-surface: "#ffffff"
  neutral-surface-2: "#faf9f6"
  neutral-border: "#e3e1d9"
  text-primary: "#24262a"
  text-secondary: "#555b62"
  text-muted: "#676d74"
  status-ok: "#3e7d4c"
  status-warn: "#96610f"
  status-danger: "#b03a2e"
  dark-bg: "#131415"
  dark-surface: "#1b1d1f"
  dark-primary: "#45a495"
typography:
  display:
    fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, Microsoft YaHei, PingFang SC, Noto Sans SC, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 650
    lineHeight: 1.25
    letterSpacing: "-0.015em"
  title:
    fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, Microsoft YaHei, PingFang SC, Noto Sans SC, sans-serif"
    fontSize: "1.05rem"
    fontWeight: 600
    lineHeight: 1.4
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, Microsoft YaHei, PingFang SC, Noto Sans SC, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, Microsoft YaHei, PingFang SC, Noto Sans SC, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 550
    lineHeight: 1.4
  mono:
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
    fontSize: "2.25rem"
    fontWeight: 600
    lineHeight: 1.05
    letterSpacing: "-0.03em"
rounded:
  sm: "9px"
  md: "14px"
spacing:
  sm: "8px"
  md: "16px"
  lg: "24px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#ffffff"
    rounded: "{rounded.sm}"
    padding: "0 20px"
    height: "44px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.sm}"
    border: "1px solid #c7c4b9"
    padding: "0 20px"
    height: "44px"
  card:
    backgroundColor: "{colors.neutral-surface}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.md}"
    border: "1px solid {colors.neutral-border}"
    padding: "22px"
  theme-toggle:
    backgroundColor: "transparent"
    textColor: "{colors.text-secondary}"
    rounded: "{rounded.sm}"
    border: "1px solid #c7c4b9"
    size: "44px"
---

# Design System: FreedomPort 智能入口

## Overview

**Creative North Star: "The Measurement Panel"**

A calm, exact instrument for one decision — measure both entries, recommend one, enter. The page behaves like a precision gauge rather than a marketing page: the visitor is never sold anything, only informed, in real time, about which route is faster for them right now. Personality is restraint: warm paper neutrals in light mode, neutral graphite in dark mode, one harbor-teal accent reserved for action and the recommended state, system type that disappears into the task, and latency read in monospaced numerals so numbers feel measured rather than decorative.

It refuses the busy "compare-cards dashboard" look: no nested cards, no gradient text, no glassmorphism, no hero metrics, no section kickers, no background textures or glows. Depth comes from hairline borders and one soft shadow, never from stacked surfaces.

**Key Characteristics:**
- One accent color (harbor teal) used only for primary action, active progress, and the recommended state.
- System sans throughout; mono numerals only for latency measurements, always in ink — never tinted by status color.
- Soft 1px hairlines; elevation via a low shadow; radius 14px cards, 9px buttons.
- Every status carries text plus color — never color alone.
- Dual theme (light / dark) with a manual icon-only toggle in the top bar; follows the system until the visitor chooses.
- Motion is limited to state cues (testing pulse, progress fill, countdown) and honors `prefers-reduced-motion`.

## Themes

The page ships two themes built from one token set. `index.html` resolves the theme before first paint (`data-theme` on `<html>`): the visitor's manual choice (sessionStorage) wins, otherwise the system preference applies. The top-right theme toggle flips the theme, remembers it for the tab session, and stops following the system; `theme-color` is synced so browser chrome matches.

### Light

- **Paper** (#f4f3ef): page background — warm off-white, no texture.
- **Card White** (#ffffff): cards, panels, button surfaces.
- **Card Alt** (#faf9f6): subtle secondary surfaces (ghost hover, debug panel).
- **Hairline** (#e3e1d9): 1px borders and progress track; stronger variant #c7c4b9 for interactive edges.
- **Ink** (#24262a): primary text.
- **Slate Text** (#555b62): secondary text, ≥4.5:1 on white.
- **Muted Text** (#676d74): tertiary/labels, ≥4.5:1 on white.
- **Harbor Teal** (#0e6f64): the single accent — primary buttons, active progress, the recommended card's ring and tag. Hover deepens to #0a594f. Soft tint #e2efeb for selection.
- **Measure Green** (#3e7d4c) / **Wait Amber** (#96610f) / **Halt Red** (#b03a2e): status text only.

### Dark

Neutral graphite — deliberately no blue or purple cast.

- **Graphite** (#131415): page background.
- **Surface** (#1b1d1f) / **Surface Alt** (#212426): cards and secondary surfaces.
- **Hairline** (#2d3134); stronger #3f454a for interactive edges.
- **Ink** (#e8eaed): primary text. **Slate** (#a7adb5) secondary, **Muted** (#858c95) tertiary — all ≥4.5:1 on surfaces.
- **Teal** (#45a495): accent, lightened for contrast; primary buttons pair it with deep-teal text #06231f. Hover lightens to #5cb4a6. Soft tint rgba(69,164,149,0.16).
- Status: green #6fbf82, amber #d9a04f, red #e07a6c.

### Named Rules

**The Accent Acts Rule.** Harbor Teal appears on ≤10% of any surface and only where it means something: a button, the recommended card, live progress. The accent's rarity is what makes the recommendation legible.

**The Flat-At-Rest Rule.** Surfaces are flat by default; elevation is the reward for being the recommendation, never ambient decoration. No hover lifts — hover changes border and fill only.

## Typography

**Display/Body/Label Font:** system stack (`-apple-system, BlinkMacSystemFont, Segoe UI, Microsoft YaHei, PingFang SC, Noto Sans SC, sans-serif`)
**Mono Font:** `ui-monospace, SFMono-Regular, Menlo, Consolas, monospace` — used only for latency numerals, the exit-IP value, and debug data.

**Character:** one family does everything; nothing ornamental. Weight and size steps carry hierarchy. Mono is reserved for measurement, so latency reads as instrument data.

### Hierarchy
- **Display** (650, 1.75rem, 1.25): the single h1 heading "正在为你选择最佳入口".
- **Title** (600, 1.05rem): entry card names, recommendation line.
- **Body** (400, 1rem, 1.6): descriptions, status, explanations.
- **Label** (550, 0.875rem): status text, buttons.
- **Mono** (600, 2.25rem, tabular-nums): the latency value in cards, always in ink.

### Named Rules
**The Measure-Only-Mono Rule.** Monospace is reserved for values that are actually measured (latency, exit IP, debug samples). Never use mono as a "technical costume" on labels or prose.

**The Ink-Numerals Rule.** Latency numerals stay in the primary text color. Status is carried by the status line (dot + colored text), not by dyeing the measurement.

## Layout

A single centered column, max-width 880px, generous vertical rhythm (top bar → hero → cards → status → exit IP → privacy). The top bar holds the brand mark left and the theme toggle right. Two entry cards sit side-by-side on desktop and stack at ≤720px; card content is left-aligned like an instrument readout. The status region reserves a fixed minimum height so the page does not shift when results arrive (no CLS). Spacing rhythm: 8 / 16 / 20 / 24px. Buttons keep a 44px minimum touch target; cards' enter buttons are full-width and pinned to the card bottom so both cards stay level.

## Elevation & Depth

Hybrid: flat at rest, one soft elevation on the recommended card. Cards rest on the background separated by a 1px hairline, not shadow. The recommended card is lifted with a 1px accent ring plus a soft shadow. No glow, no hard offset shadows, no stacking.

## Shapes

Gently curved: cards 14px, buttons and the theme toggle 9px, the compat chip fully rounded (999px). No over-rounding, no pill cards. Progress bars and the countdown track are 3–4px rounded bars. The brand mark is the FreedomPort plane glyph (`public/logo-glyph.png`, transparent background) shown at 34px next to the wordmark; it is the one element allowed to carry its own brand blue, independent of the accent token.

## Components

### Buttons
- **Shape:** 9px radius, 44px min height, centered label.
- **Primary:** Harbor Teal fill, on-accent text (white in light, deep teal in dark); hover deepens (light) or lightens (dark). No shadow, no lift.
- **Ghost:** transparent, 1px strong-hairline border, Ink text; hover adds Card Alt fill.
- **States:** all buttons have hover / `:focus-visible` (2px accent-alpha ring + 2px offset).

### Theme toggle
- Icon-only 44px button at the top bar's right end: moon icon in light mode, sun icon in dark mode (the icon shows where you'll go). Stroke icons in currentColor, `aria-label` announces the action ("切换到深色模式" / "切换到浅色模式"); ghost styling matching the other quiet controls.

### Cards (entry cards)
- **Corner:** 14px. **Background:** surface. **Border:** 1px hairline.
- **Padding:** 22px. **Shadow:** none at rest; accent ring + soft shadow only when recommended.
- **Signature detail:** the latency value in 2.25rem mono numerals with a small "ms" unit and "中位延迟" label; the status line carries a color dot plus explicit text (never color alone); the testing state shows a 4px progress bar scaled via `transform`.
- **Recommended:** 1px accent ring + soft shadow, plus a small accent "推荐入口" label with a 6px dot inside the card's top-right corner. The recommended card's enter button is primary; the other card's is ghost.

### Signature Component: countdown bar
The 2-second auto-jump countdown renders as a 6px track whose fill scales down linearly (100ms steps, `transform: scaleX`), next to a live "将在 N 秒后自动进入" line and 立即进入 / 取消自动跳转 controls. Reduced-motion leaves the countdown functional, only stripping decorative animation.

### Exit IP line
A single quiet line below the status region — "当前出口 IP" plus the value in mono — sourced from a third-party IP echo service after the speed test completes. Failure degrades to a muted "获取失败"; disabling the feature hides the line entirely.

## Do's and Don'ts

### Do:
- **Do** keep one accent and use it only where it means something.
- **Do** show every status as text plus color.
- **Do** read latency in monospaced, tabular numerals, in ink.
- **Do** keep both themes on the same tokens and verify contrast in each.
- **Do** animate only state cues, under 200ms, and honor `prefers-reduced-motion`.
- **Do** keep the page under ~35KB gzipped JS so it never skews its own measurements.

### Don't:
- **Don't** use gradients, glassmorphism, neon, 3D, background textures, glows, or large illustrations.
- **Don't** load external fonts, images, or third-party SDKs.
- **Don't** wrap cards in cards or add section kickers / eyebrow labels.
- **Don't** tint measurements with status colors, and never dye dark-mode surfaces blue or purple.
- **Don't** hide a state behind color alone, and never show technical errors (CORS, AbortController) to normal users.
