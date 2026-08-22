import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const checks = [];
const expectIncludes = (file, tokens) => {
  const source = read(file);
  for (const token of tokens) {
    if (!source.includes(token)) throw new Error(`${file}: missing ${token}`);
    checks.push(`${file}: ${token}`);
  }
};

expectIncludes('types.ts', ["CheckOwnershipType = 'buyer' | 'third_party'", 'ownershipType?: CheckOwnershipType']);
expectIncludes('server/db/schema/installments.schema.ts', ['ownershipType TEXT', 'ADD COLUMN ownershipType TEXT', 'hasOwnershipType']);
expectIncludes('server/db/domains/installments.db.ts', [
  'smart-sale-contract-v2-scenario-aware',
  'INSERT INTO installment_checks (saleId, checkNumber, bankName, ownershipType',
  "ownershipType = CASE",
  'SET checkNumber = ?, bankName = ?, ownershipType = ?',
]);
expectIncludes('server/validators.ts', [
  "['buyer', 'third_party'].includes(String(chk.ownershipType",
  'متعلق به خریدار است و نباید شخص ثالث انتخاب شود',
]);
expectIncludes('pages/AddInstallmentSalePage.tsx', [
  'id="checkOwnershipType"',
  'چک متعلق به خود خریدار است',
  'چک متعلق به شخص ثالث است',
]);
expectIncludes('pages/InstallmentSaleDetailPage.tsx', [
  'id="editCheckOwnershipType"',
  'ownershipType: editingCheck.ownershipType',
]);
expectIncludes('utils/installmentContractMode.ts', [
  "'installment_no_check'",
  "'installment_buyer_checks'",
  "'installment_third_party_checks'",
  "'installment_mixed_checks'",
  "'check_buyer_checks'",
  "'check_third_party_checks'",
  "'check_mixed_checks'",
  'قرارداد فروش اقساطی بدون چک',
]);
expectIncludes('pages/InstallmentSaleContractPrintPage.tsx', [
  'resolveSmartSaleContractMode',
  'چک‌های مشخص‌شده با عنوان «چک خریدار»',
  'چک‌های مشخص‌شده با عنوان «چک شخص ثالث»',
  'وصول مضاعف مجاز نیست',
  'سامانه صیاد',
  'مرجع قانونی صالح',
]);

const printSource = read('pages/InstallmentSaleContractPrintPage.tsx');
if (printSource.includes('hasThirdPartyChecks = checks.length > 0')) {
  throw new Error('legacy all-checks-are-third-party assumption still exists');
}
if (printSource.includes('مراجع قضایی صالح محل اقامت فروشنده')) {
  throw new Error('legacy unilateral jurisdiction clause still exists');
}

console.log(`smart sale contract v219 audit passed (${checks.length} assertions)`);
