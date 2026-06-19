// فایل: server/smsService.ts (کد کامل و نهایی)

import fetch from 'node-fetch';

const SHOULD_LOG_EXTERNAL_ERRORS =
  String(process.env.NODE_ENV || '').trim() === 'production' &&
  String(process.env.EXTERNAL_SERVICE_LOGS || '').trim() === '1';

const logExternalError = (...args: any[]) => {
  if (SHOULD_LOG_EXTERNAL_ERRORS) console.error(...args);
};


interface MeliPayamakResponse {
  Value: string;
  RetStatus: number;
  StrRetStatus: string;
}

interface SmsResult {
  success: boolean;
  message: string;
  details?: MeliPayamakResponse | { error: string; endpoint?: string; rawResponseText?: string; httpStatus?: number };
}

type FetchLikeInit = RequestInit & { agent?: any };

const fetchWithDnsFallback = (url: string, init: FetchLikeInit = {}) =>
  fetch(url, { ...init } as any);

const MeliPayamakPatternErrorHints: Record<string, string> = {
  '-108': 'این پترن یا خط خدماتی اشتراکی هنوز برای ارسال فعال نشده یا BodyId/الگو با پنل شما هم‌خوان نیست.',
};

const mapMeliPayamakPatternError = (code: string) => {
  const hint = MeliPayamakPatternErrorHints[code];
  return hint ? `خطا در عملیات از ملی پیامک (کد ${code}) — ${hint}` : `خطا در عملیات از ملی پیامک (کد ${code})`;
};

const isLikelySuccessRecId = (value: string) => {
  const result = String(value || '').trim();
  return /^[+-]?\d+$/.test(result) && !result.startsWith('-') && result.length > 15;
};



/**
 * Sends a templated SMS through the MeliPayamak service (pattern-based SMS).
 *
 * @param to Recipient phone number in Iranian format (e.g., 09121234567)
 * @param bodyId Pattern ID defined in the MeliPayamak panel
 * @param text   Text parameters separated by semicolons in order expected by the pattern
 * @param username Account username for MeliPayamak
 * @param password Account password for MeliPayamak
 */
export const sendMeliPayamakPatternSms = async (
  to: string,
  bodyId: number,
  tokens: string[],
  username: string,
  password: string
): Promise<SmsResult> => {
  // ملی‌پیامک: برای «خط خدماتی اشتراکی» در پیش‌نمایش‌کدهای رسمی، REST با BaseServiceNumber و SOAP با SendByBaseNumber2 آمده است.
  // مسیر ارسال این نسخه مستقیم است و در صورت خطا در عملیاتی شبکه، خطا در عملیات به‌صورت شفاف برمی‌گردد.

  const escapeXml = (s: string) =>
    s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');

  const normalizedTokens = tokens
    .filter((t) => t !== undefined && t !== null)
    .map((t) => String(t));

  const tryRest = async (): Promise<SmsResult> => {
    const endpoint = 'https://rest.payamak-panel.com/api/SendSMS/BaseServiceNumber';
    const payload = new URLSearchParams({
      username,
      password,
      text: normalizedTokens.join(';'),
      to,
      bodyId: String(bodyId),
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    try {
      const resp = await fetchWithDnsFallback(endpoint, {
        method: 'POST',
        body: payload as any,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json' },
        signal: controller.signal,
      });
      const rawResponseText = await resp.text();
      clearTimeout(timeoutId);

      let parsed: any = {};
      try { parsed = rawResponseText ? JSON.parse(rawResponseText) : {}; } catch { parsed = { raw: rawResponseText }; }

      const value = String(parsed?.Value ?? parsed?.value ?? parsed?.recId ?? parsed?.RecId ?? '').trim();
      if (resp.ok && isLikelySuccessRecId(value)) {
        return {
          success: true,
          message: 'پیامک با موفقیت ارسال شد.',
          details: { Value: value, RetStatus: 1, StrRetStatus: 'OK', endpoint, httpStatus: resp.status, rawResponseText } as any,
        };
      }

      const code = value || String(parsed?.ErrorCode ?? parsed?.errorCode ?? parsed?.status ?? '').trim();
      const msg = code ? mapMeliPayamakPatternError(code) : 'پاسخ نامعتبر از ملی پیامک';
      return {
        success: false,
        message: msg,
        details: { error: msg, endpoint, rawResponseText, httpStatus: resp.status },
      };
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error?.name === 'AbortError') {
        return { success: false, message: 'ارتباط با ملی پیامک بیش از حد طول کشید (Timeout).', details: { error: 'Timeout', endpoint } };
      }
      const msg = error?.message || 'خطا در عملیاتی پیش‌بینی نشده در سرویس ملی پیامک.';
      const netHint = /EAI_AGAIN|ENOTFOUND|ECONNRESET|ETIMEDOUT|EHOSTUNREACH|fetch failed/i.test(msg)
        ? ' (مشکل DNS/شبکه یا پراکسی)'
        : '';
      return { success: false, message: `${msg}${netHint}`, details: { error: String(error?.message || error), endpoint } };
    }
  };

  const trySoap2 = async (): Promise<SmsResult> => {
    const endpoint = 'https://api.payamak-panel.com/post/send.asmx';
    const soapAction = '"http://tempuri.org/SendByBaseNumber2"';
    const tokensXml = normalizedTokens.map((t) => `<string>${escapeXml(String(t))}</string>`).join('');
    const xml = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
               xmlns:xsd="http://www.w3.org/2001/XMLSchema"
               xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <SendByBaseNumber2 xmlns="http://tempuri.org/">
      <username>${escapeXml(username)}</username>
      <password>${escapeXml(password)}</password>
      <text>${tokensXml}</text>
      <to>${escapeXml(to)}</to>
      <bodyId>${bodyId}</bodyId>
    </SendByBaseNumber2>
  </soap:Body>
</soap:Envelope>`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    try {
      const resp = await fetchWithDnsFallback(endpoint, {
        method: 'POST',
        body: xml,
        headers: {
          'Content-Type': 'text/xml; charset=utf-8',
          'Accept': 'text/xml',
          SOAPAction: soapAction,
        },
        signal: controller.signal,
      });
      const rawResponseText = await resp.text();
      clearTimeout(timeoutId);

      if (!resp.ok) {
        return { success: false, message: `خطا در ارتباط با ملی پیامک: ${resp.statusText}`, details: { error: rawResponseText, endpoint, rawResponseText, httpStatus: resp.status } };
      }

      const match = rawResponseText.match(/<SendByBaseNumber2Result[^>]*>([^<]+)<\/SendByBaseNumber2Result>/i);
      const result = match ? match[1].trim() : '';
      if (isLikelySuccessRecId(result)) {
        return { success: true, message: 'پیامک با موفقیت ارسال شد.', details: { Value: result, RetStatus: 1, StrRetStatus: 'OK', endpoint, httpStatus: resp.status, rawResponseText } as any };
      }

      const code = result || 'UNKNOWN';
      const msg = code !== 'UNKNOWN' ? mapMeliPayamakPatternError(code) : 'پاسخ نامعتبر از ملی پیامک';
      return { success: false, message: msg, details: { error: msg, endpoint, rawResponseText, httpStatus: resp.status } };
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error?.name === 'AbortError') {
        return { success: false, message: 'ارتباط با ملی پیامک بیش از حد طول کشید (Timeout).', details: { error: 'Timeout', endpoint } };
      }
      const msg = error?.message || 'خطا در عملیاتی پیش‌بینی نشده در سرویس ملی پیامک.';
      const netHint = /EAI_AGAIN|ENOTFOUND|ECONNRESET|ETIMEDOUT|EHOSTUNREACH|fetch failed/i.test(msg)
        ? ' (مشکل DNS/شبکه یا پراکسی)'
        : '';
      return { success: false, message: `${msg}${netHint}`, details: { error: String(error?.message || error), endpoint } };
    }
  };

  const restResult = await tryRest();
  if (restResult.success) return restResult;

  const restErrorMsg = String(restResult.message || '');
  const shouldFallbackToSoap = /-108|پاسخ نامعتبر|Timeout|ارتباط با ملی پیامک|خطا در ارتباط|EAI_AGAIN|ENOTFOUND|ECONNRESET|ETIMEDOUT|EHOSTUNREACH|fetch failed|network/i.test(restErrorMsg);
  if (!shouldFallbackToSoap) return restResult;

  const soapResult = await trySoap2();
  if (soapResult.success) return soapResult;

  // اگر SOAP هم خطا در عملیاتی مشخص‌تری داد، همان را برگردانیم.
  return soapResult.message.includes('خطا در عملیات از ملی پیامک') ? soapResult : restResult;
};

/**
 * Send a pattern-based SMS using the Kavenegar REST API.
 * This uses the verify lookup endpoint which accepts up to three tokens
 * corresponding to previews defined in the template on the Kavenegar panel.
 * See Kavenegar usage examples for Node.js: requiring the module and calling
 * `VerifyLookup` with receptor, token and template name【274018873460052†L140-L166】.
 *
 * @param to Recipient phone number (e.g., 09121234567)
 * @param template Template name/code defined on Kavenegar panel
 * @param tokens  Array of up to three strings to substitute into the template
 * @param apiKey  API key for Kavenegar
 */
export const sendKavenegarPatternSms = async (
  to: string,
  template: string,
  tokens: string[],
  apiKey: string
): Promise<SmsResult> => {
  const params = new URLSearchParams();
  params.append('receptor', to);
  params.append('template', template);
  if (tokens[0]) params.append('token', tokens[0]);
  if (tokens[1]) params.append('token2', tokens[1]);
  if (tokens[2]) params.append('token3', tokens[2]);

  const url = `https://api.kavenegar.com/v1/${apiKey}/verify/lookup.json?${params.toString()}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);
  try {
    const resp = await fetchWithDnsFallback(url, { method: 'GET', signal: controller.signal });
    clearTimeout(timeoutId);
    if (!resp.ok) {
      const errTxt = await resp.text();
      logExternalError('Kavenegar API responded with status', resp.status, errTxt);
      throw new Error(`خطا در ارتباط با کاوه نگار: ${resp.statusText}`);
    }
    const body = await resp.json().catch(() => ({}));
    // Kavenegar returns a status; check if returning OK
    if (body.return && body.return.status === 200) {
      return { success: true, message: 'پیامک با موفقیت ارسال شد.', details: body };
    }
    // fallback to success if no explicit return object
    return { success: true, message: 'پیامک ارسال شد.', details: body };
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      return { success: false, message: 'ارتباط با سرویس کاوه نگار بیش از حد طول کشید (Timeout).' };
    }
    logExternalError('Error sending SMS via Kavenegar:', error);
    return { success: false, message: error.message || 'خطا در عملیاتی پیش‌بینی نشده در سرویس کاوه نگار.' };
  }
};

/**
 * Send a pattern (verify) SMS using the SMS.ir REST API. The API requires
 * sending a POST request with the recipient mobile, a numeric templateId and
 * a list of parameters. A Node/axios example on SMS.ir’s documentation shows
 * constructing a JSON payload with mobile, templateId and parameters and
 * posting it to https://api.sms.ir/v1/send/verify with an x-api-key header【597773959572808†L56-L75】.
 *
 * @param to       Recipient phone number (e.g., 09121234567)
 * @param templateId Numeric template identifier defined on SMS.ir
 * @param tokens   Up to three strings that replace parameters in the template
 * @param apiKey   API key issued by SMS.ir
 */
export const sendSmsIrPatternSms = async (
  to: string,
  templateId: number,
  tokens: string[],
  apiKey: string
): Promise<SmsResult> => {
  const paramsList = [] as { name: string; value: string }[];
  if (tokens[0]) paramsList.push({ name: 'PARAMETER1', value: tokens[0] });
  if (tokens[1]) paramsList.push({ name: 'PARAMETER2', value: tokens[1] });
  if (tokens[2]) paramsList.push({ name: 'PARAMETER3', value: tokens[2] });
  const payload = {
    mobile: to,
    templateId,
    parameters: paramsList
  };
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);
  try {
    const resp = await fetchWithDnsFallback('https://api.sms.ir/v1/send/verify', {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/plain',
        'x-api-key': apiKey
      },
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (!resp.ok) {
      const text = await resp.text();
      logExternalError('SMS.ir API responded with status', resp.status, text);
      throw new Error(`خطا در ارتباط با SMS.ir: ${resp.statusText}`);
    }
    const result = await resp.json().catch(() => ({}));
    return { success: true, message: 'پیامک با موفقیت ارسال شد.', details: result };
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      return { success: false, message: 'ارتباط با سرویس SMS.ir بیش از حد طول کشید (Timeout).' };
    }
    logExternalError('Error sending SMS via SMS.ir:', error);
    return { success: false, message: error.message || 'خطا در عملیاتی پیش‌بینی نشده در سرویس SMS.ir.' };
  }
};

/**
 * Send a pattern-based SMS using the IPPanel Edge API. According to the
 * documentation, the pattern API requires a POST to {base_url}/api/send with
 * a JSON body specifying sending_type="pattern", from_number, pattern code,
 * recipients and params. Required headers include Authorization with your
 * token and Content-Type set to application/json【680586043900409†L62-L100】.
 *
 * @param to        Recipient phone number in E.164 format (e.g., +989121234567)
 * @param patternCode Pattern code assigned to the template in IPPanel
 * @param tokens    Up to three values to substitute into the pattern
 * @param tokenAuth API token for IPPanel (used in Authorization header)
 * @param fromNumber Sender number registered with your IPPanel account
 */
export const sendIppanelPatternSms = async (
  to: string,
  patternCode: string,
  tokens: string[],
  tokenAuth: string,
  fromNumber: string
): Promise<SmsResult> => {
  // Construct parameters object keyed generically as p1,p2,p3
  const params: Record<string, string> = {};
  if (tokens[0]) params.p1 = tokens[0];
  if (tokens[1]) params.p2 = tokens[1];
  if (tokens[2]) params.p3 = tokens[2];

  const payload = {
    sending_type: 'pattern',
    from_number: fromNumber,
    code: patternCode,
    recipients: [to],
    params
  };
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);
  try {
    const resp = await fetchWithDnsFallback('https://edge.ippanel.com/v1/api/send', {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: {
        'Content-Type': 'application/json',
        Authorization: tokenAuth
      },
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (!resp.ok) {
      const text = await resp.text();
      logExternalError('IPPanel API responded with status', resp.status, text);
      throw new Error(`خطا در ارتباط با IPPANEL: ${resp.statusText}`);
    }
    const result = await resp.json().catch(() => ({}));
    return { success: true, message: 'پیامک با موفقیت ارسال شد.', details: result };
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      return { success: false, message: 'ارتباط با سرویس IPPANEL بیش از حد طول کشید (Timeout).' };
    }
    logExternalError('Error sending SMS via IPPANEL:', error);
    return { success: false, message: error.message || 'خطا در عملیاتی پیش‌بینی نشده در سرویس IPPANEL.' };
  }
};

// Backwards compatibility: preserve old sendPatternSms name. The legacy code
// referenced sendPatternSms to call MeliPayamak. We now alias it to
// sendMeliPayamakPatternSms so that existing imports continue to work.
export const sendPatternSms = sendMeliPayamakPatternSms;