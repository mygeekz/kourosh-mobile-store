import React from 'react';
import Modal from './Modal';
import Button from './Button';
import { QRCodeCanvas } from 'qrcode.react';
import { formatIranDateTime } from '../utils/iranDateTime';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  entityLabel: string;
  loading: boolean;
  deepLink: string;
  botUsernameMissing?: boolean;
  expectedPhone?: string;
  expiresAt?: string;
  onRefresh: () => void;
  onCopy: () => Promise<void> | void;
};

const TelegramLinkModal: React.FC<Props> = ({
  isOpen,
  onClose,
  title,
  entityLabel,
  loading,
  deepLink,
  botUsernameMissing = false,
  expectedPhone,
  expiresAt,
  onRefresh,
  onCopy,
}) => {
  const openDirect = () => {
    if (!deepLink) return;
    const url = deepLink.startsWith('http') ? deepLink : `https://t.me/${deepLink}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const formattedExpiry = expiresAt ? formatIranDateTime(expiresAt) : '۱۵ دقیقه';
  const isReady = Boolean(deepLink && !botUsernameMissing);

  return (
    <Modal
      title={title}
      isOpen={isOpen}
      onClose={onClose}
      widthClass="max-w-4xl"
      iconClass="fa-brands fa-telegram"
      variant="expansive"
      wrapperClassName="telegram-link-modal-shell customer-edit-v2-overlay"
    >
      <div className="telegram-link-modal-v2">
        <section className="telegram-link-modal-v2__intro">
          <div className="telegram-link-modal-v2__intro-copy">
            <div className="telegram-link-modal-v2__eyebrow">پیام‌رسانی</div>
            <h3 className="telegram-link-modal-v2__title">اتصال تلگرام مشتری</h3>
            <p className="telegram-link-modal-v2__subtitle">
              اتصال امن برای فعال‌سازی دریافت و ارسال پیام در پروفایل این مشتری.
            </p>
          </div>
          <div className="telegram-link-modal-v2__hero-icon" aria-hidden="true">
            <i className="fa-brands fa-telegram" />
          </div>
        </section>

        <section className="telegram-link-modal-v2__stats">
          <div className="telegram-link-modal-v2__stat-card">
            <span className="telegram-link-modal-v2__stat-icon telegram-link-modal-v2__stat-icon--success">
              <i className="fa-solid fa-shield-halved" />
            </span>
            <div className="telegram-link-modal-v2__stat-copy">
              <span className="telegram-link-modal-v2__stat-label">وضعیت اتصال</span>
              <strong className={isReady ? 'is-success' : 'is-muted'}>
                {isReady ? 'آماده اتصال' : 'نیازمند بررسی'}
              </strong>
            </div>
          </div>

          <div className="telegram-link-modal-v2__stat-card">
            <span className="telegram-link-modal-v2__stat-icon telegram-link-modal-v2__stat-icon--info">
              <i className="fa-solid fa-phone" />
            </span>
            <div className="telegram-link-modal-v2__stat-copy">
              <span className="telegram-link-modal-v2__stat-label">شماره مورد انتظار</span>
              <strong dir="ltr">{expectedPhone || 'ثبت نشده'}</strong>
            </div>
          </div>

          <div className="telegram-link-modal-v2__stat-card">
            <span className="telegram-link-modal-v2__stat-icon telegram-link-modal-v2__stat-icon--warn">
              <i className="fa-regular fa-clock" />
            </span>
            <div className="telegram-link-modal-v2__stat-copy">
              <span className="telegram-link-modal-v2__stat-label">انقضای لینک</span>
              <strong>{deepLink ? formattedExpiry : '—'}</strong>
            </div>
          </div>
        </section>

        {loading ? (
          <div className="telegram-link-modal-v2__loading">
            <span className="telegram-link-modal-v2__loading-icon"><i className="fa-solid fa-spinner fa-spin" /></span>
            <div className="telegram-link-modal-v2__loading-title">در حال آماده‌سازی لینک اتصال تلگرام</div>
            <div className="telegram-link-modal-v2__loading-subtitle">لطفاً چند لحظه صبر کنید تا QR و لینک امن مشتری تولید شود.</div>
          </div>
        ) : (
          <div className="telegram-link-modal-v2__grid">
            <div className="telegram-link-modal-v2__side-column">
              <section className="telegram-link-modal-v2__panel telegram-link-modal-v2__panel--steps">
                <div className="telegram-link-modal-v2__panel-head">
                  <h4>مراحل اتصال</h4>
                  <i className="fa-solid fa-list-check" />
                </div>
                <ol className="telegram-link-modal-v2__steps-list">
                  <li>
                    <span className="telegram-link-modal-v2__step-index">۱</span>
                    <span>QR را اسکن کنید یا لینک را باز کنید</span>
                  </li>
                  <li>
                    <span className="telegram-link-modal-v2__step-index">۲</span>
                    <span>ربات را Start کنید</span>
                  </li>
                  <li>
                    <span className="telegram-link-modal-v2__step-index">۳</span>
                    <span>اتصال در پرونده مشتری ثبت می‌شود</span>
                  </li>
                </ol>
              </section>

              <section className="telegram-link-modal-v2__panel telegram-link-modal-v2__panel--notes">
                <div className="telegram-link-modal-v2__panel-head">
                  <h4>نکات امنیتی</h4>
                  <i className="fa-solid fa-shield-halved" />
                </div>
                <ul className="telegram-link-modal-v2__bullet-list">
                  <li>این لینک فقط برای همین مشتری صادر شده است.</li>
                  <li>برای حفظ امنیت، پس از انقضا لینک جدید بسازید.</li>
                  <li>بعد از اتصال، ارسال پیام و منوی ربات فعال می‌شود.</li>
                </ul>
              </section>

              <div className="telegram-link-modal-v2__info-box">
                <i className="fa-solid fa-circle-info" />
                <span>در صورت نیاز می‌توانید Chat ID را بعداً هم ثبت یا بازبینی کنید.</span>
              </div>
            </div>

            <div className="telegram-link-modal-v2__main-column">
              <section className="telegram-link-modal-v2__panel telegram-link-modal-v2__panel--qr">
                <div className="telegram-link-modal-v2__panel-head">
                  <h4>لینک‌کردن سریع تلگرام</h4>
                  <i className="fa-regular fa-paper-plane" />
                </div>
                <p className="telegram-link-modal-v2__panel-description">
                  برای اتصال این مشتری به تلگرام، کد QR زیر را اسکن کنید یا از لینک مستقیم امن استفاده کنید.
                </p>

                {botUsernameMissing && !deepLink ? (
                  <div className="telegram-link-modal-v2__warning">
                    <i className="fa-solid fa-triangle-exclamation" />
                    <div>
                      <strong>نام کاربری ربات تنظیم نشده است</strong>
                      <span>لطفاً در تنظیمات تلگرام، نام کاربری ربات را بدون @ ثبت کنید.</span>
                    </div>
                  </div>
                ) : null}

                {deepLink ? (
                  <>
                    <div className="telegram-link-modal-v2__qr-wrap">
                      <div className="telegram-link-modal-v2__qr-box">
                        <QRCodeCanvas value={deepLink} size={176} includeMargin />
                        <span className="telegram-link-modal-v2__qr-logo">
                          <i className="fa-brands fa-telegram" />
                        </span>
                      </div>
                    </div>

                    <div className="telegram-link-modal-v2__status-row">
                      <span className="telegram-link-modal-v2__status-pill telegram-link-modal-v2__status-pill--timer">
                        <i className="fa-regular fa-clock" />
                        <span>۱۵ دقیقه تا انقضا</span>
                      </span>
                      <span className="telegram-link-modal-v2__status-pill telegram-link-modal-v2__status-pill--safe">
                        <i className="fa-solid fa-shield-halved" />
                        <span>ایمن و موقت</span>
                      </span>
                    </div>

                    <div className="telegram-link-modal-v2__link-box" dir="ltr">
                      <span className="telegram-link-modal-v2__link-text">{deepLink}</span>
                      <span className="telegram-link-modal-v2__link-icon"><i className="fa-solid fa-link" /></span>
                    </div>

                    <div className="telegram-link-modal-v2__inline-actions">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="telegram-link-modal-v2__action-btn"
                        onClick={onCopy}
                        leftIcon={<i className="fa-regular fa-copy" />}
                      >
                        کپی لینک
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="telegram-link-modal-v2__action-btn"
                        onClick={onRefresh}
                        leftIcon={<i className="fa-solid fa-rotate-right" />}
                      >
                        نوسازی لینک
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="telegram-link-modal-v2__action-btn"
                        onClick={openDirect}
                        leftIcon={<i className="fa-solid fa-arrow-up-right-from-square" />}
                      >
                        باز کردن در تلگرام
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="telegram-link-modal-v2__empty">
                    <span className="telegram-link-modal-v2__empty-icon"><i className="fa-solid fa-link-slash" /></span>
                    <strong>لینک اتصال آماده نیست</strong>
                    <p>برای ساخت لینک جدید، روی دکمه «ایجاد لینک جدید» بزنید.</p>
                  </div>
                )}
              </section>
            </div>
          </div>
        )}

        <footer className="telegram-link-modal-v2__footer">
          <div className="telegram-link-modal-v2__footer-start">
            <Button type="button" variant="secondary" size="sm" onClick={onClose}>
              بستن
            </Button>
          </div>
          <Button
            type="button"
            variant="success"
            size="sm"
            className="telegram-link-modal-v2__refresh-btn"
            onClick={onRefresh}
            leftIcon={<i className="fa-solid fa-plus" />}
          >
            ایجاد لینک جدید
          </Button>
        </footer>
      </div>
    </Modal>
  );
};

export default TelegramLinkModal;
