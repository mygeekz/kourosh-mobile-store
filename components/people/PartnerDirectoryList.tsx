import React from 'react';

import type { Partner } from '../../types';
import { PARTNER_TYPES } from '../../constants';
import { formatCurrencyText, readStoredCurrencyUnit } from '../../utils/currency';
import { formatIsoToShamsiDateTime } from '../../utils/dateUtils';
import { MANAGEMENT_DIRECTORY_ROW_CLASS, ManagementDirectoryTable, TableActionGroup } from '@/components/ui';

type PartnerDirectoryListProps = {
  partners: Partner[];
  page: number;
  pageSize: '25' | '50' | '100';
  total: number;
  totalPages: number;
  pageStart: number;
  pageEnd: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: '25' | '50' | '100') => void;
  onSendReport: (partner: Partner) => void | Promise<void>;
  onDelete: (partner: Partner) => void;
};

type PartnerBalanceMeta = {
  amount: number;
  amountText: string;
  label: string;
  icon: string;
  amountClassName: string;
  statusClassName: string;
  urgent: boolean;
};

const getPartnerTypeLabel = (partnerType: string) =>
  PARTNER_TYPES.find((item) => item.value === partnerType)?.label || partnerType || 'تعریف نشده';

const getPartnerBalanceMeta = (value?: number | null): PartnerBalanceMeta => {
  const amount = Number(value || 0);
  const urgent = amount !== 0 && Math.abs(amount) >= 50_000_000;
  const amountText = formatCurrencyText(Math.abs(amount), readStoredCurrencyUnit());

  if (urgent) {
    return {
      amount,
      amountText,
      label: amount > 0 ? 'بدهی بالا به همکار؛ نیازمند پیگیری' : 'طلب بالا از همکار؛ نیازمند پیگیری',
      icon: 'fa-triangle-exclamation',
      amountClassName: 'text-rose-700 dark:text-rose-300',
      statusClassName: 'text-rose-600 dark:text-rose-300',
      urgent: true,
    };
  }
  if (amount > 0) {
    return {
      amount,
      amountText,
      label: 'بدهی به همکار',
      icon: 'fa-arrow-up-left',
      amountClassName: 'text-amber-700 dark:text-amber-300',
      statusClassName: 'text-amber-600 dark:text-amber-300',
      urgent: false,
    };
  }
  if (amount < 0) {
    return {
      amount,
      amountText,
      label: 'طلب از همکار',
      icon: 'fa-arrow-down-right',
      amountClassName: 'text-emerald-700 dark:text-emerald-300',
      statusClassName: 'text-emerald-600 dark:text-emerald-300',
      urgent: false,
    };
  }
  return {
    amount,
    amountText: formatCurrencyText(0, readStoredCurrencyUnit()),
    label: 'حساب تسویه است',
    icon: 'fa-circle-check',
    amountClassName: 'text-slate-900 dark:text-slate-100',
    statusClassName: 'text-emerald-600 dark:text-emerald-300',
    urgent: false,
  };
};

const getPartnerBalanceRowAccent = (meta: PartnerBalanceMeta): 'danger' | 'warning' | 'success' | 'neutral' => {
  if (meta.urgent) return 'danger';
  if (meta.amount > 0) return 'warning';
  if (meta.amount < 0) return 'success';
  return 'neutral';
};

const PartnerBalance: React.FC<{ value?: number | null }> = ({ value }) => {
  const meta = getPartnerBalanceMeta(value);
  return (
    <div className="min-w-0" title={`${meta.amountText} · ${meta.label}`}>
      <strong className={`block whitespace-nowrap text-sm font-black tabular-nums ${meta.amountClassName}`}>
        {meta.amountText}
      </strong>
      <span className={`mt-0.5 inline-flex min-w-0 items-center gap-1.5 text-[11px] font-black leading-5 ${meta.statusClassName}`}>
        <i className={`fa-solid ${meta.icon} shrink-0`} aria-hidden="true" />
        <span className="min-w-0">{meta.label}</span>
      </span>
    </div>
  );
};

const PartnerActions: React.FC<{
  partner: Partner;
  onSendReport: (partner: Partner) => void | Promise<void>;
  onDelete: (partner: Partner) => void;
}> = ({ partner, onSendReport, onDelete }) => (
  <TableActionGroup
    ariaLabel={`عملیات همکار ${partner.partnerName}`}
    collapseBelow="lg"
    align="center"
    density="compact"
    actions={[
      {
        key: 'view',
        kind: 'link',
        to: `/partners/${partner.id}`,
        label: 'مشاهده پرونده',
        tooltip: 'مشاهده پرونده همکار',
        variant: 'secondary',
        icon: <i className="fa-solid fa-eye" aria-hidden="true" />,
      },
      {
        key: 'telegram',
        kind: 'button',
        onClick: () => onSendReport(partner),
        label: 'ارسال گزارش تلگرام',
        tooltip: 'ارسال گزارش تلگرام',
        variant: 'secondary',
        icon: <i className="fa-brands fa-telegram" aria-hidden="true" />,
      },
      {
        key: 'delete',
        kind: 'button',
        onClick: () => onDelete(partner),
        label: 'حذف پرونده',
        tooltip: 'حذف پرونده بدون سابقه',
        variant: 'danger',
        requiredRoles: ['Admin', 'Manager'],
        icon: <i className="fa-solid fa-trash" aria-hidden="true" />,
      },
    ]}
  />
);

const PartnerDirectoryList: React.FC<PartnerDirectoryListProps> = ({
  partners,
  page,
  pageSize,
  total,
  totalPages,
  pageStart,
  pageEnd,
  onPageChange,
  onPageSizeChange,
  onSendReport,
  onDelete,
}) => (
  <div data-ui-partners-directory="true">
  <ManagementDirectoryTable
    title="فهرست همکاران"
    rangeLabel={<>نمایش {pageStart.toLocaleString('fa-IR')} تا {pageEnd.toLocaleString('fa-IR')} از {total.toLocaleString('fa-IR')} همکار</>}
    info="مانده حساب و شاخص‌های تأمین از دفتر و خریدهای ثبت‌شده محاسبه می‌شوند."
    ariaLabel="جدول فهرست همکاران"
    caption="فهرست همکاران، وضعیت حساب، تأمین و فعالیت و عملیات پرونده"
    dataUi="partners"
    columns={[
      { key: 'identity', label: 'همکار و ارتباط', widthClassName: 'w-[36%]' },
      { key: 'account', label: 'حساب و همکاری', widthClassName: 'w-[29%]' },
      { key: 'activity', label: 'تأمین و فعالیت', widthClassName: 'w-[25%]' },
      { key: 'actions', label: 'عملیات', widthClassName: 'w-[10%]', align: 'center', stickyEnd: true },
    ]}
    minWidthClassName="min-w-[62rem]"
    pagination={{
      page,
      totalPages,
      pageSize: Number(pageSize),
      pageSizeOptions: [25, 50, 100],
      total,
      pageStart,
      pageEnd,
      ariaLabel: 'صفحه‌بندی همکاران',
      pageSizeAriaLabel: 'تعداد همکار در هر صفحه',
      onPageChange,
      onPageSizeChange: (value) => onPageSizeChange(String(value) as '25' | '50' | '100'),
    }}
  >
          {partners.map((partner) => {
            const balance = getPartnerBalanceMeta(partner.currentBalance);
            const unsoldPhonesCount = Number(partner.unsoldPhonesCount || 0);
            return (
              <tr key={partner.id} className={MANAGEMENT_DIRECTORY_ROW_CLASS} data-ui-row-accent={getPartnerBalanceRowAccent(balance)}>
                <td className="px-2.5 py-2 align-middle">
                  <div className="min-w-0 space-y-1.5">
                    <div className="flex min-w-0 items-start gap-2.5">
                      <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-sm font-black text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                        {(partner.partnerName || '?').trim().charAt(0)}
                      </span>
                      <div className="min-w-0">
                        <strong className="allow-truncate block truncate text-sm font-black text-slate-950 dark:text-slate-50">{partner.partnerName}</strong>
                        <small className="allow-truncate mt-0.5 block truncate text-xs font-semibold text-slate-500 dark:text-slate-400">
                          پرونده #{Number(partner.id || 0).toLocaleString('fa-IR')} · {getPartnerTypeLabel(String(partner.partnerType || ''))}
                        </small>
                      </div>
                    </div>
                    <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 ps-10 text-[11px] font-semibold leading-5 text-slate-500 dark:text-slate-400">
                      <span className="inline-flex items-center gap-1.5">
                        <i className="fa-solid fa-phone shrink-0 text-sky-600" aria-hidden="true" />
                        <bdi dir="ltr">{partner.phoneNumber || 'ثبت نشده'}</bdi>
                      </span>
                      <span className="inline-flex min-w-0 items-start gap-1.5">
                        <i className="fa-solid fa-location-dot mt-0.5 shrink-0 text-cyan-600" aria-hidden="true" />
                        <span className="allow-line-clamp line-clamp-1">{partner.address || 'بدون آدرس'}</span>
                      </span>
                    </div>
                  </div>
                </td>
                <td className="px-2.5 py-2 align-middle">
                  <div className="space-y-1.5">
                    <PartnerBalance value={partner.currentBalance} />
                    <span className="inline-flex max-w-full flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[10px] font-bold leading-5 text-slate-500 dark:text-slate-400">
                      <i className="fa-solid fa-handshake-angle shrink-0 text-violet-600" aria-hidden="true" />
                      {partner.contactPerson ? `رابط: ${partner.contactPerson}` : 'بدون رابط معرفی‌شده'}
                    </span>
                  </div>
                </td>
                <td className="px-2.5 py-2 align-middle">
                  <div className="min-w-0 space-y-1.5">
                    <span className={`inline-flex items-center gap-1.5 font-black ${unsoldPhonesCount > 0 ? 'text-amber-700 dark:text-amber-300' : 'text-emerald-700 dark:text-emerald-300'}`}>
                      <i className={`fa-solid ${unsoldPhonesCount > 0 ? 'fa-box-open' : 'fa-circle-check'}`} aria-hidden="true" />
                      {unsoldPhonesCount.toLocaleString('fa-IR')} گوشی موجود
                    </span>
                    <div className="min-w-0 space-y-1 text-[11px] text-slate-600 dark:text-slate-300">
                      <strong className="flex flex-wrap items-center gap-1.5 font-bold leading-5">
                        <i className="fa-regular fa-clock shrink-0 text-slate-400" aria-hidden="true" />
                        {partner.dateAdded ? formatIsoToShamsiDateTime(partner.dateAdded) : 'بدون تاریخ فعالیت'}
                      </strong>
                      <small className="flex flex-wrap gap-x-3 gap-y-1 font-semibold text-slate-500 dark:text-slate-400">
                        <span><i className="fa-solid fa-mobile-screen-button me-1 text-violet-600" aria-hidden="true" />{Number(partner.totalPhonesSupplied || 0).toLocaleString('fa-IR')} گوشی</span>
                        <span><i className="fa-solid fa-file-invoice-dollar me-1 text-rose-600" aria-hidden="true" />{Number(partner.openInstallmentSalesCount || 0).toLocaleString('fa-IR')} قسطی باز</span>
                      </small>
                    </div>
                  </div>
                </td>
                <td className="sticky end-0 z-10 bg-inherit px-2 py-2.5 text-center align-middle">
                  <PartnerActions partner={partner} onSendReport={onSendReport} onDelete={onDelete} />
                </td>
              </tr>
            );
          })}
  </ManagementDirectoryTable>
  </div>
);

export default PartnerDirectoryList;
