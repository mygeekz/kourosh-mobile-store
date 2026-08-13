import React from 'react';
import { useNavigate } from 'react-router-dom';
import { TableActionGroup } from '@/components/ui';

type CustomerRowActionsProps = {
  customerId: number;
  customerName: string;
  onSendReport: () => void | Promise<void>;
  onDelete: () => void;
};

const CustomerRowActions: React.FC<CustomerRowActionsProps> = ({
  customerId,
  customerName,
  onSendReport,
  onDelete,
}) => {
  const navigate = useNavigate();
  const labelSuffix = customerName ? ` ${customerName}` : '';

  return (
    <TableActionGroup
      ariaLabel={`عملیات پرونده${labelSuffix}`}
      collapseBelow="lg"
      actions={[
        {
          key: 'view',
          kind: 'button',
          onClick: () => navigate(`/customers/${customerId}`),
          label: `مشاهده پرونده${labelSuffix}`,
          tooltip: 'مشاهده پرونده',
          variant: 'secondary',
          icon: <i className="fa-solid fa-eye" aria-hidden="true" />,
        },
        {
          key: 'report',
          kind: 'button',
          onClick: onSendReport,
          label: `ارسال گزارش برای${labelSuffix}`,
          tooltip: 'ارسال گزارش',
          variant: 'secondary',
          icon: <i className="fa-brands fa-telegram" aria-hidden="true" />,
        },
        {
          key: 'delete',
          kind: 'button',
          onClick: onDelete,
          label: `حذف پرونده${labelSuffix}`,
          tooltip: 'حذف پرونده بدون سابقه',
          variant: 'danger',
          requiredRoles: ['Admin', 'Manager'],
          icon: <i className="fa-solid fa-trash" aria-hidden="true" />,
        },
      ]}
    />
  );
};

export default CustomerRowActions;
