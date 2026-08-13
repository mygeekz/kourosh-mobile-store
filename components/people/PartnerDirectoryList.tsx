import React from 'react';

import type { Partner } from '../../types';
import { PARTNER_TYPES } from '../../constants';
import { formatCurrencyText, readStoredCurrencyUnit } from '../../utils/currency';
import { formatIsoToShamsiDateTime } from '../../utils/dateUtils';
import Button from '../Button';
import { DataTableShell, SelectField, Surface, TableActionGroup } from '@/components/ui';

type PartnerDirectoryListProps = {
  partners: Partner[];
  page: number;
  pageSize: '25' | '50' | '100';
  total: number;
  totalPages: number;
  pageStart: number;
  pageEnd: number;
  visiblePages: number[];
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

const PartnerBalance: React.FC<{ value?: number | null; compact?: boolean }> = ({ value, compact = false }) => {
  const meta = getPartnerBalanceMeta(value);
  return (
    <div className="min-w-0" title={`${meta.amountText} · ${meta.label}`}>
      <strong className={`block whitespace-nowrap font-black tabular-nums ${compact ? 'text-[13px]' : 'text-[14px]'} ${meta.amountClassName}`}>
        {meta.amountText}
      </strong>
      <span className={`mt-1 inline-flex min-w-0 items-center gap-1.5 text-[10px] font-black leading-5 ${meta.statusClassName}`}>
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
  mobile?: boolean;
}> = ({ partner, onSendReport, onDelete, mobile = false }) => (
  <TableActionGroup
    ariaLabel={`عملیات همکار ${partner.partnerName}`}
    collapseBelow={mobile ? 'md' : 'xl'}
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
  visiblePages,
  onPageChange,
  onPageSizeChange,
  onSendReport,
  onDelete,
}) => (
  <DataTableShell
    title="فهرست همکاران"
    titleIcon={<i className="fa-solid fa-address-book" aria-hidden="true" />}
    kicker="اشخاص"
    kickerIcon={<i className="fa-solid fa-building" aria-hidden="true" />}
    subtitle={`نمایش ${pageStart.toLocaleString('fa-IR')} تا ${pageEnd.toLocaleString('fa-IR')} از ${total.toLocaleString('fa-IR')} همکار`}
    meta={(
      <span className="inline-flex min-w-0 items-start gap-1.5 text-[10px] font-bold leading-5 text-slate-500 dark:text-slate-400">
        <i className="fa-solid fa-circle-info mt-0.5 shrink-0 text-blue-500" aria-hidden="true" />
        <span>مانده حساب و شاخص‌های تأمین از دفتر و خریدهای ثبت‌شده محاسبه می‌شوند.</span>
      </span>
    )}
    className="@container min-w-0"
    data-ui-people-directory-list="partners"
    data-ui-people-directory-layout="utility-only"
    footer={(
      <div className="grid min-w-0 gap-3 @[620px]:grid-cols-[auto_minmax(0,1fr)] @[620px]:items-center @[900px]:grid-cols-[auto_minmax(0,1fr)_auto]">
        <div className="flex min-w-0 items-center gap-2 text-[10px] font-bold text-slate-500 dark:text-slate-400 sm:text-[11px]">
          <span className="shrink-0">تعداد در صفحه</span>
          <SelectField
            value={pageSize}
            onValueChange={(value) => onPageSizeChange(value as '25' | '50' | '100')}
            ariaLabel="تعداد همکار در هر صفحه"
            size="sm"
            wrapperClassName="w-[88px] shrink-0"
            options={[
              { value: '25', label: '۲۵' },
              { value: '50', label: '۵۰' },
              { value: '100', label: '۱۰۰' },
            ]}
          />
        </div>

        <nav className="flex min-w-0 flex-wrap items-center justify-start gap-1.5 @[620px]:justify-center" aria-label="صفحه‌بندی فهرست همکاران">
          <Button
            type="button"
            variant="secondary"
            size="icon"
            autoIcon={false}
            disabled={page <= 1}
            onClick={() => onPageChange(Math.max(1, page - 1))}
            aria-label="صفحه قبل"
            leftIcon={<i className="fa-solid fa-chevron-right" />}
          />
          {visiblePages.map((item) => (
            <Button
              key={item}
              type="button"
              variant={item === page ? 'primary' : 'secondary'}
              size="icon"
              autoIcon={false}
              data-active={item === page}
              onClick={() => onPageChange(item)}
              aria-label={`صفحه ${item.toLocaleString('fa-IR')}`}
            >
              {item.toLocaleString('fa-IR')}
            </Button>
          ))}
          <Button
            type="button"
            variant="secondary"
            size="icon"
            autoIcon={false}
            disabled={page >= totalPages}
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            aria-label="صفحه بعد"
            leftIcon={<i className="fa-solid fa-chevron-left" />}
          />
        </nav>

        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 @[620px]:col-span-2 @[620px]:text-center @[620px]:text-[11px] @[900px]:col-span-1 @[900px]:text-left">
          {pageStart.toLocaleString('fa-IR')}–{pageEnd.toLocaleString('fa-IR')} از {total.toLocaleString('fa-IR')}
        </span>
      </div>
    )}
  >
    <div className="hidden min-w-0 @[900px]:block">
      <table className="w-full table-fixed border-collapse text-right text-[12px]" data-ui-people-table="partners">
        <thead className="border-b border-slate-200/90 bg-slate-50/70 text-slate-500 dark:border-slate-700/80 dark:bg-slate-900/65 dark:text-slate-300">
          <tr>
            <th scope="col" className="w-[34%] px-4 py-3 font-black">همکار و ارتباط</th>
            <th scope="col" className="w-[27%] px-4 py-3 font-black">حساب و همکاری</th>
            <th scope="col" className="w-[23%] px-4 py-3 font-black">تأمین و فعالیت</th>
            <th scope="col" className="w-[16%] px-4 py-3 text-center font-black">عملیات</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800/90">
          {partners.map((partner) => {
            const balance = getPartnerBalanceMeta(partner.currentBalance);
            return (
              <tr
                key={partner.id}
                className={balance.urgent
                  ? '[&>td]:bg-rose-50/45 dark:[&>td]:bg-rose-950/10'
                  : 'transition-colors hover:[&>td]:bg-slate-50/65 dark:hover:[&>td]:bg-slate-900/55'}
              >
                <td className="px-4 py-3.5 align-middle">
                  <div className="grid min-w-0 grid-cols-[40px_minmax(0,1fr)] gap-3">
                    <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] border border-slate-200 bg-slate-50 text-[13px] font-black text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                      {(partner.partnerName || '?').trim().charAt(0)}
                    </span>
                    <div className="min-w-0">
                      <strong className="block truncate text-[13px] font-black text-slate-950 dark:text-slate-50">{partner.partnerName}</strong>
                      <small className="mt-0.5 block text-[10px] font-semibold text-slate-500 dark:text-slate-400">پرونده #{partner.id.toLocaleString('fa-IR')}</small>
                      <div className="mt-2 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-bold text-slate-600 dark:text-slate-300">
                        <span dir="ltr" className="inline-flex min-w-0 items-center gap-1.5">
                          <i className="fa-solid fa-phone shrink-0 text-blue-500" aria-hidden="true" />
                          <span className="truncate">{partner.phoneNumber || 'ثبت نشده'}</span>
                        </span>
                        <span className="inline-flex min-w-0 items-center gap-1.5">
                          <i className="fa-solid fa-location-dot shrink-0 text-slate-400" aria-hidden="true" />
                          <span className="truncate">{partner.address || 'بدون آدرس'}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </td>

                <td className="px-4 py-3.5 align-middle">
                  <div className="grid min-w-0 gap-2.5">
                    <PartnerBalance value={partner.currentBalance} />
                    <div className="flex min-w-0 flex-wrap items-center gap-2 text-[10px] font-bold text-slate-500 dark:text-slate-400">
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-2 py-1 dark:border-slate-700">
                        <i className="fa-solid fa-handshake-angle" aria-hidden="true" />
                        {getPartnerTypeLabel(String(partner.partnerType || ''))}
                      </span>
                      <span className="truncate">{partner.contactPerson ? `رابط: ${partner.contactPerson}` : 'بدون رابط معرفی‌شده'}</span>
                    </div>
                  </div>
                </td>

                <td className="px-4 py-3.5 align-middle">
                  <div className="grid min-w-0 gap-2 text-[10px] font-bold text-slate-600 dark:text-slate-300">
                    <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="inline-flex items-center gap-1.5">
                        <i className="fa-solid fa-mobile-screen-button text-slate-400" aria-hidden="true" />
                        {Number(partner.totalPhonesSupplied || 0).toLocaleString('fa-IR')} گوشی دریافتی
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <i className="fa-solid fa-box-open text-slate-400" aria-hidden="true" />
                        {Number(partner.unsoldPhonesCount || 0).toLocaleString('fa-IR')} موجود
                      </span>
                    </div>
                    <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-slate-500 dark:text-slate-400">
                      <span className="inline-flex items-center gap-1.5">
                        <i className="fa-solid fa-file-invoice-dollar text-slate-400" aria-hidden="true" />
                        {Number(partner.openInstallmentSalesCount || 0).toLocaleString('fa-IR')} فروش قسطی باز
                      </span>
                      <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                        <i className="fa-regular fa-calendar text-slate-400" aria-hidden="true" />
                        {partner.dateAdded ? formatIsoToShamsiDateTime(partner.dateAdded) : '—'}
                      </span>
                    </div>
                  </div>
                </td>

                <td className="px-3 py-3.5 text-center align-middle">
                  <PartnerActions partner={partner} onSendReport={onSendReport} onDelete={onDelete} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>

    <div className="grid min-w-0 gap-3 p-3 @[520px]:p-4 @[900px]:hidden" data-ui-people-card-list="partners">
      {partners.map((partner) => {
        const balance = getPartnerBalanceMeta(partner.currentBalance);
        return (
          <Surface
            key={partner.id}
            surface="glass"
            variant="subtle"
            scheme="adaptive"
            wrapContent={false}
            className={`min-w-0 rounded-[18px] p-3.5 ${balance.urgent ? 'border-rose-200/90 dark:border-rose-900/60' : ''}`}
          >
            <div className="flex min-w-0 items-start justify-between gap-3">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] border border-slate-200 bg-slate-50 text-[13px] font-black text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                  {(partner.partnerName || '?').trim().charAt(0)}
                </span>
                <div className="min-w-0">
                  <strong className="block truncate text-[14px] font-black text-slate-950 dark:text-slate-50">{partner.partnerName}</strong>
                  <span className="mt-1 inline-flex max-w-full items-center gap-1.5 rounded-full border border-slate-200 px-2 py-1 text-[9.5px] font-black text-slate-600 dark:border-slate-700 dark:text-slate-300">
                    <i className="fa-solid fa-handshake-angle shrink-0" aria-hidden="true" />
                    <span className="truncate">{getPartnerTypeLabel(String(partner.partnerType || ''))}</span>
                  </span>
                </div>
              </div>
              <PartnerBalance value={partner.currentBalance} compact />
            </div>

            <div className="mt-3 grid min-w-0 gap-2 @[520px]:grid-cols-2">
              <div className="min-w-0 border-t border-slate-200/80 pt-2.5 dark:border-slate-700/80">
                <span className="block text-[9px] font-black text-slate-500 dark:text-slate-400">ارتباط</span>
                <strong dir="ltr" className="mt-1 block truncate text-[11px] font-black text-slate-800 dark:text-slate-200">{partner.phoneNumber || 'ثبت نشده'}</strong>
                <small className="mt-1 block truncate text-[9.5px] font-semibold text-slate-500 dark:text-slate-400">{partner.contactPerson ? `رابط: ${partner.contactPerson}` : 'بدون رابط معرفی‌شده'}</small>
              </div>
              <div className="min-w-0 border-t border-slate-200/80 pt-2.5 dark:border-slate-700/80">
                <span className="block text-[9px] font-black text-slate-500 dark:text-slate-400">تأمین و تعهد</span>
                <strong className="mt-1 block text-[11px] font-black text-slate-800 dark:text-slate-200">
                  {Number(partner.totalPhonesSupplied || 0).toLocaleString('fa-IR')} گوشی · {Number(partner.unsoldPhonesCount || 0).toLocaleString('fa-IR')} موجود
                </strong>
                <small className="mt-1 block text-[9.5px] font-semibold text-slate-500 dark:text-slate-400">{Number(partner.openInstallmentSalesCount || 0).toLocaleString('fa-IR')} فروش قسطی باز</small>
              </div>
            </div>

            <div className="mt-3 flex min-w-0 items-center justify-between gap-2 border-t border-slate-200/80 pt-3 dark:border-slate-700/80">
              <span className="min-w-0 truncate text-[9.5px] font-bold text-slate-500 dark:text-slate-400">
                پرونده #{partner.id.toLocaleString('fa-IR')} · {partner.dateAdded ? formatIsoToShamsiDateTime(partner.dateAdded) : '—'}
              </span>
              <PartnerActions partner={partner} onSendReport={onSendReport} onDelete={onDelete} mobile />
            </div>
          </Surface>
        );
      })}
    </div>
  </DataTableShell>
);

export default PartnerDirectoryList;
