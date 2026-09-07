import { allAsync } from "../../database";
import {
  mobileAnalyticsNumber,
  mobileAnalyticsRound,
} from "./mobileSalesAnalyticsUtils";

export type MobileAnalyticsPartnerCapitalResult = {
  partnerCapitalRows: any[];
  partnerCapitalSummary: any;
};

const createEmptyPartnerCapitalSummary = () => ({
  partnersCount: 0,
  totalPhonesHad: 0,
  totalCashSoldCount: 0,
  totalInstallmentSoldCount: 0,
  totalRemainingCount: 0,
  totalSoldCapitalAtCurrentPrice: 0,
  totalInventoryCapitalAtCurrentPrice: 0,
  totalPaidToPartners: 0,
  totalReceivedFromPartners: 0,
  totalRemainingCapitalBalance: 0,
});

export async function buildMobileAnalyticsPartnerCapital({
  cashRows: _cashRows,
  installmentRows: _installmentRows,
}: {
  cashRows: any[];
  installmentRows: any[];
}): Promise<MobileAnalyticsPartnerCapitalResult> {
  let partnerCapitalRows: any[] = [];
  let partnerCapitalSummary: any = createEmptyPartnerCapitalSummary();

  try {
    const phoneSaleSources = await allAsync(
      `
        SELECT DISTINCT soi.itemId AS phoneId, 'cash' AS saleKind
        FROM sales_order_items soi
        JOIN sales_orders so ON so.id = soi.orderId
        WHERE soi.itemType = 'phone' AND (so.status IS NULL OR so.status = 'active')

        UNION

        SELECT DISTINCT st.itemId AS phoneId, 'cash' AS saleKind
        FROM sales_transactions st
        WHERE st.itemType = 'phone'

        UNION

        SELECT DISTINCT isi.itemId AS phoneId, 'installment' AS saleKind
        FROM installment_sale_items isi
        WHERE isi.itemType = 'phone'

        UNION

        SELECT DISTINCT isale.phoneId AS phoneId, 'installment' AS saleKind
        FROM installment_sales isale
        WHERE isale.phoneId IS NOT NULL
          AND COALESCE(isale.status,'active') = 'active'
      `,
      [],
    );
    const cashPhoneIds = new Set<number>();
    const installmentPhoneIds = new Set<number>();
    for (const row of phoneSaleSources as any[]) {
      const phoneId = Number(row.phoneId || 0);
      if (!phoneId) continue;
      if (row.saleKind === "installment") installmentPhoneIds.add(phoneId);
      else cashPhoneIds.add(phoneId);
    }

    let partnerPhoneRows: any[] = [];
    try {
      partnerPhoneRows = await allAsync(
        `
          SELECT
            sp.id AS storePartnerId,
            sp.name AS partnerName,
            sp.colorTag AS colorTag,
            ph.id AS phoneId,
            ph.model AS phoneModel,
            ph.imei AS imei,
            ph.status AS phoneStatus,
            COALESCE(ph.purchasePrice, 0) AS purchasePrice,
            COALESCE(NULLIF(ph.currentPurchasePrice, 0), ph.purchasePrice, 0) AS currentPurchasePrice,
            COALESCE(opi.sharePercent, 0) AS sharePercent,
            'store_partner' AS partnerSource
          FROM phones ph
          JOIN ownership_profile_items opi ON opi.ownershipProfileId = ph.ownershipProfileId
          JOIN store_partners sp ON sp.id = opi.storePartnerId
          WHERE COALESCE(opi.sharePercent, 0) > 0
        `,
        [],
      );
    } catch {
      partnerPhoneRows = [];
    }

    if (!partnerPhoneRows.length) {
      partnerPhoneRows = await allAsync(
        `
          SELECT
            pa.id AS storePartnerId,
            pa.partnerName AS partnerName,
            NULL AS colorTag,
            ph.id AS phoneId,
            ph.model AS phoneModel,
            ph.imei AS imei,
            ph.status AS phoneStatus,
            COALESCE(ph.purchasePrice, 0) AS purchasePrice,
            COALESCE(NULLIF(ph.currentPurchasePrice, 0), ph.purchasePrice, 0) AS currentPurchasePrice,
            100 AS sharePercent,
            'legacy_supplier' AS partnerSource
          FROM phones ph
          JOIN partners pa ON pa.id = ph.supplierId
          WHERE ph.supplierId IS NOT NULL
        `,
        [],
      );
    }

    let settlementRows: any[] = [];
    try {
      settlementRows = await allAsync(
        `SELECT fromStorePartnerId, destinationKind, toStorePartnerId, amount FROM partner_settlement_transactions WHERE status = 'active'`,
        [],
      );
    } catch {
      settlementRows = [];
    }

    const txMap = new Map<
      number,
      {
        paidAmount: number;
        receivedAmount: number;
        netSettledAmount: number;
      }
    >();
    for (const tx of settlementRows as any[]) {
      const amount = mobileAnalyticsNumber(tx.amount);
      const fromId = Number(tx.fromStorePartnerId || 0);
      const toId = Number(tx.toStorePartnerId || 0);
      if (fromId) {
        const prev = txMap.get(fromId) || {
          paidAmount: 0,
          receivedAmount: 0,
          netSettledAmount: 0,
        };
        prev.paidAmount += amount;
        prev.netSettledAmount = prev.receivedAmount - prev.paidAmount;
        txMap.set(fromId, prev);
      }
      if (String(tx.destinationKind || "partner") === "partner" && toId) {
        const prev = txMap.get(toId) || {
          paidAmount: 0,
          receivedAmount: 0,
          netSettledAmount: 0,
        };
        prev.receivedAmount += amount;
        prev.netSettledAmount = prev.receivedAmount - prev.paidAmount;
        txMap.set(toId, prev);
      }
    }

    const partnerMap = new Map<number, any>();
    const ensurePartner = (row: any) => {
      const id = Number(row.storePartnerId || 0);
      if (!partnerMap.has(id)) {
        partnerMap.set(id, {
          storePartnerId: id,
          partnerName: row.partnerName || "شریک/همکار",
          colorTag: row.colorTag || null,
          partnerSource: row.partnerSource || "store_partner",
          totalPhonesHad: 0,
          cashSoldCount: 0,
          installmentSoldCount: 0,
          remainingCount: 0,
          soldCount: 0,
          initialPurchaseCapital: 0,
          soldCapitalAtCurrentPrice: 0,
          cashSoldCapitalAtCurrentPrice: 0,
          installmentSoldCapitalAtCurrentPrice: 0,
          inventoryCapitalAtCurrentPrice: 0,
          replacementDeltaCapital: 0,
          paidSettlementAmount: 0,
          receivedSettlementAmount: 0,
          netSettledAmount: 0,
          remainingCapitalBalance: 0,
          phones: [],
        });
      }
      return partnerMap.get(id);
    };

    const seenPartnerPhoneState = new Set<string>();
    for (const row of partnerPhoneRows as any[]) {
      const partner = ensurePartner(row);
      const phoneId = Number(row.phoneId || 0);
      const sharePercent = Math.max(
        0,
        mobileAnalyticsNumber(row.sharePercent),
      );
      const shareRatio = sharePercent / 100;
      const purchasePrice = mobileAnalyticsNumber(row.purchasePrice);
      const currentPurchasePrice =
        mobileAnalyticsNumber(row.currentPurchasePrice) || purchasePrice;
      const initialShare = purchasePrice * shareRatio;
      const currentShare = currentPurchasePrice * shareRatio;
      const soldInstallment = installmentPhoneIds.has(phoneId);
      const soldCash = !soldInstallment && cashPhoneIds.has(phoneId);
      const statusText = String(row.phoneStatus || "");
      const soldByStatus =
        statusText.includes("فروخته") || soldCash || soldInstallment;
      const stateKey = `${partner.storePartnerId}:${phoneId}:${soldCash ? "cash" : soldInstallment ? "installment" : soldByStatus ? "sold" : "remaining"}`;
      if (!seenPartnerPhoneState.has(stateKey)) {
        seenPartnerPhoneState.add(stateKey);
        partner.totalPhonesHad += 1;
        partner.initialPurchaseCapital += initialShare;
        partner.replacementDeltaCapital += currentShare - initialShare;
        if (soldCash) {
          partner.cashSoldCount += 1;
          partner.soldCount += 1;
          partner.soldCapitalAtCurrentPrice += currentShare;
          partner.cashSoldCapitalAtCurrentPrice += currentShare;
        } else if (soldInstallment) {
          partner.installmentSoldCount += 1;
          partner.soldCount += 1;
          partner.soldCapitalAtCurrentPrice += currentShare;
          partner.installmentSoldCapitalAtCurrentPrice += currentShare;
        } else if (!soldByStatus) {
          partner.remainingCount += 1;
          partner.inventoryCapitalAtCurrentPrice += currentShare;
        } else {
          partner.soldCount += 1;
          partner.soldCapitalAtCurrentPrice += currentShare;
        }
      }
      partner.phones.push({
        phoneId,
        phoneModel: row.phoneModel || "گوشی",
        imei: row.imei || "",
        phoneStatus: row.phoneStatus || "",
        sharePercent,
        purchasePrice: mobileAnalyticsRound(purchasePrice),
        currentPurchasePrice: mobileAnalyticsRound(currentPurchasePrice),
        partnerCapitalAtCurrentPrice: mobileAnalyticsRound(currentShare),
        saleKind: soldCash
          ? "cash"
          : soldInstallment
            ? "installment"
            : soldByStatus
              ? "sold"
              : "remaining",
      });
    }

    for (const row of partnerMap.values()) {
      const tx = txMap.get(Number(row.storePartnerId)) || {
        paidAmount: 0,
        receivedAmount: 0,
        netSettledAmount: 0,
      };
      row.paidSettlementAmount = mobileAnalyticsRound(tx.paidAmount);
      row.receivedSettlementAmount = mobileAnalyticsRound(tx.receivedAmount);
      row.netSettledAmount = mobileAnalyticsRound(tx.netSettledAmount);
      row.remainingCapitalBalance = mobileAnalyticsRound(
        row.soldCapitalAtCurrentPrice +
          row.paidSettlementAmount -
          row.receivedSettlementAmount,
      );
      row.initialPurchaseCapital = mobileAnalyticsRound(
        row.initialPurchaseCapital,
      );
      row.soldCapitalAtCurrentPrice = mobileAnalyticsRound(
        row.soldCapitalAtCurrentPrice,
      );
      row.cashSoldCapitalAtCurrentPrice = mobileAnalyticsRound(
        row.cashSoldCapitalAtCurrentPrice,
      );
      row.installmentSoldCapitalAtCurrentPrice = mobileAnalyticsRound(
        row.installmentSoldCapitalAtCurrentPrice,
      );
      row.inventoryCapitalAtCurrentPrice = mobileAnalyticsRound(
        row.inventoryCapitalAtCurrentPrice,
      );
      row.replacementDeltaCapital = mobileAnalyticsRound(
        row.replacementDeltaCapital,
      );
      row.phones = (row.phones || []).slice(0, 20);
    }
    partnerCapitalRows = Array.from(partnerMap.values()).sort(
      (a, b) =>
        Math.abs(mobileAnalyticsNumber(b.remainingCapitalBalance)) -
        Math.abs(mobileAnalyticsNumber(a.remainingCapitalBalance)),
    );
    partnerCapitalSummary = {
      partnersCount: partnerCapitalRows.length,
      totalPhonesHad: partnerCapitalRows.reduce(
        (sum, row) => sum + Number(row.totalPhonesHad || 0),
        0,
      ),
      totalCashSoldCount: partnerCapitalRows.reduce(
        (sum, row) => sum + Number(row.cashSoldCount || 0),
        0,
      ),
      totalInstallmentSoldCount: partnerCapitalRows.reduce(
        (sum, row) => sum + Number(row.installmentSoldCount || 0),
        0,
      ),
      totalRemainingCount: partnerCapitalRows.reduce(
        (sum, row) => sum + Number(row.remainingCount || 0),
        0,
      ),
      totalSoldCapitalAtCurrentPrice: mobileAnalyticsRound(
        partnerCapitalRows.reduce(
          (sum, row) =>
            sum + mobileAnalyticsNumber(row.soldCapitalAtCurrentPrice),
          0,
        ),
      ),
      totalInventoryCapitalAtCurrentPrice: mobileAnalyticsRound(
        partnerCapitalRows.reduce(
          (sum, row) =>
            sum + mobileAnalyticsNumber(row.inventoryCapitalAtCurrentPrice),
          0,
        ),
      ),
      totalPaidToPartners: mobileAnalyticsRound(
        partnerCapitalRows.reduce(
          (sum, row) => sum + mobileAnalyticsNumber(row.paidSettlementAmount),
          0,
        ),
      ),
      totalReceivedFromPartners: mobileAnalyticsRound(
        partnerCapitalRows.reduce(
          (sum, row) =>
            sum + mobileAnalyticsNumber(row.receivedSettlementAmount),
          0,
        ),
      ),
      totalRemainingCapitalBalance: mobileAnalyticsRound(
        partnerCapitalRows.reduce(
          (sum, row) =>
            sum + mobileAnalyticsNumber(row.remainingCapitalBalance),
          0,
        ),
      ),
    };
  } catch (partnerErr) {
    console.error("mobile-sales partner capital analytics failed:", partnerErr);
  }

  return { partnerCapitalRows, partnerCapitalSummary };
}
