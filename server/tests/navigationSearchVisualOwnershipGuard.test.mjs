import assert from 'node:assert/strict';
import fs from 'node:fs';

const header = fs.readFileSync(new URL('../../components/header/HeaderSearch.tsx', import.meta.url), 'utf8');
const sidebar = fs.readFileSync(new URL('../../components/sidebar/SidebarSearch.tsx', import.meta.url), 'utf8');
const textField = fs.readFileSync(new URL('../../components/ui/TextField.tsx', import.meta.url), 'utf8');
const sidebarCss = fs.readFileSync(new URL('../../styles/components/sidebar.css', import.meta.url), 'utf8');

assert.match(header, /<TextField\s+controlOnly\s+unstyled\s+controlSize="sm"/s, 'header search must use feature-owned TextField visuals');
assert.match(sidebar, /<TextField\s+controlOnly\s+unstyled\s+controlSize="sm"/s, 'sidebar search must use feature-owned TextField visuals');
assert.match(textField, /data-ui-control=\{unstyled \? undefined : 'true'\}/, 'unstyled TextField must opt out of the canonical field visual contract');
assert.match(sidebarCss, /\.app-sidebar-search__input\s*\{[\s\S]*?border:\s*0;/, 'sidebar inner input remains feature-owned and flat');
assert.match(sidebarCss, /\.app-sidebar-search:focus-within\s*\{[\s\S]*?border-color:\s*var\(--app-sidebar-border-strong\);/, 'sidebar shell owns focus border without an emergency !important override');
assert.doesNotMatch(sidebarCss, /v276 — Navigation search visual ownership guard/, 'v276 emergency sidebar override is retired after primitive opt-out');
assert.doesNotMatch(sidebarCss, /app-sidebar-search[^}]*#(?:f59e0b|f97316|fb923c)/i, 'sidebar search must not hard-code orange focus chrome');
console.log('navigation search visual ownership guard: PASS');
