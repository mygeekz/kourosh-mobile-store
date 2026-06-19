import type { StyleState } from '../contexts/StyleContext';
const KEY = 'style:v1';

export function loadStyle(): StyleState | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) as StyleState : null;
  } catch { return null; }
}
export function saveStyle(s: StyleState) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {}
}
