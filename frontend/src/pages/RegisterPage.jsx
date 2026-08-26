import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Mail, Lock, UserPlus, CheckCircle2, AlertCircle, Dumbbell } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function RegisterPage() {
  const { register, login } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [success, setSuccess] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
    setFieldErrors({});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setFieldErrors({});
    setSuccess('');

    try {
      // 1. Register account
      await register(formData.name, formData.email, formData.password);
      setSuccess('Registration successful! Logging you in...');

      // 2. Automatically log in user and navigate to slots dashboard
      await login(formData.email, formData.password);
      navigate('/slots');
    } catch (err) {
      if (err.errors && Array.isArray(err.errors)) {
        const mapped = {};
        err.errors.forEach((item) => {
          mapped[item.field] = item.message;
        });
        setFieldErrors(mapped);
        setError(err.message || 'Validation failed');
      } else if (err.message && err.message.includes('fetch')) {
        setError('Unable to connect to backend server. Please verify backend is running on port 3000.');
      } else {
        setError(err.message || 'Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="glass-card auth-card"
      >
        <div className="auth-header">
          <div className="auth-logo-badge">
            <Dumbbell className="w-7 h-7" />
          </div>
          <h2>Create Account</h2>
          <p className="auth-subtitle">Join SlotGuard Gym System today</p>
        </div>

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="alert alert-error mb-4"
            >
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}

          {success && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="alert alert-success mb-4"
            >
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
              <span>{success}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="name">Full Name</label>
            <div className="input-wrapper">
              <User className="w-4 h-4 input-icon" />
              <input
                type="text"
                id="name"
                name="name"
                className="glass-input"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g. Milan Raj"
                required
                disabled={loading}
              />
            </div>
            {fieldErrors.name && <span className="field-error">{fieldErrors.name}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <div className="input-wrapper">
              <Mail className="w-4 h-4 input-icon" />
              <input
                type="email"
                id="email"
                name="email"
                className="glass-input"
                value={formData.email}
                onChange={handleChange}
                placeholder="e.g. milan@example.com"
                required
                disabled={loading}
              />
            </div>
            {fieldErrors.email && <span className="field-error">{fieldErrors.email}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className="input-wrapper">
              <Lock className="w-4 h-4 input-icon" />
              <input
                type="password"
                id="password"
                name="password"
                className="glass-input"
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter secure password"
                required
                disabled={loading}
              />
            </div>
            {fieldErrors.password && <span className="field-error">{fieldErrors.password}</span>}
          </div>

          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            className="btn btn-primary btn-block"
            disabled={loading}
          >
            {loading ? (
              <>
                <div className="spinner w-4 h-4 border-2" />
                <span>Creating Account...</span>
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                <span>Register & Access Dashboard</span>
              </>
            )}
          </motion.button>
        </form>

        <div className="auth-footer">
          Already have an account? <Link to="/login">Log in here</Link>
        </div>
      </motion.div>
    </div>
  );
}
