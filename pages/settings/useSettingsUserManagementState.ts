import { useState } from 'react';
import {
  EditUserFormData,
  NewUserFormData,
  Role,
  UserForDisplay,
} from '../../types';
import { type PartnerShareStatus } from './settingsHelpers';

const createInitialNewUserState = (): NewUserFormData => ({
  username: '',
  password: '',
  confirmPassword: '',
  roleId: '',
});

export function useSettingsUserManagementState() {
  const [users, setUsers] = useState<UserForDisplay[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const initialNewUserState = createInitialNewUserState();
  const [newUser, setNewUser] = useState<NewUserFormData>(initialNewUserState);
  const [isSavingUser, setIsSavingUser] = useState(false);
  const [addUserFormErrors, setAddUserFormErrors] = useState<Partial<NewUserFormData>>({});
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<EditUserFormData | null>(null);
  const [, setEditUserFormErrors] = useState<Partial<EditUserFormData>>({});
  const [isUpdatingUser, setIsUpdatingUser] = useState(false);
  const [isResetPasswordModalOpen, setIsResetPasswordModalOpen] = useState(false);
  const [resettingUser, setResettingUser] = useState<UserForDisplay | null>(null);
  const [resetPasswordData, setResetPasswordData] = useState({ password: '', confirmPassword: '' });
  const [resetPasswordErrors, setResetPasswordErrors] = useState<Partial<typeof resetPasswordData>>({});
  const [isSubmittingReset, setIsSubmittingReset] = useState(false);
  const [isDeleteUserModalOpen, setIsDeleteUserModalOpen] = useState(false);
  const [deletingUser, setDeletingUser] = useState<UserForDisplay | null>(null);
  const [isDeletingUser, setIsDeletingUser] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<'all' | string>('all');
  const [partnerShareStatus, setPartnerShareStatus] = useState<PartnerShareStatus>({
    state: 'loading',
    totalShare: 0,
    partnerCount: 0,
    label: 'در حال بررسی',
    hint: 'در حال خواندن جمع سهم شرکا…',
  });

  return {
    users,
    setUsers,
    roles,
    setRoles,
    isAddUserModalOpen,
    setIsAddUserModalOpen,
    newUser,
    setNewUser,
    isSavingUser,
    setIsSavingUser,
    addUserFormErrors,
    setAddUserFormErrors,
    isEditUserModalOpen,
    setIsEditUserModalOpen,
    editingUser,
    setEditingUser,
    isUpdatingUser,
    setIsUpdatingUser,
    isResetPasswordModalOpen,
    setIsResetPasswordModalOpen,
    resettingUser,
    setResettingUser,
    resetPasswordData,
    setResetPasswordData,
    resetPasswordErrors,
    setResetPasswordErrors,
    isSubmittingReset,
    setIsSubmittingReset,
    isDeleteUserModalOpen,
    setIsDeleteUserModalOpen,
    deletingUser,
    setDeletingUser,
    isDeletingUser,
    setIsDeletingUser,
    userSearchQuery,
    setUserSearchQuery,
    userRoleFilter,
    setUserRoleFilter,
    partnerShareStatus,
    setPartnerShareStatus,
    setEditUserFormErrors,
    initialNewUserState,
  };
}
