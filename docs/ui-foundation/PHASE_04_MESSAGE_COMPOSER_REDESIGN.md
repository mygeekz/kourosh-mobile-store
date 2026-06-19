# Phase 04 — Message Composer / Telegram Chatbox Redesign

Scope: visual redesign of `components/MessageComposerModal.tsx` and a new scoped stylesheet:

- `styles/system/message-composer-redesign.css`

## What changed

- Added a controlled readiness bar with four clear checkpoints: recipient, channel, address, text.
- Redesigned the hero/header copy to feel commercial and less prototype-like.
- Redesigned quick templates into compact icon chips.
- Replaced the old plain preview box with a chat-style preview surface.
- Kept all send logic, API routes, validation, queue behavior, and recipient resolution unchanged.
- Added one scoped CSS import after the existing composer controls, without deleting the previous compatibility layer.

## Test checklist

- Open message composer from customer, partner, and manual modes.
- Switch SMS and Telegram channel.
- Confirm selected channel remains visibly active.
- Type long Persian text and verify the preview wraps correctly.
- Use quick templates and verify icons/text alignment.
- Test dark and light mode.
- Test mobile/narrow layout.
- Send/queue behavior should remain unchanged.
