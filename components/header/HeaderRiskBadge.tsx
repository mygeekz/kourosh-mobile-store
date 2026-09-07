import React from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@/components/ui';
import type { FontAwesomeIconClass } from '../../types/iconMetadata';
import type { HeaderRiskyCustomers } from './useHeaderQuickData';

type HeaderRiskLevel = 'critical' | 'high' | 'watch' | 'clear';

type HeaderRiskBadgeProps = {
  headerRiskyCustomers: HeaderRiskyCustomers;
};

const getHeaderRiskLevel = (headerRiskyCustomers: HeaderRiskyCustomers): HeaderRiskLevel => {
  if (headerRiskyCustomers.totalRisky >= 8 || headerRiskyCustomers.returnedChecks >= 2) return 'critical';
  if (headerRiskyCustomers.totalRisky >= 5 || headerRiskyCustomers.lateOrOverdue >= 3) return 'high';
  if (headerRiskyCustomers.totalRisky > 0) return 'watch';
  return 'clear';
};

const getHeaderRiskLevelLabel = (riskLevel: HeaderRiskLevel) => {
  if (riskLevel === 'critical') return 'بحرانی';
  if (riskLevel === 'high') return 'بالا';
  if (riskLevel === 'watch') return 'نیازمند پیگیری';
  return 'سالم';
};

const getHeaderRiskIcon = (riskLevel: HeaderRiskLevel): FontAwesomeIconClass => {
  if (riskLevel === 'clear') return 'fa-solid fa-user-check';
  if (riskLevel === 'critical') return 'fa-solid fa-circle-exclamation';
  return 'fa-solid fa-triangle-exclamation';
};

const HeaderRiskBadge: React.FC<HeaderRiskBadgeProps> = ({ headerRiskyCustomers }) => {
  const riskLevel = getHeaderRiskLevel(headerRiskyCustomers);
  const riskLevelLabel = getHeaderRiskLevelLabel(riskLevel);
  const count = headerRiskyCustomers.totalRisky;
  const description = count > 0
    ? `مشتریان پرریسک: ${count.toLocaleString('fa-IR')} مورد، سطح ${riskLevelLabel}، دیرکرد یا معوق ${headerRiskyCustomers.lateOrOverdue.toLocaleString('fa-IR')}، چک برگشتی ${headerRiskyCustomers.returnedChecks.toLocaleString('fa-IR')}`
    : 'مشتری پرریسک فعالی دیده نشد';

  return (
    <Link
      to="/customers?risk=risky"
      data-ui-header-risk="true"
      data-risk-level={riskLevel}
      className="app-header-risk"
      data-tooltip={description}
      aria-label={description}
    >
      <FontAwesomeIcon icon={getHeaderRiskIcon(riskLevel)} className="app-header-risk__icon" />
      <span className="app-header-risk__count">{count > 99 ? '۹۹+' : count.toLocaleString('fa-IR')}</span>
    </Link>
  );
};

export default HeaderRiskBadge;
