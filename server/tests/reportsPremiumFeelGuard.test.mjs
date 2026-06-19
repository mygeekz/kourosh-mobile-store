import fs from 'node:fs';

const mustContain = (file, needle) => {
  const content = fs.readFileSync(file, 'utf8');
  if (!content.includes(needle)) {
    throw new Error(`${file} is missing: ${needle}`);
  }
};

mustContain('styles/pages/reports.css', 'Reports UX Phase E: Premium Feel');
mustContain('styles/pages/reports.css', 'reports-premium-panel');
mustContain('styles/pages/reports.css', 'prefers-reduced-motion');
mustContain('styles/pages/reports.css', 'reports-premium-shimmer');
mustContain('components/reports/PremiumReportShell.tsx', 'reports-premium-feel');
mustContain('components/reports/ReportsDecisionEngine.tsx', 'reports-premium-panel');
mustContain('components/reports/ReportsAutoActionEngine.tsx', 'reports-premium-orbit');
mustContain('components/CommandPalette.tsx', 'command-palette-panel');
mustContain('components/CommandPalette.tsx', 'placeholder="جستجوی سریع');

console.log('Reports Premium Feel guard passed.');
