import assert from "node:assert/strict";
import crypto from "node:crypto";
import { validateTelegramInitData } from "../miniapp/telegramInitData";

const BOT_TOKEN = "123456789:foundation-test-token";
const NOW = 1_800_000_000;

const sign = (values: Record<string, string>): string => {
  const params = new URLSearchParams(values);
  const dataCheckString = [...params.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
  const secretKey = crypto
    .createHmac("sha256", "WebAppData")
    .update(BOT_TOKEN)
    .digest();
  const hash = crypto
    .createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");
  params.set("hash", hash);
  return params.toString();
};

const baseValues = {
  auth_date: String(NOW - 30),
  query_id: "AAHdF6IQAAAAAN0XohDhrOrc",
  start_param: "home",
  user: JSON.stringify({
    id: 99200123,
    first_name: "بهزاد",
    language_code: "fa",
  }),
};

const validated = validateTelegramInitData(sign(baseValues), BOT_TOKEN, {
  nowSeconds: NOW,
});
assert.equal(validated.user.id, 99200123);
assert.equal(validated.startParam, "home");

const signedWithThirdPartyField = validateTelegramInitData(
  sign({ ...baseValues, signature: "third-party-ed25519-field" }),
  BOT_TOKEN,
  { nowSeconds: NOW },
);
assert.equal(signedWithThirdPartyField.user.id, 99200123);

const signatureExcludedParams = new URLSearchParams({
  ...baseValues,
  signature: "third-party-ed25519-field",
});
const signatureExcludedCheck = [...signatureExcludedParams.entries()]
  .filter(([key]) => key !== "signature")
  .sort(([left], [right]) => left.localeCompare(right))
  .map(([key, value]) => `${key}=${value}`)
  .join("\n");
const signatureExcludedSecret = crypto
  .createHmac("sha256", "WebAppData")
  .update(BOT_TOKEN)
  .digest();
signatureExcludedParams.set(
  "hash",
  crypto.createHmac("sha256", signatureExcludedSecret).update(signatureExcludedCheck).digest("hex"),
);
assert.throws(
  () => validateTelegramInitData(signatureExcludedParams.toString(), BOT_TOKEN, { nowSeconds: NOW }),
  (error: unknown) => error instanceof Error && "code" in error && error.code === "MINIAPP_INIT_DATA_SIGNATURE_INVALID",
);

assert.throws(
  () =>
    validateTelegramInitData(
      sign({ ...baseValues, auth_date: String(NOW - 601) }),
      BOT_TOKEN,
      { nowSeconds: NOW },
    ),
  (error: unknown) =>
    error instanceof Error &&
    "code" in error &&
    error.code === "MINIAPP_INIT_DATA_EXPIRED",
);

const tampered = new URLSearchParams(sign(baseValues));
tampered.set(
  "user",
  JSON.stringify({ id: 77, first_name: "Tampered" }),
);
assert.throws(
  () => validateTelegramInitData(tampered.toString(), BOT_TOKEN, { nowSeconds: NOW }),
  (error: unknown) =>
    error instanceof Error &&
    "code" in error &&
    error.code === "MINIAPP_INIT_DATA_SIGNATURE_INVALID",
);

console.log("Mini App foundation authentication tests passed.");
