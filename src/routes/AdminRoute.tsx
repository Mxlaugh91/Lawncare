import { useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLocationStore } from '@/store/locationStore';
import AdminLayout from '@/components/layouts/AdminLayout';

const AdminRoute = () => {
  const { currentUser, loading, isAdmin } = useAuth();
  const { initRealtimeUpdates, cleanup } = useLocationStore();

  console.log('AdminRoute - Current state:', { 
    userEmail: currentUser?.email,
    loading,
    isAdmin 
  });

  // Initialize real-time updates only when admin user is authenticated
  useEffect(() => {
    if (currentUser && !loading && isAdmin) {
      console.log('AdminRoute: Initializing location real-time updates for authenticated admin');
      initRealtimeUpdates();

      // Cleanup on unmount or when user changes
      return () => {
        console.log('AdminRoute: Cleaning up location real-time updates');
        cleanup();
      };
    }
  }, [currentUser, loading, isAdmin, initRealtimeUpdates, cleanup]);

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Laster...</div>;
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/employee" replace />;
  }

  return (
    <AdminLayout>
      <Outlet />
    </AdminLayout>
  );
};

export default AdminRoute;