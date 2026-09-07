# Canonical Sidebar Architecture

The application sidebar is owned by `components/Sidebar.tsx` and the extracted modules in `components/sidebar/`.

## Structure

```text
app-sidebar-shell
├── app-sidebar-brand
├── app-sidebar-scroll
│   ├── app-sidebar-search
│   ├── app-sidebar-favorites
│   └── app-sidebar-navigation
└── app-sidebar-support
```

Only `app-sidebar-scroll` may scroll. Brand and support are fixed structural regions.

## Styling

`styles/components/sidebar.css` is the only active style owner for `app-sidebar-*` selectors. Historical sidebar pass/fix files were removed from the runtime manifest. The canonical file reuses the former final sidebar bootstrap slot, so no additional runtime import was introduced.

## Interaction

- Desktop collapse is intentionally unavailable.
- Collapsed hover flyouts and their positioning state were removed.
- Menu groups use a simple accessible accordion.
- Search automatically opens matching groups.
- Favorites use the same compact scale as navigation rows.
- Focus never produces a blue ring or extra box.

## RTL anchoring and mobile controls

The application sidebar is a physical right-side rail. It must use `right: 0; left: auto` rather than logical `inset-inline-end`, because `inline-end` resolves to the left edge in RTL. The close button is a mobile drawer control and is omitted from desktop DOM by `MainLayoutShell`; CSS is not responsible for hiding it.

## Width contract

The sidebar width is shared by `StyleContext`, `useMainLayoutSidebar`, settings controls and `styles/components/sidebar.css`. The canonical range is `196px..280px`, with a `272px` default. Old saved values above this range are normalized to `280px`, so the sidebar and reserved content margin cannot drift apart.

## Search contract

The search control is a three-column structural grid: physical-left search icon, RTL input, physical-right clear action. It does not use absolute icon positioning, the retired `data-sidebar-search-input` selector, or runtime `element.style(..., important)` resets. This keeps the icon out of the placeholder/text area and leaves `styles/components/sidebar.css` as the sole owner.
