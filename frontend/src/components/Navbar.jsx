import { Link, NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Dumbbell, Calendar, Ticket, LogOut, User, LogIn, UserPlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="navbar">
      <div className="nav-container">
        <Link to={user ? "/slots" : "/login"} className="nav-brand">
          <div className="brand-icon-wrapper">
            <Dumbbell className="w-5 h-5" />
          </div>
          <span className="brand-text">Gym Booking</span>
          <span className="brand-badge">PRO</span>
        </Link>

        <nav className="nav-links">
          {user ? (
            <>
              <NavLink to="/slots" className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}>
                <Calendar className="w-4 h-4" />
                <span>Slots</span>
              </NavLink>

              <NavLink to="/bookings" className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}>
                <Ticket className="w-4 h-4" />
                <span>My Bookings</span>
              </NavLink>

              <div className="user-section">
                <div className="user-greeting-badge">
                  <User className="w-4 h-4 user-avatar-icon" />
                  <span>Hi, {user.name}</span>
                </div>

                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={handleLogout}
                  className="btn btn-outline btn-sm"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </motion.button>
              </div>
            </>
          ) : (
            <>
              <NavLink to="/login" className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}>
                <LogIn className="w-4 h-4" />
                <span>Login</span>
              </NavLink>

              <NavLink to="/register" className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}>
                <UserPlus className="w-4 h-4" />
                <span>Register</span>
              </NavLink>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
