import React from 'react';

import type { Partner } from '../../types';
import { PARTNER_TYPES } from '../../constants';
import { formatCurrencyText, readStoredCurrencyUnit } from '../../utils/currency';
import { formatIsoToShamsiDateTime } from '../../utils/dateUtils';
import { ManagementDirectoryPagination, TableActionGroup } from '@/components/ui';

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

const PARTNER_DIRECTORY_ROW_CLASS = 'bg-white hover:bg-slate-50 dark:bg-slate-950 dark:hover:bg-slate-900';

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

const getPartnerBalanceRowRailClass = (meta: PartnerBalanceMeta): string => {
  if (meta.urgent) return 'border-s-4 border-s-rose-500';
  if (meta.amount > 0) return 'border-s-4 border-s-amber-400';
  if (meta.amount < 0) return 'border-s-4 border-s-emerald-500';
  return 'border-s-4 border-s-slate-300 dark:border-s-slate-700';
};

const PartnerBalance: React.FC<{ value?: number | null }> = ({ value }) => {
  const meta = getPartnerBalanceMeta(value);
  return (
    <div className="min-w-0" title={`${meta.amountText} · ${meta.label}`}>
      <strong className={`block whitespace-nowrap text-sm font-black tabular-nums ${meta.amountClassName}`}>
        {meta.amountText}
      </strong>
      <span className={`mt-0.5 inline-flex min-w-0 items-center gap-1.5 text-[10px] font-black leading-5 ${meta.statusClassName}`}>
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
    align="end"
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
  <section
    className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950"
    dir="rtl"
    data-ui-partners-directory="true"
  >
    <header className="flex flex-col gap-2 border-b border-slate-200 px-3 py-2.5 lg:flex-row lg:items-center lg:justify-between dark:border-slate-800">
      <div className="min-w-0">
        <h3 className="text-sm font-black text-slate-950 dark:text-slate-50">فهرست همکاران</h3>
        <p className="mt-0.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
          نمایش {pageStart.toLocaleString('fa-IR')} تا {pageEnd.toLocaleString('fa-IR')} از {total.toLocaleString('fa-IR')} همکار
        </p>
      </div>
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
        <i className="fa-solid fa-circle-info text-sky-600" aria-hidden="true" />
        مانده حساب و شاخص‌های تأمین از دفتر و خریدهای ثبت‌شده محاسبه می‌شوند.
      </span>
    </header>

    <div className="w-full overflow-x-auto overscroll-x-contain" role="region" aria-label="جدول فهرست همکاران" tabIndex={0}>
      <table
        className="w-full min-w-[62rem] table-fixed border-collapse text-xs"
        dir="rtl"
        data-ui-table="true"
        data-ui-bidi-scope="rtl-table"
        data-ui-table-layout="managed"
        data-ui-table-density="compact"
      >
        <caption className="sr-only">فهرست همکاران، وضعیت حساب، تأمین و فعالیت و عملیات پرونده</caption>
        <colgroup>
          <col className="w-[33%]" />
          <col className="w-[28%]" />
          <col className="w-[25%]" />
          <col className="w-[14%]" />
        </colgroup>
        <thead className="bg-slate-50 text-slate-600 dark:bg-slate-900/70 dark:text-slate-300">
          <tr className="border-b border-slate-200 text-right dark:border-slate-800">
            <th scope="col" className="bg-slate-50 px-3 py-2 text-right font-black tracking-normal before:hidden after:hidden dark:bg-slate-900">همکار و ارتباط</th>
            <th scope="col" className="bg-slate-50 px-3 py-2 text-right font-black tracking-normal before:hidden after:hidden dark:bg-slate-900">حساب و همکاری</th>
            <th scope="col" className="bg-slate-50 px-3 py-2 text-right font-black tracking-normal before:hidden after:hidden dark:bg-slate-900">تأمین و فعالیت</th>
            <th scope="col" className="sticky end-0 z-20 bg-slate-50 px-2 py-2 text-center font-black tracking-normal before:hidden after:hidden dark:bg-slate-900">عملیات</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
          {partners.map((partner) => {
            const balance = getPartnerBalanceMeta(partner.currentBalance);
            const unsoldPhonesCount = Number(partner.unsoldPhonesCount || 0);
            return (
              <tr key={partner.id} className={PARTNER_DIRECTORY_ROW_CLASS}>
                <td className={`px-3 py-2.5 align-top ${getPartnerBalanceRowRailClass(balance)}`}>
                  <div className="min-w-0 space-y-2">
                    <div className="flex min-w-0 items-start gap-2.5">
                      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-sm font-black text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                        {(partner.partnerName || '?').trim().charAt(0)}
                      </span>
                      <div className="min-w-0">
                        <strong className="allow-truncate block truncate text-sm font-black text-slate-950 dark:text-slate-50">{partner.partnerName}</strong>
                        <small className="allow-truncate mt-0.5 block truncate text-xs font-semibold text-slate-500 dark:text-slate-400">
                          پرونده #{Number(partner.id || 0).toLocaleString('fa-IR')} · {getPartnerTypeLabel(String(partner.partnerType || ''))}
                        </small>
                      </div>
                    </div>
                    <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 ps-11 text-[10px] font-semibold leading-5 text-slate-500 dark:text-slate-400">
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
                <td className="px-3 py-2.5 align-top">
                  <div className="space-y-2">
                    <PartnerBalance value={partner.currentBalance} />
                    <span className="inline-flex max-w-full flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[10px] font-bold leading-5 text-slate-500 dark:text-slate-400">
                      <i className="fa-solid fa-handshake-angle shrink-0 text-violet-600" aria-hidden="true" />
                      {partner.contactPerson ? `رابط: ${partner.contactPerson}` : 'بدون رابط معرفی‌شده'}
                    </span>
                  </div>
                </td>
                <td className="px-3 py-2.5 align-top">
                  <div className="min-w-0 space-y-1.5">
                    <span className={`inline-flex items-center gap-1.5 font-black ${unsoldPhonesCount > 0 ? 'text-amber-700 dark:text-amber-300' : 'text-emerald-700 dark:text-emerald-300'}`}>
                      <i className={`fa-solid ${unsoldPhonesCount > 0 ? 'fa-box-open' : 'fa-circle-check'}`} aria-hidden="true" />
                      {unsoldPhonesCount.toLocaleString('fa-IR')} گوشی موجود
                    </span>
                    <div className="min-w-0 space-y-1 text-[10px] text-slate-600 dark:text-slate-300">
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
        </tbody>
      </table>
    </div>

    <ManagementDirectoryPagination
      page={page}
      totalPages={totalPages}
      pageSize={Number(pageSize)}
      pageSizeOptions={[25, 50, 100]}
      total={total}
      pageStart={pageStart}
      pageEnd={pageEnd}
      ariaLabel="صفحه‌بندی همکاران"
      pageSizeAriaLabel="تعداد همکار در هر صفحه"
      onPageChange={onPageChange}
      onPageSizeChange={(value) => onPageSizeChange(String(value) as '25' | '50' | '100')}
    />
  </section>
);

export default PartnerDirectoryList;
