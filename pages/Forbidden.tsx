// pages/Forbidden.tsx
import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const Forbidden: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation() as any;
  const from = location?.state?.from as string | undefined;

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-xl rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl p-6 md:p-8"
      >
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-rose-500 to-purple-600 flex items-center justify-center shadow-lg shadow-rose-500/20">
            <i className="fa-solid fa-shield-halved text-white text-xl" />
          </div>
          <div className="flex-1">
            <h1 className="text-xl md:text-2xl font-extrabold text-slate-900 dark:text-slate-100">
              دسترسی ندارید
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
              شما مجوز لازم برای مشاهده این بخش را ندارید.
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-white/10 bg-white/10 p-4">
          <div className="flex items-start gap-3">
            <i className="fa-solid fa-circle-info text-slate-500 mt-0.5" />
            <div className="text-sm text-slate-700 dark:text-slate-200 leading-6">
              {from ? (
                <>
                  تلاش کردید وارد مسیر <span className="font-bold">{from}</span> شوید.
                </>
              ) : (
                <>اگر فکر می‌کنید این دسترسی باید برای شما فعال باشد، با مدیر سیستم هماهنگ کنید.</>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2">
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 rounded-xl border border-white/10 bg-white/10 hover:bg-white/15 transition text-slate-700 dark:text-slate-100"
          >
            بازگشت
          </button>
          <button
            onClick={() => navigate('/', { replace: true })}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:opacity-95 transition text-white shadow-lg shadow-indigo-500/25"
          >
            رفتن به داشبورد
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default Forbidden;
