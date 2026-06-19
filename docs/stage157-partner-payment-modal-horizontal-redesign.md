# Stage 157 — Partner payment modal horizontal redesign

Fixes:
- Reverted from narrow/vertical layout to horizontal 2x2 grid.
- Modal width restored to `max-w-5xl` but clamped sidebar-safe.
- Internal modal scroll disabled for this modal.
- Layout:
  - Top right: account/balance card
  - Top left: payment/receipt selector
  - Bottom right: amount/date
  - Bottom left: description/actions
- Reduced large empty spaces.
- Balance cards are compact and icons no longer overlap text.
