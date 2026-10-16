import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './AuthContext'
import { LanguageProvider } from './LanguageContext'
import { Toaster } from 'react-hot-toast'
import Layout from './components/Layout'

import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import DashboardPage from './pages/DashboardPage'
import ReportPage from './pages/ReportPage'
import WaterMapPage from './pages/WaterMapPage'
import ForecastPage from './pages/ForecastPage'
import BookTankerPage from './pages/BookTankerPage'
import BulkWaterPage from './pages/BulkWaterPage'
import ContactsPage from './pages/ContactsPage'
import AquaAssistPage from './pages/AquaAssistPage'
import NotificationsPage from './pages/NotificationsPage'
import ProfilePage from './pages/ProfilePage'
import ProviderBookingsPage from './pages/ProviderBookingsPage'
import AdminManagementPage from './pages/AdminManagementPage'
import BroadcastPage from './pages/BroadcastPage'
import SourcesPage from './pages/SourcesPage'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: 40, height: 40, border: '4px solid #2583D8', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <div style={{ fontWeight: 600, color: 'var(--color-primary)' }}>Loading WMS Network...</div>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <Layout>{children}</Layout>
}

export default function App() {
  return (
    <LanguageProvider>
    <BrowserRouter>
      <AuthProvider>
        <Toaster position="top-right" />
        <Routes>
          {/* Public Auth Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Protected Application Routes */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/report" element={<ProtectedRoute><ReportPage /></ProtectedRoute>} />
          <Route path="/broadcasts" element={<ProtectedRoute><BroadcastPage /></ProtectedRoute>} />
          <Route path="/map" element={<ProtectedRoute><WaterMapPage /></ProtectedRoute>} />
          <Route path="/forecast" element={<ProtectedRoute><ForecastPage /></ProtectedRoute>} />
          <Route path="/sources" element={<ProtectedRoute><SourcesPage /></ProtectedRoute>} />
          <Route path="/book-tanker" element={<ProtectedRoute><BookTankerPage /></ProtectedRoute>} />
          <Route path="/bulk-water" element={<ProtectedRoute><BulkWaterPage /></ProtectedRoute>} />
          <Route path="/contacts" element={<ProtectedRoute><ContactsPage /></ProtectedRoute>} />
          <Route path="/assistant" element={<ProtectedRoute><AquaAssistPage /></ProtectedRoute>} />
          <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />

          {/* Provider Routes */}
          <Route path="/provider/bookings" element={<ProtectedRoute><ProviderBookingsPage /></ProtectedRoute>} />
          <Route path="/provider/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />

          {/* Admin Routes */}
          <Route path="/admin/users" element={<ProtectedRoute><AdminManagementPage /></ProtectedRoute>} />
          <Route path="/admin/reports" element={<ProtectedRoute><AdminManagementPage /></ProtectedRoute>} />
          <Route path="/admin/providers" element={<ProtectedRoute><AdminManagementPage /></ProtectedRoute>} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
    </LanguageProvider>
  )
}
