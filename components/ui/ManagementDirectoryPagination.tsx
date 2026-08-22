import React from 'react';

import Button from '../Button';

export type ManagementDirectoryPaginationProps = {
  page: number;
  totalPages: number;
  pageSize: number;
  pageSizeOptions: readonly number[];
  total: number;
  pageStart: number;
  pageEnd: number;
  ariaLabel: string;
  pageSizeAriaLabel: string;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
};

const getVisiblePages = (page: number, totalPages: number) => {
  const safeTotalPages = Math.max(1, totalPages);
  const windowSize = Math.min(5, safeTotalPages);
  const start = Math.min(Math.max(1, page - 2), Math.max(1, safeTotalPages - windowSize + 1));
  return Array.from({ length: windowSize }, (_, index) => start + index);
};

const ManagementDirectoryPagination: React.FC<ManagementDirectoryPaginationProps> = ({
  page,
  totalPages,
  pageSize,
  pageSizeOptions,
  total,
  pageStart,
  pageEnd,
  ariaLabel,
  pageSizeAriaLabel,
  onPageChange,
  onPageSizeChange,
}) => {
  const safeTotalPages = Math.max(1, totalPages);
  const visiblePages = getVisiblePages(page, safeTotalPages);

  return (
    <footer
      className="grid gap-2 border-t border-slate-200 px-3 py-2.5 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:items-center dark:border-slate-800"
      data-ui-management-directory-pagination="shared"
    >
      <div className="flex min-w-0 flex-wrap items-center justify-center gap-2 md:justify-start">
        <span className="shrink-0 text-xs font-bold text-slate-600 dark:text-slate-300">تعداد نمایش</span>
        <div
          className="inline-flex min-w-0 flex-wrap items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-900"
          role="group"
          aria-label={pageSizeAriaLabel}
        >
          {pageSizeOptions.map((option) => {
            const selected = option === pageSize;
            return (
              <Button
                key={option}
                type="button"
                variant={selected ? 'neutral' : 'ghost'}
                size="xs"
                autoIcon={false}
                aria-pressed={selected}
                aria-label={`نمایش ${option.toLocaleString('fa-IR')} مورد در هر صفحه`}
                onClick={() => onPageSizeChange(option)}
              >
                {option.toLocaleString('fa-IR')}
              </Button>
            );
          })}
        </div>
      </div>

      <nav className="flex max-w-full items-center justify-center gap-1 overflow-x-auto" aria-label={ariaLabel}>
        <Button
          type="button"
          variant="secondary"
          size="xs"
          autoIcon={false}
          disabled={page <= 1}
          onClick={() => onPageChange(Math.max(1, page - 1))}
          aria-label="صفحه قبل"
          leftIcon={<i className="fa-solid fa-chevron-right" aria-hidden="true" />}
        >
          قبلی
        </Button>
        {visiblePages.map((item) => (
          <Button
            key={item}
            type="button"
            variant={item === page ? 'primary' : 'secondary'}
            size="icon"
            autoIcon={false}
            data-active={item === page}
            onClick={() => onPageChange(item)}
            aria-label={`صفحه ${item.toLocaleString('fa-IR')}`}
          >
            {item.toLocaleString('fa-IR')}
          </Button>
        ))}
        <Button
          type="button"
          variant="secondary"
          size="xs"
          autoIcon={false}
          disabled={page >= safeTotalPages}
          onClick={() => onPageChange(Math.min(safeTotalPages, page + 1))}
          aria-label="صفحه بعد"
          leftIcon={<i className="fa-solid fa-chevron-left" aria-hidden="true" />}
        >
          بعدی
        </Button>
      </nav>

      <span className="text-center text-xs font-semibold text-slate-500 md:text-end dark:text-slate-400">
        نمایش {pageStart.toLocaleString('fa-IR')} تا {pageEnd.toLocaleString('fa-IR')} از {total.toLocaleString('fa-IR')}
      </span>
    </footer>
  );
};

export default ManagementDirectoryPagination;
