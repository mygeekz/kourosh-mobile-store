import fs from 'node:fs';
import assert from 'node:assert/strict';

const read = (file) => fs.readFileSync(file, 'utf8');
const version = read('KOUROSH_SOURCE_VERSION').trim();
const versionNumber = Number(version.replace(/^v/, ''));
assert.ok(Number.isInteger(versionNumber) && versionNumber >= 310, `KOUROSH_SOURCE_VERSION must be v310 or successor; found ${version}`);

const modalStack = read('pages/mobilePhones/MobilePhonesModalStack.tsx');
assert.ok(modalStack.includes("import PhoneDeleteConfirmContent from './PhoneDeleteConfirmContent';"), 'Mobile phones modal stack must import the dedicated delete-confirm content component');
const deleteStart = modalStack.indexOf('{/* Delete Phone Modal */}');
const deleteEnd = modalStack.indexOf('{/* Bulk Confirmation Modal */}');
assert.ok(deleteStart >= 0 && deleteEnd > deleteStart, 'Delete-phone modal source window must exist');
const deleteWindow = modalStack.slice(deleteStart, deleteEnd);
assert.ok(deleteWindow.includes('title="حذف این گوشی از انبار"'), 'Delete-phone modal title must remain canonical');
assert.ok(deleteWindow.includes('widthClass="max-w-5xl"'), 'Delete-phone modal must use the approved wide SaaS canvas');
assert.ok(deleteWindow.includes('variant="operational"'), 'Delete-phone modal must use the operational dialog variant');
assert.ok(deleteWindow.includes('layout="split"'), 'Delete-phone modal must use the split layout');
assert.ok(deleteWindow.includes('<PhoneDeleteConfirmContent'), 'Delete-phone modal must delegate content to the dedicated component');
assert.ok(deleteWindow.includes('submitDisabled={isSubmittingDelete || !token}'), 'Delete-phone modal must preserve submit disable safety');

const content = read('pages/mobilePhones/PhoneDeleteConfirmContent.tsx');
assert.ok(content.includes('data-ui-mobile-phone-delete-confirm="true"'), 'Dedicated delete content must expose the v310 static guard');
assert.ok(content.includes('modal-template-form modal-template-form--split mobile-phone-delete-confirm'), 'Dedicated delete content must use the canonical split modal template');
assert.ok(content.includes('ModalTemplateSummary'), 'Dedicated delete content must contain the summary column');
assert.ok(content.includes('ModalTemplateSectionHeader'), 'Dedicated delete content must use standardized section headers');
assert.ok(content.includes('DialogActions'), 'Dedicated delete content must use canonical modal actions');
assert.ok(content.includes('حذف قطعی این گوشی'), 'Dedicated delete content must retain the destructive CTA');
assert.ok(content.includes('قبل از حذف بررسی کن'), 'Dedicated delete content must retain the pre-delete review checklist');

console.log('v310 mobile-phone delete modal redesign audit passed.');
