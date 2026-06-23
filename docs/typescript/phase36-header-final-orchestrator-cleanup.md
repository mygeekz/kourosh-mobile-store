# Phase 36 — Header Final Orchestrator Cleanup

## Intent
Reduce `components/Header.tsx` to composition and orchestration only.

## Extracted Contracts

### HeaderShell
Owns the shared topbar shell markup, attributes, min-height, and premium header class stack.

### HeaderRiskBadge
Owns the customer-risk level calculation, labels, classes, badge count, tooltip, and link to `/customers?risk=risky`.

### useHeaderProfileMenu
Owns profile-menu open state, ref, toggle behavior, and outside-click closing.

## Non-goals
- No search logic changes
- No quick action logic changes
- No currency logic changes
- No route, RBAC, or feature flag changes
- No visual redesign
