import React from 'react';
import Button from './Button';
import { RoleName } from '../utils/rbac';

interface PermissionButtonProps extends React.ComponentProps<typeof Button> {
  fallbackRolesLabel?: string;
  requiredRoles?: RoleName[];
}

const formatRoles = (roles?: RoleName[]) => {
  if (!roles?.length) return 'سطح دسترسی لازم مشخص نشده است';
  return `دسترسی لازم: ${roles.join(' / ')}`;
};

export default function PermissionButton({ fallbackRolesLabel, requiredRoles, permissionTooltip, ...props }: PermissionButtonProps) {
  return (
    <Button
      requiredRoles={requiredRoles}
      permissionTooltip={permissionTooltip || fallbackRolesLabel || formatRoles(requiredRoles)}
      {...props}
    />
  );
}
