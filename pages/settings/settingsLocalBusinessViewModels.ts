import type { BusinessInformationSettings } from '../../types';
import { normalizeCurrencyUnit } from '../../utils/currency';

export interface SettingsLocalDomainViewModel {
  localHostnameValue: string;
  localSuffixValue: string;
  localDomainValue: string;
  localBaseUrlValue: string;
  localHostsLineValue: string;
}

export const buildSettingsLocalDomainViewModel = (businessInfo: BusinessInformationSettings): SettingsLocalDomainViewModel => {
  const localHostnameValue = String(businessInfo.local_hostname || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
  const localSuffixRawValue = String(businessInfo.local_domain_suffix || 'home.arpa')
    .trim()
    .toLowerCase()
    .replace(/^\.+/, '')
    .replace(/\.+$/, '');
  const localSuffixValue = localSuffixRawValue;
  const localDomainValue = localHostnameValue && localSuffixValue ? `${localHostnameValue}.${localSuffixValue}` : '';
  const localBaseUrlValue = localDomainValue ? `https://${localDomainValue}:5173/#/` : '';
  const localHostsIpValue = String(businessInfo.local_hosts_ip || '').trim();
  const localHostsSuggestedIp = localSuffixValue === 'localhost' ? '127.0.0.1' : localHostsIpValue;
  const storedHostsLine = String(businessInfo.local_hosts_line || '').trim();
  const localHostsLineValue = storedHostsLine || (localDomainValue && localHostsSuggestedIp ? `${localHostsSuggestedIp} ${localDomainValue}` : '');

  return {
    localHostnameValue,
    localSuffixValue,
    localDomainValue,
    localBaseUrlValue,
    localHostsLineValue,
  };
};

export const buildSettingsBusinessPanelViewModel = (businessInfo: BusinessInformationSettings) => {
  const businessSummaryItems = [
    { label: 'تلفن', value: businessInfo.store_phone || 'ثبت نشده', icon: 'fa-phone' },
    { label: 'ایمیل', value: businessInfo.store_email || 'ثبت نشده', icon: 'fa-envelope' },
    { label: 'واحد پول', value: normalizeCurrencyUnit(businessInfo.currency_unit) === 'rial' ? 'ریال' : 'تومان', icon: 'fa-coins' },
    { label: 'QR عمومی', value: businessInfo.qr_public_base_url ? 'فعال' : 'تنظیم نشده', icon: 'fa-qrcode' },
  ];
  const businessAddressSummary = [
    businessInfo.store_address_line1,
    businessInfo.store_address_line2,
    businessInfo.store_city_state_zip,
  ]
    .filter(Boolean)
    .join('، ');

  return { businessSummaryItems, businessAddressSummary };
};
