import { Boxes } from "lucide-react";
import React from "react";
import { Link } from "react-router-dom";
import { MiniAppArtwork } from "../components/MiniAppArtwork";
import { PartnerLedgerRows, PartnerMetric, PartnerPage, PartnerPosition, PartnerQueryState, PartnerSection } from "../components/partner/PartnerUI";
import { MiniAppDataState } from "../components/MiniAppDataState";
import { formatCustomerDate } from "../format";
import { useMiniAppQuery } from "../hooks/useMiniAppQuery";
import type { PartnerHomeData } from "../types";

export const PartnerHome: React.FC = () => {
  const query = useMiniAppQuery<PartnerHomeData>("/api/miniapp/partner/home");
  const d = query.data;
  return <PartnerPage id="partner-home-title" title="نمای کلی همکاری" description={d?.partner.name} artwork="collaboration" headerSummary={!query.loading && !query.error && d ? <PartnerPosition account={d.account} /> : undefined}>
    <PartnerQueryState query={query}>{d && <>
      <Link className="partner-link" to="/account">اطلاعات حساب ←</Link>
      <div role="group" className="miniapp-quick-links" aria-label="دسترسی سریع همکار"><Link className="miniapp-quick-link" to="/ledger"><MiniAppArtwork kind="receipt" />گردش حساب</Link><Link className="miniapp-quick-link" to="/purchases"><MiniAppArtwork kind="goods" />کالاها</Link><Link className="miniapp-quick-link" to="/phones"><MiniAppArtwork kind="money" />تسویه گوشی‌ها</Link></div>
      <PartnerSection artwork="goods" title="تأمین کالا" description="مجموع تأمین ثبت‌شده؛ محدود به امروز نیست" to="/purchases" action="سوابق کالاها"><div className="partner-grid">
        <PartnerMetric label="جمع مبلغ تأمین" value={d.supplied.totalSupplyAmount} field="totalSupplyAmount" />
        <PartnerMetric icon={Boxes} label="کل اقلام تأمین‌شده" value={d.supplied.total} money={false} />
      </div><p className="partner-muted">{d.supplied.phones.toLocaleString("fa-IR")} گوشی · {d.supplied.products.toLocaleString("fa-IR")} کالا</p></PartnerSection>
      <PartnerSection artwork="receipt" title="تسویه گوشی‌ها" description="این مانده با مانده کل حساب یکی نیست" to="/phones" action="بررسی تسویه‌ها"><div className="partner-grid">
        <PartnerMetric label="مانده تسویه گوشی‌ها" value={d.phoneSettlement.remainingAmount} field="settlementRemaining" />
      </div><p className="partner-muted">{d.phoneSettlement.open.toLocaleString("fa-IR")} تسویه باز · {d.phoneSettlement.settled.toLocaleString("fa-IR")} تسویه‌شده</p></PartnerSection>
      <PartnerSection title="آخرین گردش حساب" description={d.ledger.lastActivity ? `آخرین فعالیت حساب: ${formatCustomerDate(d.ledger.lastActivity)}` : "تاریخ فعالیت ثبت نشده"} to="/ledger" action="گردش حساب">
        {d.ledger.recent.length ? <PartnerLedgerRows items={d.ledger.recent.slice(0, 3)} /> : <MiniAppDataState empty emptyText="رکوردی در گزارش اخیر حساب وجود ندارد." />}
        {d.ledger.recent.length > 3 && <p className="partner-muted">۳ رکورد اخیر این گزارش نمایش داده می‌شود.</p>}
      </PartnerSection>
    </>}</PartnerQueryState>
  </PartnerPage>;
};
