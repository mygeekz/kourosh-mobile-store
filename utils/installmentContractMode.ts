import type { CheckOwnershipType, InstallmentCheckInfo } from '../types';

export type SmartSaleContractMode =
  | 'installment_no_check'
  | 'installment_buyer_checks'
  | 'installment_third_party_checks'
  | 'installment_mixed_checks'
  | 'check_buyer_checks'
  | 'check_third_party_checks'
  | 'check_mixed_checks';

export type SmartSaleContractModeMeta = {
  mode: SmartSaleContractMode;
  title: string;
  subtitle: string;
  isInstallment: boolean;
  hasChecks: boolean;
  hasBuyerChecks: boolean;
  hasThirdPartyChecks: boolean;
  buyerCheckCount: number;
  thirdPartyCheckCount: number;
};

const ownershipOf = (check: Pick<InstallmentCheckInfo, 'ownershipType'>): CheckOwnershipType | null =>
  check.ownershipType === 'buyer' || check.ownershipType === 'third_party'
    ? check.ownershipType
    : null;

export const resolveSmartSaleContractMode = (
  saleType: 'installment' | 'check' | string | null | undefined,
  checks: Array<Pick<InstallmentCheckInfo, 'ownershipType'>>,
): SmartSaleContractModeMeta => {
  const isInstallment = saleType !== 'check';
  const buyerCheckCount = checks.filter((check) => ownershipOf(check) === 'buyer').length;
  const thirdPartyCheckCount = checks.filter((check) => ownershipOf(check) === 'third_party').length;
  const hasBuyerChecks = buyerCheckCount > 0;
  const hasThirdPartyChecks = thirdPartyCheckCount > 0;
  const hasChecks = checks.length > 0;

  if (!hasChecks) {
    return {
      mode: 'installment_no_check',
      title: 'قرارداد فروش اقساطی بدون چک',
      subtitle: 'کالا و خدمات مندرج در قرارداد با برنامه پرداخت اقساطی',
      isInstallment: true,
      hasChecks: false,
      hasBuyerChecks: false,
      hasThirdPartyChecks: false,
      buyerCheckCount: 0,
      thirdPartyCheckCount: 0,
    };
  }

  const ownerLabel = hasBuyerChecks && hasThirdPartyChecks
    ? 'چک خریدار و شخص ثالث'
    : hasThirdPartyChecks
      ? 'چک شخص ثالث'
      : 'چک خریدار';
  const mode = isInstallment
    ? hasBuyerChecks && hasThirdPartyChecks
      ? 'installment_mixed_checks'
      : hasThirdPartyChecks
        ? 'installment_third_party_checks'
        : 'installment_buyer_checks'
    : hasBuyerChecks && hasThirdPartyChecks
      ? 'check_mixed_checks'
      : hasThirdPartyChecks
        ? 'check_third_party_checks'
        : 'check_buyer_checks';

  return {
    mode,
    title: isInstallment ? `قرارداد فروش اقساطی با ${ownerLabel}` : `قرارداد فروش با ${ownerLabel}`,
    subtitle: isInstallment
      ? 'کالا و خدمات مندرج در قرارداد با برنامه اقساط و ابزار پرداخت ثبت‌شده'
      : 'کالا و خدمات مندرج در قرارداد با ابزار پرداخت ثبت‌شده',
    isInstallment,
    hasChecks: true,
    hasBuyerChecks,
    hasThirdPartyChecks,
    buyerCheckCount,
    thirdPartyCheckCount,
  };
};

export const getCheckOwnershipLabel = (ownershipType: CheckOwnershipType | null | undefined): string =>
  ownershipType === 'buyer' ? 'چک خریدار' : ownershipType === 'third_party' ? 'چک شخص ثالث' : 'مالک نامشخص';
