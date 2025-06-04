import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import AdminLayout from '@/components/layouts/AdminLayout';

const AdminRoute = () => {
  const { currentUser, loading, isAdmin } = useAuth();

  console.log('AdminRoute - Current state:', { 
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

  if (!isAdmin) {
    return <Navigate to="/employee\" replace />;
  }

  return (
    <AdminLayout>
      <Outlet />
    </AdminLayout>
  );
};

export default AdminRoute;