import { Suspense, lazy } from 'react';
import { BrowserRouter, HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { ThemeProvider } from './context/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import { isElectron } from './lib/desktop';
import './App.css';

// Lazy load pages for code splitting
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const RegisterPM = lazy(() => import('./pages/RegisterPM'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Teams = lazy(() => import('./pages/Teams'));
const Projects = lazy(() => import('./pages/Projects'));
const ProjectWorkspace = lazy(() => import('./pages/ProjectWorkspace'));
const Profile = lazy(() => import('./pages/Profile'));
const RolesManagement = lazy(() => import('./pages/RolesManagement'));
const Leaves = lazy(() => import('./pages/Leaves'));
const AdminAttendance = lazy(() => import('./pages/AdminAttendance'));
const Timesheets = lazy(() => import('./pages/Timesheets'));
const Attendance = lazy(() => import('./pages/Attendance'));
const Onboarding = lazy(() => import('./pages/Onboarding'));
const WorkReportsPage = lazy(() => import('./pages/WorkReportsPage'));

function App() {
  const Router = isElectron ? HashRouter : BrowserRouter;

  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <Router>
            <Suspense fallback={<div className="page-loading"><div className="spinner" /></div>}>
              <Routes>
                {/* Public routes */}
                <Route path="/" element={<Onboarding />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/register/pm" element={<RegisterPM />} />

                {/* Protected routes wrapped in Layout */}
                <Route
                  element={
                    <ProtectedRoute>
                      <Layout />
                    </ProtectedRoute>
                  }
                >
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/teams" element={
                    <ProtectedRoute roles={['SU', 'PM', 'TL', 'JP']}><Teams /></ProtectedRoute>
                  } />
                  <Route path="/projects" element={
                    <ProtectedRoute roles={['SU', 'PM', 'TL', 'JP']}><Projects /></ProtectedRoute>
                  } />
                  <Route path="/projects/:id" element={
                    <ProtectedRoute roles={['SU', 'PM', 'TL', 'JP']}><ProjectWorkspace /></ProtectedRoute>
                  } />

                  <Route path="/profile" element={
                    <ProtectedRoute roles={['SU', 'PM', 'TL', 'JP']}><Profile /></ProtectedRoute>
                  } />
                  <Route path="/roles" element={
                    <ProtectedRoute roles={['SU']}><RolesManagement /></ProtectedRoute>
                  } />
                  <Route path="/leaves" element={
                    <ProtectedRoute roles={['SU', 'PM', 'TL', 'JP']}><Leaves /></ProtectedRoute>
                  } />
                  <Route path="/attendance" element={
                    <ProtectedRoute roles={['SU', 'PM', 'TL', 'JP']}><Attendance /></ProtectedRoute>
                  } />
                  <Route path="/work-reports" element={
                    <ProtectedRoute roles={['SU', 'PM', 'TL', 'JP']}><WorkReportsPage /></ProtectedRoute>
                  } />

                </Route>

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </Router>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

export default App;
