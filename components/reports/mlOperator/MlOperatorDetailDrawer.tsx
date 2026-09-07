import { Button, Drawer } from '@/components/ui';

import { MlOperatorDetailSections, getMlOperatorDetailTitle, type MlOperatorDetailSelection } from './MlOperatorDetailSections';

type MlOperatorDetailDrawerProps = {
  selection: MlOperatorDetailSelection | null;
  open: boolean;
  onClose: () => void;
};

const safetyBadges = ['اطلاعات ثبت‌شده', 'فقط مشاهده', 'بدون تغییر خودکار'];

export function MlOperatorDetailDrawer({ selection, open, onClose }: MlOperatorDetailDrawerProps) {
  return (
    <Drawer
      isOpen={open}
      onClose={onClose}
      title={getMlOperatorDetailTitle(selection)}
      kicker="فقط مشاهده"
      ariaDescription="این پنل جزئیات اطلاعات ثبت‌شده را برای بررسی نمایش می‌دهد."
      iconClass="fa-solid fa-eye"
      size="lg"
      panelAttributes={{
        'data-report-drawer-kind': 'ml-operator',
        'data-ml-operator-detail-drawer-anchor': 'metadata-only-read-only-detail',
      }}
      footer={(
        <Button type="button" variant="secondary" size="sm" onClick={onClose} leftIcon={<i className="fa-solid fa-arrow-right" aria-hidden="true" />}>
          بازگشت به پایش
        </Button>
      )}
    >
      <div className="flex flex-wrap gap-2">
        {safetyBadges.map((badge) => (
          <span key={badge} className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-200 dark:ring-emerald-800">
            <i className="fa-solid fa-shield-halved" aria-hidden="true" />
            {badge}
          </span>
        ))}
      </div>
      <MlOperatorDetailSections selection={selection} />
    </Drawer>
  );
}

export type { MlOperatorDetailSelection };
