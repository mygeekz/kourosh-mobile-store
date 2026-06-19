import React, { useEffect, useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Notification from '../components/Notification';
import { NotificationMessage } from '../types';
import LoginLogoMotionV3 from '../components/LoginLogoMotionV3';
import VariableProximityText from '../components/VariableProximityText';
import TrueFocusText from '../components/TrueFocusText';
import OrbBackdrop from '../components/OrbBackdrop';
import LiquidGlassPanel from '../components/LiquidGlassPanel';
import { applyDocumentBranding, readStoredBranding } from '../utils/branding';

const fieldShell =
  'group relative isolate overflow-hidden rounded-[30px] border border-white/16 bg-[linear-gradient(180deg,rgba(160,168,184,0.40),rgba(129,139,157,0.28))] shadow-[0_18px_48px_-28px_rgba(0,0,0,0.82),inset_0_1px_0_rgba(255,255,255,0.18),inset_0_-1px_0_rgba(255,255,255,0.04)] backdrop-blur-[18px] transition-all duration-300';
const fieldFocus =
  '   ';
const fieldOverlay =
  'pointer-events-none absolute inset-0 rounded-[inherit] bg-[linear-gradient(180deg,rgba(255,255,255,0.10),rgba(255,255,255,0.02)_42%,rgba(255,255,255,0.01)_100%)]';
const fieldSpecular =
  'pointer-events-none absolute inset-[1px] rounded-[inherit] bg-[linear-gradient(135deg,rgba(255,255,255,0.20),rgba(255,255,255,0.08)_24%,rgba(255,255,255,0.01)_46%,rgba(255,255,255,0.10)_68%,rgba(255,255,255,0.02)_100%)] opacity-95';
const fieldGlare =
  'pointer-events-none absolute -left-[10%] top-[-30%] h-[120%] w-[52%] rotate-[-45deg] rounded-full bg-[linear-gradient(180deg,rgba(255,255,255,0.30),rgba(255,255,255,0.08)_40%,transparent_75%)] opacity-60 blur-xl';
const fieldRim =
  'pointer-events-none absolute inset-0 rounded-[inherit] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04),inset_0_12px_28px_rgba(255,255,255,0.04)]';
const iconWrap =
  'pointer-events-none absolute inset-y-0 right-0 z-10 flex w-[4.4rem] items-center justify-center';
const iconBadge =
  'grid h-11 w-11 place-items-center rounded-[20px] border border-white/14 bg-[linear-gradient(180deg,rgba(255,255,255,0.18),rgba(255,255,255,0.06))] text-slate-900 shadow-[0_12px_24px_-18px_rgba(0,0,0,0.72),inset_0_1px_0_rgba(255,255,255,0.18)] backdrop-blur-[12px]';
const fieldInput =
  'relative z-[2] block w-full bg-transparent pr-[5rem] pl-5 py-[1.08rem] text-left text-[15px] font-black tracking-tight text-slate-950 preview:text-left preview:text-slate-700/80 ';

const buttonShell =
  'group relative isolate mt-2 flex h-16 w-full items-center justify-center overflow-hidden rounded-[91px] border border-white/14 px-6 text-[15px] font-black tracking-tight text-white transition-all duration-300 hover:-translate-y-0.5 hover:border-white/20 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-70';

const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [notification, setNotification] = useState<NotificationMessage | null>(null);
  const [storeName, setStoreName] = useState(readStoredBranding()?.storeName || 'فروشگاه کوروش');
  const { login, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const snapshot = readStoredBranding();
    const name = snapshot?.storeName || 'فروشگاه کوروش';
    setStoreName(name);
    applyDocumentBranding(name);
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setNotification(null);
    if (!username || !password) {
      setNotification({ type: 'error', text: 'نام کاربری و کلمه عبور الزامی است.' });
      return;
    }
    try {
      const res = await login({ username, password });
      if (res.success) {
        setNotification({ type: 'success', text: 'ورود با موفقیت انجام شد. در حال انتقال...' });
        setTimeout(() => navigate('/'), 900);
      } else {
        setNotification({ type: 'error', text: res.message || 'خطا در ورود. لطفاً دوباره تلاش کنید.' });
      }
    } catch (err: any) {
      const m = err?.message?.toLowerCase?.() ?? '';
      let msg = 'خطا در ورود. لطفاً دوباره تلاش کنید.';
      if (m.includes('failed to fetch')) msg = 'خطا در ارتباط با سرور. اتصال اینترنت یا وضعیت بک‌اند را بررسی و ادامه کنید.';
      else if (m.includes('invalid credentials') || m.includes('نام کاربری یا کلمه عبور نامعتبر است')) msg = 'نام کاربری یا کلمه عبور نامعتبر است.';
      else if (err?.message) msg = err.message;
      setNotification({ type: 'error', text: msg });
    }
  };

  const liquidButtonStyle: React.CSSProperties = {
    background: 'linear-gradient(180deg, rgba(255,255,255,0.075), rgba(255,255,255,0.018))',
    backdropFilter: 'blur(22px) saturate(1.08)',
    WebkitBackdropFilter: 'blur(22px) saturate(1.08)',
    boxShadow:
      '0 16px 42px rgba(0,0,0,0.24), 0 0 0 1px rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.18), inset 0 -12px 26px rgba(255,255,255,0.02), inset 12px 0 18px rgba(255,255,255,0.015), inset -12px 0 18px rgba(255,255,255,0.015)',
  };

  return (
    <div
      dir="rtl"
      className="relative min-h-[100dvh] overflow-hidden bg-[radial-gradient(1100px_700px_at_20%_-10%,#1a0f12_0%,#0c0b11_42%,#07070a_100%)] text-right"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_10%,rgba(255,154,156,0.08),transparent_16%),radial-gradient(circle_at_84%_14%,rgba(255,255,255,0.04),transparent_20%),radial-gradient(circle_at_72%_84%,rgba(255,255,255,0.04),transparent_18%)]" />
      <OrbBackdrop sizeVmin={128} x="50%" y="48%" hoverGlobal />
      <Notification position="top-center" message={notification} onClose={() => setNotification(null)} />

      <div className="relative z-10 flex min-h-[100dvh] items-center justify-center px-4 py-8">
        <LiquidGlassPanel
          className="w-[min(92vw,430px)] rounded-[34px] border border-white/10 px-6 pb-6 pt-5 shadow-[0_28px_70px_-36px_rgba(0,0,0,0.72)] sm:px-7 sm:pb-7"
          blurPx={20}
          borderPx={1}
        >
          <div className="space-y-[18px]">
            <div className="text-center">
              <div className="mx-auto w-fit">
                <LoginLogoMotionV3 />
              </div>
              <div className="mt-3">
                <TrueFocusText
                  text="ورود به داشبورد"
                  className="block text-[28px] font-black leading-tight text-white"
                  boxSize={108}
                  radius={64}
                  color="#ffffff"
                  corner={12}
                  thickness={2}
                  blur={2.2}
                  dim={0.34}
                  autoCycle
                  cycleHoldMs={1000}
                  cycleAnimMs={420}
                  pauseOnHover
                  lockAxis="x"
                />
              </div>
              <div className="mt-6">
                <VariableProximityText
                  text="برای ورود، اطلاعات حساب را وارد کنید."
                  className="text-sm font-medium text-white/72"
                  mode="word"
                  radius={140}
                  maxScale={1.05}
                  minWght={320}
                  maxWght={820}
                  fallbackWeight
                />
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-[18px] pt-1">
              <div>
                <label htmlFor="username" className="mb-2.5 block pr-1 text-[12px] font-black tracking-tight text-white/84">
                  نام کاربری
                </label>
                <div className={`${fieldShell} ${fieldFocus}`}>
                  <span className={fieldOverlay} />
                  <span className={fieldSpecular} />
                  <span className={fieldGlare} />
                  <span className={fieldRim} />
                  <div className={iconWrap}>
                    <span className={iconBadge}>
                      <i className="fa-solid fa-user-astronaut text-[16px]" />
                    </span>
                  </div>
                  <input
                    id="username"
                    name="username"
                    type="text"
                    autoComplete="username"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className={fieldInput}
                    preview="نام کاربری خود را وارد کنید"
                    dir="ltr"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="mb-2.5 block pr-1 text-[12px] font-black tracking-tight text-white/84">
                  کلمه عبور
                </label>
                <div className={`${fieldShell} ${fieldFocus}`}>
                  <span className={fieldOverlay} />
                  <span className={fieldSpecular} />
                  <span className={fieldGlare} />
                  <span className={fieldRim} />
                  <div className={iconWrap}>
                    <span className={iconBadge}>
                      <i className="fa-solid fa-lock text-[16px]" />
                    </span>
                  </div>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={fieldInput}
                    preview="کلمه عبور خود را وارد کنید"
                    dir="ltr"
                  />
                </div>
              </div>
              
              <button
                type="submit"
                disabled={authLoading}
                className={buttonShell}
                style={liquidButtonStyle}
              >
                <span className="pointer-events-none absolute inset-0 rounded-[inherit] bg-[linear-gradient(180deg,rgba(255,255,255,0.07),rgba(255,255,255,0.015))]" />
                <span className="pointer-events-none absolute inset-[1px] rounded-[inherit] bg-[linear-gradient(180deg,rgba(255,255,255,0.16),rgba(255,255,255,0.05)_28%,rgba(255,255,255,0.012)_62%,rgba(255,255,255,0.05)_100%)]" />
                <span className="pointer-events-none absolute inset-x-[8%] top-[1px] h-[42%] rounded-full bg-[linear-gradient(180deg,rgba(255,255,255,0.30),rgba(255,255,255,0.08)_55%,transparent)] blur-[10px]" />
                <span className="pointer-events-none absolute -left-[8%] top-[-78%] h-[230%] w-[26%] rotate-[-36deg] rounded-full bg-[linear-gradient(180deg,rgba(255,255,255,0.48),rgba(255,255,255,0.12)_28%,transparent_70%)] opacity-95 blur-[15px]" />
                <span className="pointer-events-none absolute right-[10%] top-[14%] h-[60%] w-[18%] rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.20),rgba(255,255,255,0.02)_60%,transparent_72%)] blur-[8px]" />
                <span className="pointer-events-none absolute inset-0 rounded-[inherit] bg-[radial-gradient(circle_at_50%_54%,rgba(255,255,255,0.02),transparent_48%),radial-gradient(circle_at_50%_50%,transparent_62%,rgba(255,255,255,0.035)_82%,rgba(255,255,255,0.07)_100%)]" />
                <span className="pointer-events-none absolute inset-[1.5px] rounded-[inherit] shadow-[inset_0_1px_0_rgba(255,255,255,0.18),inset_0_-1px_0_rgba(255,255,255,0.04)]" />
                {authLoading ? (
                  <span className="relative z-[3] inline-flex items-center gap-2">
                    <span>در حال ورود...</span>
                  </span>
                ) : (
                  <span className="relative z-[3] inline-flex items-center gap-2 [text-shadow:0_1px_0_rgba(255,255,255,0.12)]">
                    <span>ورود به سیستم</span>
                    <i className="fa-solid fa-arrow-left-long transition-transform duration-300 group-hover:-translate-x-1" />
                  </span>
                )}
              </button>
            </form>

            <p className="text-center text-[11px] font-bold text-white/68">
              &copy; {new Date().getFullYear()} {storeName}. تمامی حقوق محفوظ است.
            </p>
          </div>
        </LiquidGlassPanel>
      </div>
    </div>
  );
};

export default LoginPage;
