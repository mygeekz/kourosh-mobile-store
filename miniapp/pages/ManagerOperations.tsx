import React from "react";
import { MiniAppDataState } from "../components/MiniAppDataState";
import { MiniAppFilterChip, MiniAppPill } from "../components/MiniAppVisualPrimitives";
import { ManagerAmount, ManagerGrid, ManagerList, ManagerMetric, ManagerPage, ManagerPager, ManagerQueryState, ManagerRecord, ManagerSection, ManagerSnapshotNote, useManagerListLocation } from "../components/manager/ManagerUI";
import { useMiniAppQuery } from "../hooks/useMiniAppQuery";
import { useMiniAppPermissions } from "../permission/MiniAppPermissionContext";
import type { ManagerRepairListData, StaffPhoneListItem } from "../types";
type ListProps = { q: string; page: number; setPage: (page: number) => void };
// Live inventory returns limit/offset, without a total. Snapshot responses may add pagination metadata.
type PhoneList = { items: StaffPhoneListItem[]; page: number; limit?: number; total?: number; totalPages?: number };
const Repairs: React.FC<ListProps> = ({ q, page, setPage }) => {
  const query = useMiniAppQuery<ManagerRepairListData>(`/api/miniapp/manager/repairs?q=${encodeURIComponent(q)}&page=${page}&pageSize=30`);
  const d = query.data;
  return <><ManagerSnapshotNote meta={query.meta} search /><ManagerQueryState query={query}>{d && <>
    {d.summary && <ManagerSection title="وضعیت تعمیرات" description={query.meta?.source === "snapshot" ? "خلاصه ذخیره‌شده؛ با جستجو محاسبه مجدد نمی‌شود" : "خلاصه تمام نتایج جستجوی فعلی"}><ManagerGrid>
      <ManagerMetric label="پرونده باز" money={false} value={d.summary.openCount} /><ManagerMetric label="آماده تحویل" money={false} value={d.summary.readyForPickupCount} /><ManagerMetric label="منتظر قطعه" money={false} value={d.summary.waitingPartCount} />
    </ManagerGrid></ManagerSection>}
    <ManagerSection title="پرونده‌های تعمیر"><ManagerQueryState query={query} empty={!d.items.length} emptyText="تعمیراتی در این صفحه پیدا نشد."><ManagerList>{d.items.map(item => <ManagerRecord key={item.id} title={`${item.customerName} · ${item.deviceModel}`} detail={`پذیرش از ${item.ageDays.toLocaleString("fa-IR")} روز قبل · پرونده ${item.id.toLocaleString("fa-IR")}`}>
      <span><MiniAppPill>{item.status}</MiniAppPill></span><p className="manager-muted">{item.problemDescription}</p>
      {item.technicianName && <p className="manager-muted">تعمیرکار: {item.technicianName}</p>}
      <ManagerAmount label={typeof item.finalCost === "number" ? "هزینه نهایی ثبت‌شده" : "هزینه برآوردی"} value={typeof item.finalCost === "number" ? item.finalCost : item.estimatedCost} field={`repair-${item.id}`} />
    </ManagerRecord>)}</ManagerList></ManagerQueryState><ManagerPager {...d} onPage={setPage} meta={query.meta} snapshotPaging /></ManagerSection>
  </>}</ManagerQueryState></>;
};
const Inventory: React.FC<ListProps> = ({ q, page, setPage }) => {
  const query = useMiniAppQuery<PhoneList>(`/api/miniapp/manager/inventory/phones?q=${encodeURIComponent(q)}&page=${page}&limit=30&pageSize=30`);
  const d = query.data;
  return <ManagerSection title="موجودی گوشی‌ها" description="این فهرست شامل همه گروه‌های کالا نیست"><ManagerSnapshotNote meta={query.meta} search /><ManagerQueryState query={query} empty={!d?.items.length} emptyText="گوشی دیگری در این صفحه پیدا نشد."><ManagerList>{d?.items.map(item => <ManagerRecord key={item.id} title={item.model} detail={<><bdi dir="ltr">{item.imei ? `IMEI: ${item.imei}` : ""}</bdi>{!item.imei && "بدون IMEI"}</>}>
    <span><MiniAppPill>{item.status || "وضعیت ثبت نشده"}</MiniAppPill></span><p className="manager-muted">{[item.color, item.storage, item.ram].filter(Boolean).join(" · ")}</p><ManagerAmount label="قیمت فروش ثبت‌شده" value={item.salePrice} field={`phone-${item.id}`} />
  </ManagerRecord>)}</ManagerList></ManagerQueryState>{d && !query.loading && !query.error && <><ManagerPager page={d.page} total={d.total} totalPages={d.totalPages} hasMore={d.items.length >= (d.limit || 30)} onPage={setPage} meta={query.meta} snapshotPaging />{query.meta?.source !== "snapshot" && <p className="manager-muted">تعداد کل از سرویس موجودی دریافت نمی‌شود؛ صفحه بعد ممکن است خالی باشد.</p>}</>}</ManagerSection>;
};
export const ManagerOperations: React.FC = () => {
  const { canPermission } = useMiniAppPermissions();
  const canRepairs = canPermission("repairs.read"), canInventory = canPermission("inventory.read");
  const { params, page, update, setPage } = useManagerListLocation();
  const tab = params.get("tab") === "inventory" && canInventory ? "inventory" : canRepairs ? "repairs" : "inventory";
  const q = (params.get("q") || "").slice(0, 80);
  if (!canRepairs && !canInventory) return <MiniAppDataState empty emptyText="دسترسی تعمیرات یا موجودی برای شما فعال نیست." />;
  return <ManagerPage title="عملیات فروشگاه" description="بررسی وضعیت تعمیرات و گوشی‌های ثبت‌شده">
    {canRepairs && canInventory && <div className="manager-actions"><MiniAppFilterChip active={tab === "repairs"} onClick={() => update("tab", "repairs", false, ["q"])}>تعمیرات</MiniAppFilterChip><MiniAppFilterChip active={tab === "inventory"} onClick={() => update("tab", "inventory", false, ["q"])}>موجودی</MiniAppFilterChip></div>}
    <label className="manager-search">{tab === "repairs" ? "جستجوی تعمیرات" : "جستجوی گوشی"}<input dir="auto" value={q} maxLength={80} onChange={e => update("q", e.target.value, true)} placeholder={tab === "repairs" ? "نام مشتری، دستگاه یا وضعیت…" : "مدل یا IMEI…"} /></label>
    {tab === "repairs" ? <Repairs q={q} page={page} setPage={setPage} /> : <Inventory q={q} page={page} setPage={setPage} />}
  </ManagerPage>;
};
