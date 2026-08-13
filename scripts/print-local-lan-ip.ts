import {
  getPreferredLocalIPv4,
  isUsableLanIPv4,
} from '../server/utils/localSettingsHelpers';

const requested = String(process.env.KOUROSH_HTTPS_HOST || '').trim();
if (requested && !isUsableLanIPv4(requested)) {
  console.error(`[network] Ignoring unusable KOUROSH_HTTPS_HOST value: ${requested}`);
}

// Ignore stale LOCAL_HOSTS_IP/VITE_LOCAL_HOSTS_IP values here. The launcher is
// the source of truth and only KOUROSH_HTTPS_HOST is an intentional override.
const lanIp = getPreferredLocalIPv4(
  isUsableLanIPv4(requested) ? requested : '',
);

if (!isUsableLanIPv4(lanIp)) {
  console.error('[network] No usable LAN IPv4 address was found. Connect this computer to Wi-Fi or Ethernet and start Kourosh again.');
  process.exitCode = 1;
} else {
  process.stdout.write(lanIp);
}
