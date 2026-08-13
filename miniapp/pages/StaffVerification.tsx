import React from "react";
import { useMiniAppAuth } from "../auth/MiniAppAuthContext";

export const StaffVerification: React.FC = () => {
  const { identity } = useMiniAppAuth();
  return (
    <section className="border-b border-border py-4 text-sm">
      <h2 className="m-0 text-sm font-black">امنیت حساب</h2>
      <p className="mb-0 mt-2 text-xs leading-6 text-mutedText">هویت سازمانی {identity?.displayName} با نقش {identity?.roleName === "Admin" ? "مدیر سیستم" : "مدیر"} تأیید شده است.</p>
    </section>
  );
};
