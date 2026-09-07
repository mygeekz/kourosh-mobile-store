#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

const controller = read('pages/settings/SettingsController.tsx');
const modalStack = read('pages/settings/SettingsModalStack.tsx');
const stateHook = read('pages/settings/useSettingsUserManagementState.ts');

assert.match(stateHook, /const \[editUserFormErrors, setEditUserFormErrors\] = useState<Partial<EditUserFormData>>\(\{\}\)/, 'Settings user state must own editUserFormErrors.');
assert.match(stateHook, /const \[resetPasswordErrors, setResetPasswordErrors\] = useState<Partial<[^>]+>>\(\{\}\)/, 'Settings user state must own resetPasswordErrors/setResetPasswordErrors.');
assert.match(controller, /const renderCtx = \{[\s\S]*?\beditUserFormErrors,/, 'Settings render context must expose editUserFormErrors.');
assert.match(controller, /const renderCtx = \{[\s\S]*?\bsetResetPasswordErrors,/, 'Settings render context must expose setResetPasswordErrors.');
assert.match(modalStack, /const \{[\s\S]*?\beditUserFormErrors,[\s\S]*?\} = ctx;/, 'SettingsModalStack must destructure editUserFormErrors from ctx.');
assert.match(modalStack, /const \{[\s\S]*?\bsetResetPasswordErrors,[\s\S]*?\} = ctx;/, 'SettingsModalStack must destructure setResetPasswordErrors from ctx.');
assert.match(modalStack, /editUserFormErrors=\{editUserFormErrors\}/, 'SettingsModalStack must pass editUserFormErrors to SettingsUsersModals.');
assert.match(modalStack, /setResetPasswordErrors=\{setResetPasswordErrors\}/, 'SettingsModalStack must pass setResetPasswordErrors to SettingsUsersModals.');

console.log(JSON.stringify({
  status: 'PASS',
  regression: 'settings-user-modal-context-boundary',
  rootCause: 'SettingsModalStack had context values passed as free identifiers; editUserFormErrors and later setResetPasswordErrors exposed the same boundary defect.',
  controllerContext: true,
  modalStackDestructure: true,
  modalPropPassThrough: true,
  resetPasswordSetterContext: true,
}, null, 2));
