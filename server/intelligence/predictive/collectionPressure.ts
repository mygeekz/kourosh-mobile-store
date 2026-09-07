import type moment from "jalali-moment";
import { getAsync } from "../../database";
import { predictiveNum } from "./predictiveUtils";

export const buildCollectionPressure = async (
  end: moment.Moment,
  toISO: string,
) => {
  const overdue = await getAsync(
    `
      SELECT COUNT(*) AS overdueCount, COALESCE(SUM(amountDue), 0) AS overdueAmount
      FROM installment_payments
      WHERE COALESCE(status, 'پرداخت نشده') <> 'پرداخت شده'
        AND REPLACE(dueDate, '/', '-') < ?
    `,
    [toISO],
  ).catch(() => ({ overdueCount: 0, overdueAmount: 0 }) as any);

  const dueSoon = await getAsync(
    `
      SELECT COUNT(*) AS dueSoonCount, COALESCE(SUM(amountDue), 0) AS dueSoonAmount
      FROM installment_payments
      WHERE COALESCE(status, 'پرداخت نشده') <> 'پرداخت شده'
        AND REPLACE(dueDate, '/', '-') BETWEEN ? AND ?
    `,
    [toISO, end.clone().add(7, "day").format("YYYY-MM-DD")],
  ).catch(() => ({ dueSoonCount: 0, dueSoonAmount: 0 }) as any);

  return {
    overdue,
    dueSoon,
    collection: {
      overdueCount: predictiveNum(overdue?.overdueCount),
      overdueAmount: predictiveNum(overdue?.overdueAmount),
      dueSoonCount: predictiveNum(dueSoon?.dueSoonCount),
      dueSoonAmount: predictiveNum(dueSoon?.dueSoonAmount),
    },
  };
};
