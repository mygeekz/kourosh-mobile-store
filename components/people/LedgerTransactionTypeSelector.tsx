import React from 'react';

export type LedgerTransactionTone = 'success' | 'warning';

export type LedgerTransactionTypeOption<K extends string> = {
  key: K;
  title: string;
  subtitle: string;
  iconClass: string;
  tone: LedgerTransactionTone;
};

type Props<K extends string> = {
  value: K;
  onChange: (value: K) => void;
  options: LedgerTransactionTypeOption<K>[];
  ariaLabel: string;
  headingId: string;
  eyebrow?: string;
  title?: string;
  description?: string;
};

const LedgerTransactionTypeSelector = <K extends string>({
  value,
  onChange,
  options,
  ariaLabel,
  headingId,
  eyebrow = 'نوع تراکنش',
  title = 'ابتدا جهت تراکنش را مشخص کن',
  description = 'نوع تراکنش روی مانده حساب و پیشنهادهای شرح ثبت مالی اثر مستقیم دارد.',
}: Props<K>) => (
  <section
    className="ledger-payment-modal__type-strip"
    aria-labelledby={headingId}
    data-ui-ledger-type-selector="v317"
    data-ui-ledger-density="compact-v318"
  >
    <div className="ledger-payment-modal__type-head ledger-transaction-type-head">
      <span className="ledger-payment-modal__type-head-icon ledger-transaction-type-head__icon" aria-hidden="true">
        <i className="fa-solid fa-right-left" />
      </span>
      <div className="ledger-transaction-type-head__copy">
        <span className="ledger-transaction-type-head__eyebrow">{eyebrow}</span>
        <strong id={headingId}>{title}</strong>
        <p>{description}</p>
      </div>
    </div>

    <div className="people-ledger-type-grid ledger-payment-modal__type-grid" role="radiogroup" aria-label={ariaLabel}>
      {options.map((item) => {
        const active = value === item.key;
        return (
          <button
            key={item.key}
            type="button"
            onClick={() => onChange(item.key)}
            className={[
              'people-ledger-type-card ledger-payment-modal__type-card',
              active ? 'is-active' : '',
              `ledger-payment-modal__type-card--${item.tone}`,
            ].join(' ')}
            data-ui-ledger-type-control="native-v317"
            aria-pressed={active}
            role="radio"
            aria-checked={active}
          >
            <span className="people-ledger-type-card__icon ledger-payment-modal__type-icon" aria-hidden="true">
              <i className={`fa-solid ${item.iconClass}`} />
            </span>
            <span className="people-ledger-type-card__copy ledger-payment-modal__type-copy">
              <strong>{item.title}</strong>
              <small>{item.subtitle}</small>
            </span>
            <span className="people-ledger-type-card__check ledger-payment-modal__type-check" aria-hidden="true">
              <i className="fa-solid fa-check" />
            </span>
          </button>
        );
      })}
    </div>
  </section>
);

export default LedgerTransactionTypeSelector;
