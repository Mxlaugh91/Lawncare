import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import EmployeeLayout from '@/components/layouts/EmployeeLayout';

const ProtectedRoute = () => {
  const { currentUser, loading, isAdmin } = useAuth();

  console.log('ProtectedRoute - Current state:', { 
    userEmail: currentUser?.email,
    loading,
    isAdmin 
  });

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Laster...</div>;
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (isAdmin) {
    return <Navigate to="/admin" replace />;
  }

  return (
    <EmployeeLayout>
      <Outlet />
    </EmployeeLayout>
  );
};

export default ProtectedRoute;