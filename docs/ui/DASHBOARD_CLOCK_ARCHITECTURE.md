# Dashboard Clock Architecture

## Ownership

The dashboard clock is owned by:

- Component: `pages/dashboard/widgets/ClockWidget.tsx`
- Style contract: `styles/components/dashboard-clock.css`
- Governance manifest: `config/ui/dashboard-clock-manifest.json`

The dashboard hero owns the outer card surface. The clock component is a transparent content layout and must not create a second card, gradient, ring, decorative shadow, or hover movement.

## Layout

The widget has four structural areas:

1. Compact identity header and store status
2. Frameless view-mode controls
3. Digital time and operational rhythm
4. Optional compact analog and manager/focus details

Sizing is based on the actual container dimensions passed to the widget. The supported density states are `compact`, `regular`, and `wide`.

## Modes

The existing behavior is preserved:

- `auto`: resolves based on container, time, and due items
- `minimal`: digital clock and operational rhythm only
- `manager`: compact analog plus three operational metrics
- `cinematic`: compact analog plus one concise priority row

The cinematic mode is no longer a large dark or decorative surface. It uses the same canonical scale and tokens as the other modes.

## Style rules

- Use the `app-dashboard-clock__*` namespace only.
- Use design-system tokens from `styles/system/design-tokens.css`.
- Do not add Tailwind size patches inside `ClockWidget.tsx`.
- Do not add clock selectors to dashboard redesign passes or compatibility files.
- Do not add a new clock CSS file. Modify the canonical contract.
- Mode buttons must use `data-skip-global-button="true"`.
- Focus must not add a visible blue box or glow.

## Legacy cleanup

`dashboard-redesign-pass-3.css` was entirely clock-specific and has been removed. Clock selectors were also removed from the active smart-widget, redesign-pass, and dashboard UI-contract sources. The unused duplicate clock preference state, one-second dashboard timer, and `liveClock` memo were removed from `pages/Dashboard.tsx`; the clock now owns its single timer.
