# Refero Styles Extraction: Fal / Generative AI

Reference: https://styles.refero.design/style/14cc44e6-41bf-4178-b834-fc61bfeed4ae

Source style ID: `14cc44e6-41bf-4178-b834-fc61bfeed4ae`

## What Was Extracted

This reference page is for a Fal / Generative AI product website. The useful lesson for TrafScope is not the brand, logo, copy, or assets. The useful lesson is the exact visual system:

- light theme with a white canvas
- fog-gray section backgrounds
- 1px neutral borders
- high-contrast graphite text and buttons
- no shadow as a default card treatment
- no decorative gradients
- bold, crisp typography
- simple geometric structure
- sparing sky-cyan, violet, lavender, lime, and pink accents
- pixel block accents used as small supporting marks, not page backgrounds

## Core Tokens

| Role | Value | TrafScope Token |
|---|---:|---|
| white canvas | `#ffffff` | `--bg` |
| fog surface | `#f4f4f5` | `--panel-soft` |
| graphite | `#252527` | `--panel-raised` / primary action |
| border | `#e5e7eb` | `--line` |
| strong border | `#d4d4d8` | `--line-strong` |
| primary text | `#1b1b1d` | `--text` |
| muted text | `#6b6b72` | `--muted` |
| sky cyan band | `#99ecff` | `--health` / accent band |
| electric violet | `#6120ee` | `--search` / link accent |
| lavender pixel | `#ab77ff` | `--pixel-violet` |
| pixel lime | `#f1ffd2` | `--pixel-lime` |
| bubblegum band | `#ffddfa` | `--bubblegum` |
| amber status | `#f4b740` | `--commerce`, TrafScope-specific status color |
| red status | `#ef4444` | `--risk`, TrafScope-specific status color |

## Component Rules

- Buttons use a 4px radius.
- Cards and panels use 8px radius in dense app surfaces.
- Tables and task rows use 1px borders, not shadows.
- Primary actions are graphite with white text.
- Secondary actions stay white or fog-gray with graphite text.
- Pills can be rounded, but they should remain small and informational.
- Default card shadow is `no shadow`; hierarchy comes from spacing, borders, color bands, and typography.

## Layout Rules

- Use full-width app bands and structured work areas.
- Keep navigation visually quiet but active state unmistakable.
- Use dense, scannable workbench tables for operational decisions.
- Use side rails for evidence, data health, and trust context.
- Let the first viewport show the real product work, not a landing hero.
- Use pixel block accents only where they clarify hierarchy or add a small brand signal.

## TrafScope Translation

TrafScope should translate the reference into an evidence-first product app:

- Theme: light traffic operations workspace.
- Product job: prioritize evidence-backed ecommerce traffic tasks.
- Tokens: white canvas, fog surfaces, graphite actions, neutral borders, sky-cyan/violet/lime/pink accents, plus TrafScope-specific amber/red status accents.
- Layout: Traffic Operations Board first, detail side rails, structured evidence tables.
- Components: Task Row, Opportunity Detail, Evidence Row, Score Badge, QA Rail.
- Rule: recommendations must be credible before they are beautiful.

## Do Not Copy

- Do not copy Fal branding, logo, product copy, imagery, or animation concepts.
- Do not turn TrafScope into a marketing landing page.
- Do not add neon glow, AI orbs, glassmorphism, or gradient backgrounds.
- Do not make all surfaces dark.
- Do not hide evidence behind decorative cards.
- Do not use pixel blocks as large wallpaper.
