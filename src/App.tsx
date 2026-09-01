import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import Desktop from '@/components/Desktop';
import LoginScreen from '@/pages/LoginScreen';
import AdminPage from '@/pages/AdminPage';
import LandingPage from '@/pages/LandingPage';
import SpecialCapabilities from '@/pages/SpecialCapabilities';
import OAuthConsent from '@/pages/OAuthConsent';
import SSOGuide from '@/pages/SSOGuide';
import OAuthTest from '@/pages/OAuthTest';

function AppContent() {
  const { user, isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: '#050d1a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#fff', fontSize: 18, fontFamily: 'Segoe UI, sans-serif', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 32, height: 22, borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ height: '33.3%', background: '#fff' }} />
            <div style={{ height: '33.3%', background: '#1565c0' }} />
            <div style={{ height: '33.3%', background: '#dc2626' }} />
          </div>
          Чайка ОС загружается...
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/about" element={<LandingPage />} />
      <Route path="/special" element={<SpecialCapabilities />} />
      <Route path="/api-docs" element={<SpecialCapabilities />} />
      <Route path="/oauth/authorize" element={<OAuthConsent />} />
      <Route path="/sso-guide" element={<SSOGuide />} />
      <Route path="/oauth/test" element={<OAuthTest />} />
      <Route path="/admin" element={
        !user ? <Navigate to="/" replace /> :
        !isAdmin ? <Navigate to="/" replace /> :
        <AdminPage />
      } />
      <Route path="*" element={user ? <Desktop /> : <LoginScreen />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </AuthProvider>
  );
}
