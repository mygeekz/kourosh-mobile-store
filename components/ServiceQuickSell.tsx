import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Service, SellableItem } from '../types';
import { apiFetch } from '../utils/apiFetch';
import { useAuth } from '../contexts/AuthContext';
import Button from './Button';

interface Props {
  variant?: 'default' | 'dark';
  layout?: 'grid' | 'list';
  maxVisible?: number;
  onAddItem?: (item: SellableItem) => void;
}

export const ServiceQuickSell: React.FC<Props> = ({ variant = 'default', layout = 'grid', maxVisible, onAddItem }) => {
  const { token } = useAuth();
  const nav = useNavigate();
  const [services, setServices] = React.useState<Service[]>([]);

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

  const isEmbeddedSales = Boolean(onAddItem);

  return (
    <div
      className={`service-quick-sell mt-0.5 ${isEmbeddedSales ? 'service-quick-sell--sales-embedded' : ''}`}
      data-ui-service-quick-sell="true"
      data-ui-service-context={isEmbeddedSales ? 'sales' : 'standalone'}
    >
      {showHeading ? (
        <div className="mb-3 flex items-center gap-2">
          <i className="fa-solid fa-bolt text-sm text-slate-600 dark:text-slate-300" aria-hidden="true" />
          <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">فروش سریع خدمات</h3>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">انتخاب سریع خدمت و افزودن مورد جدید مستقیم به سبد فروش</p>
          </div>
        </div>
      ) : null}

      <div
        className={`service-quick-sell__items service-quick-sell__items--${layout}`}
       
        style={layout === 'list' && maxVisible ? { maxHeight: `${maxVisible * 64}px` } : undefined}
      >
        {services.map((service) => (
          <Button
            key={service.id}
            type="button"
            onClick={() => addToBasket(service)}
            title={service.name}
            variant={variant === 'dark' ? 'neutral' : 'secondary'}
            size="md"
            className="min-h-[64px] w-full justify-start text-right"
            leftIcon={<i className="fa-solid fa-bolt" />}
          >
            <span className="grid min-w-0 gap-1 text-right">
              <strong className="truncate text-xs">{service.name}</strong>
              <small className="text-[10px] font-semibold opacity-75">{Number(service.price || 0).toLocaleString('fa-IR')} تومان</small>
            </span>
          </Button>
        ))}
      </div>
    </div>
  );
};
