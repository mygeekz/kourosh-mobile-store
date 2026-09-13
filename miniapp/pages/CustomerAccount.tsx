import React from "react";
import { FinancialGrid, RecordMeta } from "../components/ui/MiniAppRecord";
import { MiniAppDataState } from "../components/MiniAppDataState";
import { CustomerAmount, CustomerCard, CustomerList, CustomerPage, CustomerPosition, CustomerQueryState, CustomerRecord, CustomerSection } from "../components/customer/CustomerUI";
import { formatCustomerDate } from "../format";
import { useMiniAppQuery } from "../hooks/useMiniAppQuery";
import type { CustomerAccountData } from "../types";

export const CustomerAccount: React.FC = () => {
  const query = useMiniAppQuery<CustomerAccountData>("/api/miniapp/customer/account");
  const d = query.data;
  return <CustomerPage id="account-title" title="حساب من" artwork="money" description="وضعیت حساب و گردش‌های ثبت‌شده فروشگاه">
    <CustomerQueryState query={query}>{d && <>
      <CustomerPosition account={d.account} signed />
      <CustomerSection title="خلاصه دفتر حساب"><CustomerCard><CustomerAmount label="جمع بدهکار" value={d.totalDebit} field="totalDebit" /><CustomerAmount label="جمع بستانکار" value={d.totalCredit} field="totalCredit" /></CustomerCard></CustomerSection>
      <CustomerSection title="گردش‌های اخیر" description="مبالغ هر ردیف مطابق دفتر حساب؛ فهرست کامل سوابق نیست">
        {d.entries.length ? <CustomerList>{d.entries.map(entry => <CustomerRecord key={entry.id} record={entry.id} title={entry.description} detail={<RecordMeta>{`${formatCustomerDate(entry.transactionDate)} · رکورد ${entry.id.toLocaleString("fa-IR")}`}</RecordMeta>}><FinancialGrid>
          <CustomerAmount label="بدهکار" value={entry.debit} field={`ledger-${entry.id}-debit`} /><CustomerAmount label="بستانکار" value={entry.credit} field={`ledger-${entry.id}-credit`} /><CustomerAmount label="مانده با علامت دفتر حساب" value={entry.balance} field={`ledger-${entry.id}-balance`} />
        </FinancialGrid></CustomerRecord>)}</CustomerList> : <MiniAppDataState empty emptyText="هنوز گردش حسابی در این گزارش ثبت نشده است. ثبت‌های مربوط به حساب شما در این بخش نمایش داده می‌شوند." />}
      </CustomerSection>
    </>}</CustomerQueryState>
  </CustomerPage>;
};
