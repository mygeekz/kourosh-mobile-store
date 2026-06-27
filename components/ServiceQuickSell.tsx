import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Service, SellableItem } from '../types';
import { apiFetch } from '../utils/apiFetch';
import { useAuth } from '../contexts/AuthContext';
import { useStyle } from '../contexts/StyleContext';

interface Props {
  variant?: 'default' | 'dark';
  layout?: 'grid' | 'list';
  maxVisible?: number;
  onAddItem?: (item: SellableItem) => void;
}

export const ServiceQuickSell: React.FC<Props> = ({ variant = 'default', layout = 'grid', maxVisible, onAddItem }) => {
  const { token } = useAuth();
  const nav = useNavigate();
  const { style } = useStyle();
  const [services, setServices] = React.useState<Service[]>([]);

  const brand = `hsl(${style.primaryHue} 90% 55%)`;
  const showHeading = !onAddItem;

  React.useEffect(() => {
    apiFetch('/api/services')
      .then((r) => r.json())
      .then((res) => res.success && setServices(res.data))
      .catch(() => setServices([]));
  }, [token]);

  const addToBasket = (svc: Service) => {
    const sellable = {
      id: svc.id,
      type: 'service' as const,
      name: svc.name,
      price: Number(svc.price) || 0,
      stock: Infinity,
      purchasePrice: 0,
    };
    if (onAddItem) {
      onAddItem(sellable);
      return;
    }
    nav('/sales', { state: { prefillItem: sellable } });
  };

  return (
    <div className="service-quick-sell mt-0.5" data-ui-service-quick-sell="true">
      {showHeading ? (
        <div className="mb-3 flex items-center gap-2">
          <span
            className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-slate-200 bg-white text-sm shadow-sm dark:border-slate-800 dark:bg-slate-950"
            style={{ color: brand }}
          >
            <i className="fa-solid fa-bolt text-[12px]" />
          </span>
          <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">فروش سریع خدمات</h3>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">انتخاب سریع خدمت و افزودن مورد جدید مستقیم به سبد فروش</p>
          </div>
        </div>
      ) : null}

      <div className={layout === 'list' ? 'grid grid-cols-1 gap-2.5 overflow-y-auto pr-1' : 'grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3'} style={layout === 'list' && maxVisible ? { maxHeight: `${maxVisible * 82}px` } : undefined}>
        {services.map((service) => (
          <button
            key={service.id}
            type="button"
            onClick={() => addToBasket(service)}
            title={service.name}
            data-ui-service-card="quick-sell"
            className={[
              layout === 'list'
                ? 'service-quick-sell__card group grid min-h-[76px] w-full grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 rounded-[20px] border px-3.5 py-3 text-right transition duration-150'
                : 'service-quick-sell__card group grid min-h-[60px] w-full grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 rounded-2xl border px-3 py-2 text-right transition duration-150',
              'border-slate-200 bg-white text-slate-900 shadow-[0_18px_36px_-30px_rgba(15,23,42,0.24)] hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50',
              'dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:hover:border-slate-700 dark:hover:bg-slate-900',
              variant === 'dark' ? 'dark:border-slate-700/80 dark:bg-slate-950/90' : '',
            ].join(' ')}
          >
            <div className="flex min-w-0 items-start gap-3">
              <span className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[18px] bg-slate-100 text-slate-700 transition group-hover:bg-slate-200 dark:bg-slate-900 dark:text-slate-200 dark:group-hover:bg-slate-800">
                <i className="fa-solid fa-bolt text-[12px]" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[13.5px] font-black leading-5.5 text-slate-900 dark:text-slate-100 whitespace-normal break-words">
                  {service.name}
                </div>
              </div>
            </div>
            <div className="justify-self-end pl-1">
              <span className="inline-flex shrink-0 items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10.5px] font-black text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                {Number(service.price || 0).toLocaleString('fa-IR')} تومان
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
