import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Signup.css';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
      setError(err.message || 'Invalid username or password. Please verify your credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="attendify-signup-page">
      <div className="signup-hero-container">
        {/* Exact Hero Texture - Smoothly masked so it blends seamlessly */}
        <img
          src="/images/693f7a801b0f40ebff9c2e56_Mask%20group%20%284%29.png"
          alt=""
          className="signup-hero-texture"
          loading="lazy"
        />

        {/* Compact Header with Centered Attendify Logo & Heading */}
        <header className="signup-header">
          <Link to="/" className="signup-logo-link" title="Attendify Home">
            <img
              src="/attendify-logo.png"
              alt="Attendify"
              className="signup-logo-img"
            />
          </Link>
          <h1 className="signup-main-title">Sign In to Attendify</h1>
          <p className="signup-main-subtitle">
            Access your organization attendance portal and smart face recognition system.
          </p>
        </header>

        {/* Main Compact Login Card */}
        <main className="signup-card-container" style={{ maxWidth: '440px', padding: '24px 28px 20px 28px' }}>
          {/* Error Alert if any */}
          {error && (
            <div className="signup-alert-error" role="alert">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '1px' }}>
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              <div>{error}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            {/* Admin Username or Email */}
            <div className="signup-form-group">
              <label className="signup-form-label" htmlFor="username">
                Admin Username or Email <span className="required-star">*</span>
              </label>
              <div className="signup-input-box">
                <span className="signup-input-icon">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                </span>
                <input
                  id="username"
                  type="text"
                  name="username"
                  required
                  placeholder="Enter username or email"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="signup-text-input"
                  autoComplete="username"
                />
              </div>
            </div>

            {/* Password */}
            <div className="signup-form-group" style={{ marginBottom: '14px' }}>
              <label className="signup-form-label" htmlFor="password">
                Password <span className="required-star">*</span>
              </label>
              <div className="signup-input-box">
                <span className="signup-input-icon">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                  </svg>
                </span>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  required
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="signup-text-input"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="signup-eye-toggle-btn"
                  title={showPassword ? 'Hide password' : 'Show password'}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                      <line x1="1" y1="1" x2="23" y2="23"></line>
                    </svg>
                  ) : (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                      <circle cx="12" cy="13" r="3"></circle>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Primary CTA Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className="signup-submit-btn"
              style={{ marginTop: '16px' }}
            >
              {submitting ? (
                <>
                  <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}>
                    <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
                  </svg>
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Workspace</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                    <polyline points="12 5 19 12 12 19"></polyline>
                  </svg>
                </>
              )}
            </button>
          </form>

          {/* Card Footer: Register Link */}
          <div className="signup-signin-footer" style={{ marginTop: '16px' }}>
            Don't have an organization account?
            <Link to="/signup" className="signup-signin-link">
              Register Organization
            </Link>
          </div>
        </main>

        {/* Compact Trust Badges Row (Below Card) */}
        <footer className="signup-trust-row" aria-label="Trust assurances">
          <div className="signup-trust-item">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
            </svg>
            <span>Instant access</span>
          </div>

          <span className="signup-trust-divider">|</span>

          <div className="signup-trust-item">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"></path>
            </svg>
            <span>Multi-tenant cloud isolated</span>
          </div>

          <span className="signup-trust-divider">|</span>

          <div className="signup-trust-item">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
            <span>256-bit SSL encrypted</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
