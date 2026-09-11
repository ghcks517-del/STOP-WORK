import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { isRunningAsPWA } from './lib/utils';
import LandingPage from './pages/LandingPage';
import WorkerStopPage from './pages/WorkerStopPage';
import HazardReportPage from './pages/HazardReportPage';
import AdminDashboard from './pages/AdminDashboard';
import AdminSettings from './pages/AdminSettings';
import RequestDetail from './pages/RequestDetail';
import AdminLayout from './components/AdminLayout';

export default function App() {
  const isPWA = isRunningAsPWA();

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to={isPWA ? "/admin" : "/home"} replace />} />
        <Route path="/home" element={<LandingPage />} />
        <Route path="/stop" element={<WorkerStopPage />} />
        <Route path="/hazard" element={<HazardReportPage />} />
        
        {/* Admin Routes */}
        <Route path="/admin" element={<AdminLayout><AdminDashboard /></AdminLayout>} />
        <Route path="/admin/settings" element={<AdminLayout><AdminSettings /></AdminLayout>} />
        <Route path="/admin/requests/:id" element={<AdminLayout><RequestDetail /></AdminLayout>} />
      </Routes>
    </BrowserRouter>
  );
}
