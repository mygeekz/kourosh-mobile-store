import fs from 'node:fs';

const layout = fs.readFileSync('pages/ReportsLayout.tsx', 'utf8');
const auto = fs.readFileSync('components/reports/ReportsAutoActionEngine.tsx', 'utf8');
const schedule = fs.readFileSync('components/ReportSchedulePanel.tsx', 'utf8');

const must = (cond, msg) => {
  if (!cond) {
    console.error(`❌ ${msg}`);
    process.exit(1);
  }
};

must(layout.includes('ReportsAutoActionEngine'), 'ReportsLayout must render ReportsAutoActionEngine');
must(layout.includes("onOpenSchedule={() => setModal('schedule')}"), 'Auto Action Engine must reuse the existing schedule modal');
must(layout.includes('onSendNow={sendToTelegramNow}'), 'Auto Action Engine must reuse the existing immediate Telegram sender');
must(layout.includes('onExportExcel={doExportXlsx}'), 'Auto Action Engine must reuse the existing Excel export flow');

must(auto.includes('/api/reports/smart-insights'), 'Auto Action Engine must read Smart Insight Engine');
must(auto.includes('/api/reports/financial-audit'), 'Auto Action Engine must read Financial Audit');
must(auto.includes('schedule-existing-flow'), 'Auto Action Engine must suggest scheduling through the existing flow');
must(!auto.includes("fetch('/api/reports/schedules'") && !auto.includes('fetch(`/api/reports/schedules'), 'Auto Action Engine must not create a duplicate scheduling API flow');
must(schedule.includes("fetch('/api/reports/schedules'"), 'Existing ReportSchedulePanel remains the only schedule creation UI');

console.log('✅ Reports Auto Action Engine guard passed');
