import type { CommercialPlanKey } from '../../utils/featureFlags';

export const commercialPlanUiCopy: Record<CommercialPlanKey, { titleFa: string; short: string; audience: string }> = {
  lite: { titleFa: 'لایت', short: 'شروع سبک و ضروری', audience: 'فروشگاه‌های کوچک و شروع کار' },
  standard: { titleFa: 'استاندارد', short: 'فروش و گزارش متعادل', audience: 'مناسب فروش روزمره و CRM پایه' },
  pro: { titleFa: 'حرفه‌ای', short: 'کنترل کامل‌تر عملیات', audience: 'برای فروشگاه‌های فعال‌تر' },
  enterprise: { titleFa: 'سازمانی', short: 'بیشترین پوشش ماژول‌ها', audience: 'برای تیم‌های بزرگ و چندبخشی' },
};
