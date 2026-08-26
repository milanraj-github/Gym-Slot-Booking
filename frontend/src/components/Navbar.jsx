import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="nav-container">
        <Link to={user ? "/slots" : "/login"} className="nav-brand">
          <span className="brand-icon">🏋️</span> Gym Slot Booking
        </Link>

        <div className="nav-links">
          {user ? (
            <>
              <NavLink to="/slots" className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}>
                Slots
              </NavLink>
              <NavLink to="/bookings" className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}>
                My Bookings
              </NavLink>
              <div className="user-section">
                <span className="user-greeting">Hi, {user.name}</span>
                <button onClick={handleLogout} className="btn btn-outline btn-sm">
                  Logout
                </button>
              </div>
            </>
          ) : (
            <>
              <NavLink to="/login" className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}>
                Login
              </NavLink>
              <NavLink to="/register" className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}>
                Register
              </NavLink>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
