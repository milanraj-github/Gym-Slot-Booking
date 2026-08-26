import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { ProtectedRoute, PublicOnlyRoute } from './components/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { SlotsPage } from './pages/SlotsPage';
import { MyBookingsPage } from './pages/MyBookingsPage';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="ambient-background">
          <div className="glow-orb glow-orb-1" />
          <div className="glow-orb glow-orb-2" />
          <div className="glow-orb glow-orb-3" />
        </div>

        <div className="app-layout">
          <Navbar />
          <main className="main-content">
            <Routes>
              {/* Public Routes (redirect to /slots if logged in) */}
              <Route element={<PublicOnlyRoute />}>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
              </Route>

              {/* Protected Routes (redirect to /login if not logged in) */}
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
