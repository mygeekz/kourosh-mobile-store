import React from 'react';

type SmartInsightEmptyStateProps = {
  title?: string;
  description?: string;
};

function SmartInsightEmptyState({
  title = 'Insight فعالی برای این فیلتر پیدا نشد',
  description = 'بازه زمانی یا نوع تحلیل را تغییر بده. اگر داده تازه ثبت شده، دکمه به‌روزرسانی را بزن تا دستیار دوباره تحلیل کند.',
}: SmartInsightEmptyStateProps) {
  return (
    <div className="smart-insights-empty-state smart-insights-empty-state--polished" role="status" aria-live="polite">
      <span className="smart-insights-empty-state__icon" aria-hidden="true">
        <i className="fa-solid fa-brain" />
      </span>
      <div className="smart-insights-empty-state__copy">
        <strong>{title}</strong>
        <p>{description}</p>
      </div>
      <div className="smart-insights-empty-state__hints" aria-hidden="true">
        <span>بازه تاریخ</span>
        <span>نوع تحلیل</span>
        <span>به‌روزرسانی داده</span>
      </div>
    </div>
  );
}

export default React.memo(SmartInsightEmptyState);
