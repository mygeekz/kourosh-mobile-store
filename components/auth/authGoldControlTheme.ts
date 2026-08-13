/**
 * Shared premium gold interaction language for authentication controls.
 *
 * Kept in the auth system instead of page-local CSS so login surfaces remain
 * composable, responsive, and aligned with the canonical UI primitives.
 */
export const authGoldFieldShellClasses = [
  '[&&_.app-form-field__control]:!text-[#d8bd89] [&&_.app-form-field__control]:[-webkit-text-fill-color:#d8bd89]',
  '[&&_.app-form-field__control::placeholder]:!text-[#b79b6a]/[0.82] [&&_.app-form-field__control::placeholder]:!opacity-100',
  'focus-within:[&&_.app-form-field__control]:!text-[#e2c995] focus-within:[&&_.app-form-field__control]:[-webkit-text-fill-color:#e2c995]',
  '[&_.ux-field-label]:!text-[#c8ad79] [&_.ux-field-label]:transition-colors [&_.ux-field-label]:duration-200',
  'hover:[&_.ux-field-label]:!text-[#dbc08d]',
  'focus-within:[&_.ux-field-label]:!text-[#efd5a2]',
  '[&_.app-form-field__leading-icon]:!text-[#b99b68] [&_.app-form-field__leading-icon]:transition-[color,transform,opacity,filter] [&_.app-form-field__leading-icon]:duration-200',
  'hover:[&_.app-form-field__leading-icon]:!text-[#d1b27c]',
  'focus-within:[&_.app-form-field__leading-icon]:!translate-y-[-1px] focus-within:[&_.app-form-field__leading-icon]:!text-[#ecd19a] focus-within:[&_.app-form-field__leading-icon]:drop-shadow-[0_0_10px_rgba(229,200,141,0.16)]',
  '[&_.app-password-visibility-button]:!text-[#baa06f] [&_.app-password-visibility-button]:transition-[color,opacity,transform,filter] [&_.app-password-visibility-button]:duration-200',
  'hover:[&_.app-password-visibility-button]:!text-[#d1b27c]',
  'focus-within:[&_.app-password-visibility-button]:!text-[#ecd19a] focus-within:[&_.app-password-visibility-button]:drop-shadow-[0_0_10px_rgba(229,200,141,0.16)]',
  '[&_.app-password-visibility-button:focus-visible]:!outline-none',
].join(' ');
export const authGoldLabelClasses = [
  '!text-[#c9ae79]',
  'transition-colors duration-200',
].join(' ');

export const authGoldLeadingIconClasses = [
  '!border-0 !bg-transparent !bg-none !shadow-none',
  '!text-[#c5a773]',
  'transition-[color,transform,filter] duration-200',
].join(' ');

export const authGoldPasswordToggleClasses = [
  '!text-[#c5a773]',
  'transition-[color,transform,filter] duration-200',
].join(' ');

export const authGoldControlWrapClasses = [
  'relative !border-[#c4a66f]/[0.26]',
  '!bg-[linear-gradient(145deg,rgba(255,255,255,0.075),rgba(169,138,100,0.055)_46%,rgba(3,4,10,0.2))]',
  '!shadow-[0_28px_64px_-36px_rgba(0,0,0,0.98),inset_0_1px_0_rgba(255,255,255,0.14),inset_0_0_0_1px_rgba(196,166,111,0.08)]',
  'hover:!border-[#ceb17a]/50',
  'hover:!bg-[linear-gradient(145deg,rgba(255,255,255,0.09),rgba(169,138,100,0.075)_48%,rgba(3,4,10,0.16))]',
  'focus-within:!border-[#e5c88d]/[0.72]',
  'focus-within:!bg-[linear-gradient(145deg,rgba(255,255,255,0.1),rgba(169,138,100,0.09)_48%,rgba(3,4,10,0.12))]',
  'focus-within:!shadow-[0_30px_72px_-34px_rgba(0,0,0,1),0_0_0_3px_rgba(213,180,122,0.085),0_0_34px_-20px_rgba(229,200,141,0.72),inset_0_1px_0_rgba(255,244,217,0.22)]',
].join(' ');

export const authGoldInputClasses = [
  '!text-[#d8bd89]',
  'placeholder:!text-[#b79b6a] placeholder:!opacity-[0.82]',
  '[&&::placeholder]:!text-[#b79b6a] [&&::placeholder]:!opacity-[0.82]',
  '[&&::-webkit-input-placeholder]:!text-[#b79b6a] [&&::-webkit-input-placeholder]:!opacity-[0.82]',
  '[-webkit-text-fill-color:#d8bd89]',
  '!caret-[#c9a86f] selection:bg-[#c7a86f]/30 selection:text-[#f5e4c0]',
  'transition-[color,opacity,filter] duration-200',
  'hover:!text-[#dec695] focus:!text-[#e2c995] focus:!caret-[#d5b77f] focus:[-webkit-text-fill-color:#e2c995]',
  '[&&:-webkit-autofill]:[-webkit-text-fill-color:#d8bd89]',
  '[&&:-webkit-autofill]:[caret-color:#c9a86f]',
  '[&&:-webkit-autofill]:[-webkit-box-shadow:inset_0_0_0_1000px_rgba(169,138,100,0.055)]',
  '[&&:-webkit-autofill]:[-webkit-background-clip:text]',
  '[&&:-webkit-autofill]:[background-clip:text]',
  '[&&:-webkit-autofill]:[transition:background-color_999999s_ease-out_0s,color_200ms_ease-out_0s]',
  '[&&:autofill]:!text-[#d8bd89] [&&:autofill]:!caret-[#c9a86f]',
].join(' ');

export const authGoldPrimaryActionClasses = [
  'relative isolate overflow-hidden',
  '[&&]:!border [&&]:!border-[#c8a66e]/[0.52]',
  '[&&]:![background:linear-gradient(90deg,#5a432d_0%,#9b764b_50%,#553e2a_100%)]',
  '[&&]:!text-[#f3e2bf]',
  '!shadow-[0_22px_50px_-28px_rgba(148,111,65,0.48),0_16px_34px_-28px_rgba(0,0,0,1),inset_0_1px_0_rgba(255,244,218,0.22),inset_0_-1px_0_rgba(52,34,20,0.55)]',
  'transition-[transform,box-shadow,filter,border-color,background-image,background-color] duration-300 ease-out',
  'enabled:hover:!-translate-y-0.5 [&&]:enabled:hover:!border-[#d6b67d]/[0.64] [&&]:enabled:hover:![background:linear-gradient(90deg,#624a31_0%,#a27d50_50%,#5e462e_100%)]',
  'enabled:hover:!shadow-[0_26px_58px_-28px_rgba(159,121,72,0.56),0_18px_38px_-28px_rgba(0,0,0,1),0_0_28px_-22px_rgba(211,177,119,0.42),inset_0_1px_0_rgba(255,246,224,0.28)]',
  'active:!translate-y-0 active:!scale-[0.992] active:!brightness-[0.97]',
  'focus-visible:!outline-none focus-visible:!ring-4 focus-visible:!ring-[#d2b078]/[0.16]',
  "before:pointer-events-none before:absolute before:inset-y-[-24%] before:left-[-30%] before:w-[16%] before:skew-x-[-20deg] before:bg-[#f7e5c2]/[0.12] before:blur-lg before:content-['']",
  'before:transition-[left] before:duration-700 before:ease-out enabled:hover:before:left-[118%]',
  '[&_.ux-btn__content]:relative [&_.ux-btn__content]:z-[1] [&_.ux-btn__content]:!text-[#f3e2bf]',
  '[&_.ux-btn__label]:!text-[#f3e2bf] [&_.ux-btn__label-main]:!text-[#f3e2bf]',
  '[&_.ux-btn__icon]:!text-[#dfc18b] [&_.ux-btn__icon]:transition-[transform,color] [&_.ux-btn__icon]:duration-300',
  '[&_.ux-btn__spinner]:!text-[#e7cf9f] [&_.ux-btn__state-spinner]:!text-[#e7cf9f]',
  'enabled:hover:[&_.ux-btn__icon]:!-translate-x-1 enabled:hover:[&_.ux-btn__icon]:!text-[#f0d9ad]',
].join(' ');


export const authGoldInstallDividerClasses = [
  'h-px w-full overflow-hidden rounded-full',
  'bg-[linear-gradient(90deg,transparent_0%,rgba(155,118,75,0.06)_12%,rgba(183,146,91,0.26)_34%,rgba(226,197,143,0.38)_50%,rgba(183,146,91,0.26)_66%,rgba(155,118,75,0.06)_88%,transparent_100%)]',
  'shadow-[0_1px_0_rgba(255,247,226,0.025)]',
].join(' ');


export const authGoldSecondaryButtonClasses = [
  'inline-flex items-center justify-center gap-2 rounded-[18px] border border-[#c7a86f]/20',
  'bg-[linear-gradient(145deg,rgba(255,255,255,0.05),rgba(169,138,100,0.025))]',
  'px-4 py-3 text-center text-sm font-black text-[#d8bd8b]',
  'shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]',
  'transition-[transform,border-color,background-color,color,box-shadow] duration-200',
  'hover:-translate-y-0.5 hover:border-[#dabb82]/[0.45]',
  'hover:bg-[linear-gradient(145deg,rgba(255,255,255,0.075),rgba(169,138,100,0.05))]',
  'hover:text-[#f1dfba]',
  'hover:shadow-[0_18px_38px_-28px_rgba(200,165,107,0.65),inset_0_1px_0_rgba(255,255,255,0.12)]',
  'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#e4c58d]/[0.15]',
  'active:translate-y-0',
].join(' ');

export const authGoldPanelClasses = [
  'border-[#c7a86f]/16',
  'bg-[linear-gradient(155deg,rgba(19,17,23,0.94)_0%,rgba(11,10,16,0.95)_58%,rgba(7,7,11,0.97)_100%)]',
  'shadow-[0_24px_60px_-36px_rgba(0,0,0,0.95),inset_0_1px_0_rgba(255,244,217,0.07)]',
].join(' ');

export const authGoldTitleTextClasses = '!text-[#ddc08a]';
export const authGoldMutedTextClasses = 'text-[#c7b18b]/80';
export const authGoldStrongTextClasses = 'text-[#f0dfbb]';

export const authGoldSecondaryActionClasses = [
  'inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[18px] border border-[#c7a86f]/20',
  'bg-[linear-gradient(145deg,rgba(255,255,255,0.05),rgba(169,138,100,0.025))]',
  'px-4 py-3 text-center text-sm font-black text-[#d8bd8b]',
  'shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]',
  'transition-[transform,border-color,background-color,color,box-shadow] duration-200',
  'hover:-translate-y-0.5 hover:border-[#dabb82]/[0.45]',
  'hover:bg-[linear-gradient(145deg,rgba(255,255,255,0.075),rgba(169,138,100,0.05))]',
  'hover:text-[#f1dfba]',
  'hover:shadow-[0_18px_38px_-28px_rgba(200,165,107,0.65),inset_0_1px_0_rgba(255,255,255,0.12)]',
  'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#e4c58d]/[0.15]',
  'active:translate-y-0',
].join(' ');
