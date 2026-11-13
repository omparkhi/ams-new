import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import '../../styles/ams-theme.css';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const from = location.state?.from?.pathname || '/app/dashboard';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await login(username, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || 'Invalid username or password.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="ams-login-body">
      <div className="ams-login-container">
        <h1>AI Attendance Management</h1>
        <p style={{ color: '#E0E6ED', marginBottom: '20px', fontSize: '0.95rem' }}>
          Sign in to your organization attendance portal
        </p>

        {error && (
          <div style={{
            backgroundColor: '#DC3545',
            color: '#fff',
            padding: '10px',
            borderRadius: '8px',
            marginBottom: '15px',
            fontSize: '0.9rem'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ width: '100%' }}>
          <div style={{ marginBottom: '15px', textAlign: 'left' }}>
            <label style={{ display: 'block', color: '#E0E6ED', marginBottom: '5px', fontWeight: '500' }}>
              Username
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              className="ams-input"
              style={{ borderRadius: '8px' }}
            />
          </div>

          <div style={{ marginBottom: '20px', textAlign: 'left' }}>
            <label style={{ display: 'block', color: '#E0E6ED', marginBottom: '5px', fontWeight: '500' }}>
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className="ams-input"
              style={{ borderRadius: '8px' }}
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="ams-btn ams-btn-success"
            style={{ width: '100%', padding: '12px', borderRadius: '8px', fontSize: '1rem', fontWeight: 'bold' }}
          >
            {submitting ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        <div style={{ marginTop: '20px', fontSize: '0.9rem', color: '#E0E6ED' }}>
          Don't have an organization account?{' '}
          <Link to="/signup" style={{ color: '#ffffff', fontWeight: 'bold', textDecoration: 'underline' }}>
            Register Organization
          </Link>
        </div>
      </div>
    </div>
  );
}
