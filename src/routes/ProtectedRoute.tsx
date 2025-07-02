import { useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLocationStore } from '@/store/locationStore';
import EmployeeLayout from '@/components/layouts/EmployeeLayout';

const ProtectedRoute = () => {
  const { currentUser, loading, isAdmin } = useAuth();
  const { initRealtimeUpdates, cleanup } = useLocationStore();

  console.log('ProtectedRoute - Current state:', { 
    userEmail: currentUser?.email,
    loading,
    isAdmin 
  });

  // Initialize real-time updates only when user is authenticated
  useEffect(() => {
    if (currentUser && !loading) {
      console.log('ProtectedRoute: Initializing location real-time updates for authenticated user');
      initRealtimeUpdates();

      // Cleanup on unmount or when user changes
      return () => {
        console.log('ProtectedRoute: Cleaning up location real-time updates');
        cleanup();
      };
    }
  }, [currentUser, loading, initRealtimeUpdates, cleanup]);

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