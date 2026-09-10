import React from "react";
import { MiniAppBidiText } from "../components/MiniAppBidiText";
import { PartnerAmount, PartnerMetric, PartnerPage, PartnerPosition, PartnerQueryState, PartnerSection } from "../components/partner/PartnerUI";
import { formatPartnerType } from "../format";
import { useMiniAppQuery } from "../hooks/useMiniAppQuery";
import type { PartnerAccountData } from "../types";

export const PartnerAccount: React.FC = () => {
  const query = useMiniAppQuery<PartnerAccountData>("/api/miniapp/partner/account");
  const d = query.data;
  return <PartnerPage id="partner-account-title" title="حساب همکاری" description={d?.partner.name}>
    <PartnerQueryState query={query}>{d && <>
      <PartnerPosition account={d.account} />
      <PartnerSection title="دفتر حساب" description="مقادیر گزارش‌شده؛ بدهکار و بستانکار مستقل از یکدیگر" to="/ledger" action="مشاهده گردش حساب"><div className="partner-grid">
        <PartnerMetric label="جمع بدهکار" value={d.totalDebit} field="totalDebit" /><PartnerMetric label="جمع بستانکار" value={d.totalCredit} field="totalCredit" />
      </div><PartnerAmount label={`مقدار مانده گزارش‌شده · ${d.account.label}`} value={d.account.amount} field="accountAmount" /></PartnerSection>
      <PartnerSection title="خلاصه تأمین و تسویه" description="جمع سوابق همکاری؛ مانده تسویه گوشی جدا از مانده کل حساب است"><div className="partner-grid">
        <PartnerMetric label="جمع مبلغ تأمین" value={d.supplied.totalSupplyAmount} field="totalSupplyAmount" /><PartnerMetric label="مانده تسویه گوشی" value={d.phoneSettlement.remainingAmount} field="settlementRemaining" />
      </div></PartnerSection>
      <PartnerSection title="اطلاعات همکاری"><dl className="partner-section m-0">
        <div><dt className="partner-muted">نوع همکاری</dt><dd className="m-0">{formatPartnerType(d.partner.type)}</dd></div>
        {d.partner.contactName && <div><dt className="partner-muted">شخص رابط</dt><dd className="m-0">{d.partner.contactName}</dd></div>}
        {d.partner.phoneNumber && <div><dt className="partner-muted">شماره تماس</dt><dd className="m-0"><MiniAppBidiText>{d.partner.phoneNumber}</MiniAppBidiText></dd></div>}
        {d.partner.email && <div><dt className="partner-muted">ایمیل</dt><dd className="m-0"><MiniAppBidiText>{d.partner.email}</MiniAppBidiText></dd></div>}
      </dl></PartnerSection>
    </>}</PartnerQueryState>
  </PartnerPage>;
};
