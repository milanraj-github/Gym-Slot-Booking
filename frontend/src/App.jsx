import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { ProtectedRoute, PublicOnlyRoute } from './components/ProtectedRoute';
import { SlotGuardIntro } from './components/SlotGuardIntro';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { SlotsPage } from './pages/SlotsPage';
import { MyBookingsPage } from './pages/MyBookingsPage';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        {/* 2-Second SlotGuard Aurora Intro Splash Screen */}
        <SlotGuardIntro />

        {/* Dynamic Aurora Waves Background Canvas */}
        <div className="aurora-background">
          <div className="aurora-wave aurora-wave-1" />
          <div className="aurora-wave aurora-wave-2" />
          <div className="aurora-wave aurora-wave-3" />
        </div>

        <div className="app-layout">
          <Navbar />
          <main className="main-content">
            <Routes>
              {/* Public Auth Routes */}
              <Route element={<PublicOnlyRoute />}>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
              </Route>

              {/* Protected Member Routes */}
              <Route element={<ProtectedRoute />}>
                <Route path="/slots" element={<SlotsPage />} />
                <Route path="/bookings" element={<MyBookingsPage />} />
              </Route>

              {/* Default redirects */}
              <Route path="/" element={<Navigate to="/slots" replace />} />
              <Route path="*" element={<Navigate to="/slots" replace />} />
            </Routes>
          </main>
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
