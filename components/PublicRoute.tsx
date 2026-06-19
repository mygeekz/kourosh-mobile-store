import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const PublicRoute: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    // Optional: Show a loading spinner or a blank page
    return <div className="flex h-screen items-center justify-center text-gray-500"><i className="fas fa-spinner fa-spin text-3xl"></i></div>;
  }
  
  return isAuthenticated() ? <Navigate to="/" replace /> : <Outlet />;
};

export default PublicRoute;
