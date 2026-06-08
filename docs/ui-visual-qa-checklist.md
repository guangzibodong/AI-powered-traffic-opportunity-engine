# TrafScope UI Visual QA Checklist

Date: 2026-06-08

Status: Required before MVP UI sign-off

## Purpose

This checklist verifies that TrafScope UI remains evidence-first, draft-safe, responsive, accessible, and aligned with the dark operational design system.

## Required Viewports

Use at least:

- Desktop: `1440x900`
- Tablet/narrow: `1024x768`
- Mobile: `390x844`
- Small mobile: `320x568`

## Required Screenshots

Capture and review:

- Traffic Operations Board first viewport.
- Top task evidence preview.
- Task Detail.
- Opportunity Detail.
- Settings / Integrations.
- Empty state.
- Loading/planning state.
- Error state.
- Mobile Board.
- Mobile Task Detail.

## Global Visual Checks

- App background uses dark operational surface.
- Panels use restrained dark surfaces.
- Borders are low contrast but visible.
- Text has readable contrast.
- Focus ring is visible.
- No text overlaps adjacent content.
- No button text overflows.
- No card or panel clips required content.
- No nested card walls.
- No decorative gradient orbs, glassmorphism, or AI glow.
- No marketing hero inside the app shell.
- No one-note green/teal palette.

## Evidence-First Checks

- Top tasks show evidence preview.
- Task Detail shows structured evidence rows.
- Opportunity Detail shows structured evidence rows.
- Evidence row includes source.
- Evidence row includes date range when applicable.
- Evidence row includes query/product/page reference.
- Evidence row includes metric or claim.
- Evidence row includes confidence or reason.
- No task without evidence renders as a normal actionable task.
- AI summary does not replace evidence rows.

## Draft-Safe Checks

- No generic `Publish` button.
- No `Publish live`.
- No `Apply live`.
- No `Update product`.
- No `Change inventory`.
- No `one-click apply`.
- No `autopilot` action.
- WordPress action says `Create WordPress draft`.
- WooCommerce status says read-only when relevant.
- Future draft/asset actions are disabled or clearly marked if not implemented.

## Board Checks

- Store name visible.
- Last planning run visible.
- Planning state visible.
- Integration health visible.
- Run weekly planning visible.
- Metrics visible.
- Top 1-3 tasks visible in first viewport.
- Top task has score, title, category, status, evidence, and next action.
- Right rail does not crowd main tasks.
- Mobile layout keeps top task evidence visible.

## Task Detail Checks

- Task title visible.
- Status visible.
- Score visible.
- Approve/reject/snooze visible.
- Safety note near actions.
- Action plan visible.
- Acceptance criteria visible.
- Related entities visible.
- Score breakdown visible or one click away.
- Missing evidence shows blocking state.

## Opportunity Detail Checks

- Opportunity title visible.
- Rule ID visible.
- Rule version visible.
- Dedupe key or trace ID visible.
- Why now visible.
- TrafScore visible.
- Score components visible.
- Evidence rows visible.
- Recommended task visible.
- Opportunity and task concepts are not visually merged.

## Settings / Integrations Checks

- WooCommerce state visible.
- WordPress state visible.
- GSC state visible.
- Demo/import/real mode visible.
- Last sync visible.
- Sync errors are safe and actionable.
- Read-only safety visible.
- Draft-only safety visible.
- Audit log entry visible or planned.
- No raw credential or secret appears.

## State Checks

- Empty states explain reason and next action.
- Loading states use stable dimensions.
- Planning running state disables repeated run.
- Error states show safe message and recovery action.
- Stale data state is visible.
- Permission state explains missing permission.
- Disabled future actions do not imply feature is available.

## Accessibility Checks

- Navigation uses links when routes exist.
- Buttons have accessible labels.
- Status is not color-only.
- Job progress uses visible text and should use `aria-live` in implementation.
- Keyboard focus is visible.
- Evidence lists/tables use semantic structure.
- Reduced motion is respected.

## Playwright Assertions

Automated smoke should assert:

- Demo store name is visible.
- Integration status is visible.
- Summary metrics render.
- Top task includes score, title, category, status, evidence, and next action.
- Task/Opportunity detail evidence is visible.
- Approve/reject/snooze state changes are visible when implemented.
- Re-running planning does not create duplicate top task when backend is wired.
- No live publish control or text exists.
- Console has no uncaught runtime errors.
- Mobile screenshots have no major overlap or clipped primary action.

