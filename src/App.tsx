import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import WorkerStopPage from './pages/WorkerStopPage';
import AdminDashboard from './pages/AdminDashboard';
import AdminSettings from './pages/AdminSettings';
import RequestDetail from './pages/RequestDetail';
import AdminLayout from './components/AdminLayout';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/stop" replace />} />
        <Route path="/stop" element={<WorkerStopPage />} />
        
        {/* Admin Routes */}
        <Route path="/admin" element={<AdminLayout><AdminDashboard /></AdminLayout>} />
        <Route path="/admin/settings" element={<AdminLayout><AdminSettings /></AdminLayout>} />
        <Route path="/admin/requests/:id" element={<AdminLayout><RequestDetail /></AdminLayout>} />
      </Routes>
    </BrowserRouter>
  );
}
