# Phase 29 — FontAwesome Renderer Contract

## Canonical renderer

`components/ui/FontAwesomeIcon.tsx` is now the canonical renderer for FontAwesome metadata strings.

```tsx
<FontAwesomeIcon icon="fa-solid fa-chart-line" />
<FontAwesomeIcon icon={item.icon} fixedWidth />
```

## Contract

Metadata may remain string-based in registries:

- navigation metadata
- feature metadata
- report metadata
- search-domain metadata

But React surfaces should render those strings through `FontAwesomeIcon` instead of repeating raw `<i className={...}>` composition.

## Migrated surfaces

- Sidebar navigation icons
- Mobile bottom navigation icons
- Command palette navigation/search-domain icons
- Header global-search domain icons
- Favorites/recents icon typing aligned to `NavigationIconMetadata`

## Not migrated intentionally

This phase does not migrate every static decorative icon. Static inline icons inside specialized modals, report cards, and local widgets remain unchanged until a later dedicated visual-system pass.

## Audit

```bash
npm run audit:fontawesome-renderer
```
