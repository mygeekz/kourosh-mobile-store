import React, { createContext, useContext } from 'react';

export type ReportExportHandlers = {
  excel?: () => void | Promise<void>;
  pdf?: () => void | Promise<void>;
  print?: () => void | Promise<void>;
};

type Ctx = {
  registerReportExports: (h: ReportExportHandlers) => void;
};

const noop = () => {};

const ReportsExportsContext = createContext<Ctx>({
  registerReportExports: noop,
});

export function ReportsExportsProvider({
  value,
  children,
}: {
  value: Ctx;
  children: React.ReactNode;
}) {
  return <ReportsExportsContext.Provider value={value}>{children}</ReportsExportsContext.Provider>;
}

export function useReportsExports() {
  return useContext(ReportsExportsContext);
}
