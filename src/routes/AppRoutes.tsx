import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from './ProtectedRoute';
import AdminRoute from './AdminRoute';

// Auth Pages
import LoginPage from '@/pages/auth/LoginPage';

// Admin Pages
import AdminDashboard from '@/pages/admin/Dashboard';
import AdminOperations from '@/pages/admin/Operations';
import AdminLocations from '@/pages/admin/Locations';
import AdminEmployees from '@/pages/admin/Employees';
import AdminArchive from '@/pages/admin/Archive';
import AdminEquipment from '@/pages/admin/Equipment';
import AdminSettings from '@/pages/admin/Settings';

// Employee Pages
import EmployeeDashboard from '@/pages/employee/Dashboard';
import EmployeeTimeEntry from '@/pages/employee/TimeEntry';
import EmployeeHistory from '@/pages/employee/History';

// Common Pages
import NotFoundPage from '@/pages/NotFoundPage';

const AppRoutes = () => {
  const { currentUser, loading, isAdmin } = useAuth();

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Laster...</div>;
  }

  return (
    <Routes>
      {/* Public Routes */}
      <Route 
        path="/login" 
        element={
          !currentUser ? (
            <LoginPage />
          ) : isAdmin ? (
            <Navigate to="/admin" replace />
          ) : (
            <Navigate to="/employee" replace />
          )
        } 
      />

      {/* Root redirect */}
      <Route 
        path="/" 
        element={
          !currentUser ? (
            <Navigate to="/login" replace />
          ) : isAdmin ? (
            <Navigate to="/admin" replace />
          ) : (
            <Navigate to="/employee" replace />
          )
        } 
      />

      {/* Admin Routes */}
      <Route path="/admin" element={<AdminRoute />}>
        <Route index element={<AdminDashboard />} />
        <Route path="drift" element={<AdminOperations />} />
        <Route path="steder" element={<AdminLocations />} />
        <Route path="steder/nytt" element={<AdminLocations isNew />} />
        <Route path="steder/:id" element={<AdminLocations />} />
        <Route path="ansatte" element={<AdminEmployees />} />
        <Route path="arkiv" element={<AdminArchive />} />
        <Route path="vedlikehold" element={<AdminEquipment />} />
        <Route path="innstillinger" element={<AdminSettings />} />
      </Route>

      {/* Employee Routes */}
      <Route path="/employee" element={<ProtectedRoute />}>
        <Route index element={<EmployeeDashboard />} />
        <Route path="timeregistrering" element={<EmployeeTimeEntry />} />
        <Route path="historikk" element={<EmployeeHistory />} />
      </Route>

      {/* Catch All */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};

export default AppRoutes;