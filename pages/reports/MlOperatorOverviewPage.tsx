import { Navigate } from 'react-router-dom';
import MlOperatorOverview from '../../components/reports/MlOperatorOverview';
import { useAuth } from '../../contexts/AuthContext';

const allowedRoles = new Set(['Admin', 'Manager']);

export default function MlOperatorOverviewPage() {
  const { currentUser, token, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center text-slate-500 dark:text-slate-300" dir="rtl">
        <i className="fa-solid fa-spinner fa-spin ml-2" />
        در حال بررسی دسترسی...
      </div>
    );
  }

  if (!currentUser) return <Navigate to="/login" replace />;
  if (!allowedRoles.has(currentUser.roleName)) return <Navigate to="/403" replace />;

  return <MlOperatorOverview token={token} />;
}
