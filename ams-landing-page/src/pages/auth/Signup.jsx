import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import '../../styles/ams-modern.css';

export default function Signup() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [formData, setFormData] = useState({
    company_name: '',
    username: '',
    email: '',
    password: '',
    confirm_password: '',
    check_in_time: '10:00',
    check_out_time: '18:30',
    required_hours: '7.0',
    leaves_per_month: '2'
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirm_password) {
      setError('Passwords do not match. Please verify both password fields.');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setSubmitting(true);
    try {
      await register({
        company_name: formData.company_name,
        username: formData.username,
        email: formData.email,
        password: formData.password,
        check_in_time: formData.check_in_time,
        check_out_time: formData.check_out_time,
        required_hours: formData.required_hours,
        leaves_per_month: formData.leaves_per_month
      });

      navigate('/app/dashboard');
    } catch (err) {
      setError(err.message || 'Failed to complete registration. Please check your details.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modern-auth-body">
      {/* Top Navigation */}
      <div className="modern-auth-top-nav">
        <Link to="/" className="modern-auth-back-link">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
          Back to Home
        </Link>
      </div>

      {/* Main Registration Card */}
      <div className="modern-auth-card signup-card">
        {/* Brand Icon & Heading */}
        <div className="modern-auth-header">
          <div className="modern-auth-icon-wrap">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
            </svg>
          </div>
          <h1 className="modern-auth-title">Create Organization Workspace</h1>
          <p className="modern-auth-subtitle">
            Automated self-service setup for your company, college, or team
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="modern-auth-alert-error">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '2px' }}>
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <div style={{ flex: 1 }}>
              <div>{error}</div>
              {error.toLowerCase().includes('already') && (
                <div style={{ marginTop: '6px' }}>
                  <Link to="/login" style={{ color: '#B91C1C', fontWeight: '700', textDecoration: 'underline' }}>
                    Click here to Sign In with your existing account →
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Signup Form */}
        <form onSubmit={handleSubmit}>
          {/* Section 1: Organization Details */}
          <div className="modern-auth-section-title">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
              <polyline points="9 22 9 12 15 12 15 22"></polyline>
            </svg>
            <span>Organization Profile</span>
          </div>

          <div className="modern-auth-field">
            <label className="modern-auth-label">
              Company / Institution Name <span className="required">*</span>
            </label>
            <div className="modern-auth-input-wrap">
              <input
                type="text"
                name="company_name"
                required
                placeholder="e.g. Acme Corp or Global University"
                value={formData.company_name}
                onChange={handleChange}
                className="modern-auth-input"
              />
            </div>
          </div>

          <div className="modern-auth-grid-2">
            <div className="modern-auth-field">
              <label className="modern-auth-label">
                Admin Username <span className="required">*</span>
              </label>
              <div className="modern-auth-input-wrap">
                <input
                  type="text"
                  name="username"
                  required
                  placeholder="e.g. acme_admin"
                  value={formData.username}
                  onChange={handleChange}
                  className="modern-auth-input"
                  autoComplete="username"
                />
              </div>
            </div>

            <div className="modern-auth-field">
              <label className="modern-auth-label">
                Official Email
              </label>
              <div className="modern-auth-input-wrap">
                <input
                  type="email"
                  name="email"
                  placeholder="admin@company.com"
                  value={formData.email}
                  onChange={handleChange}
                  className="modern-auth-input"
                  autoComplete="email"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Security & Password */}
          <div className="modern-auth-section-title">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
            <span>Security Credentials</span>
          </div>

          <div className="modern-auth-grid-2">
            <div className="modern-auth-field">
              <label className="modern-auth-label">
                Password <span className="required">*</span>
              </label>
              <div className="modern-auth-input-wrap">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  required
                  placeholder="Min 6 characters"
                  value={formData.password}
                  onChange={handleChange}
                  className="modern-auth-input has-icon-right"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="modern-auth-eye-btn"
                  title={showPassword ? 'Hide password' : 'Show password'}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                      <line x1="1" y1="1" x2="23" y2="23"></line>
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                      <circle cx="12" cy="13" r="3"></circle>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div className="modern-auth-field">
              <label className="modern-auth-label">
                Confirm Password <span className="required">*</span>
              </label>
              <div className="modern-auth-input-wrap">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="confirm_password"
                  required
                  placeholder="Re-enter password"
                  value={formData.confirm_password}
                  onChange={handleChange}
                  className="modern-auth-input has-icon-right"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="modern-auth-eye-btn"
                  title={showConfirmPassword ? 'Hide password' : 'Show password'}
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                      <line x1="1" y1="1" x2="23" y2="23"></line>
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                      <circle cx="12" cy="13" r="3"></circle>
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Section 3: Attendance Shift Rules */}
          <div className="modern-auth-section-title">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
            <span>Shift Timings & Rules</span>
          </div>

          <div className="modern-auth-grid-3">
            <div className="modern-auth-field">
              <label className="modern-auth-label">
                Check-In Time
              </label>
              <div className="modern-auth-input-wrap">
                <input
                  type="time"
                  name="check_in_time"
                  value={formData.check_in_time}
                  onChange={handleChange}
                  className="modern-auth-input"
                />
              </div>
            </div>

            <div className="modern-auth-field">
              <label className="modern-auth-label">
                Check-Out Time
              </label>
              <div className="modern-auth-input-wrap">
                <input
                  type="time"
                  name="check_out_time"
                  value={formData.check_out_time}
                  onChange={handleChange}
                  className="modern-auth-input"
                />
              </div>
            </div>

            <div className="modern-auth-field">
              <label className="modern-auth-label">
                Required Hours
              </label>
              <div className="modern-auth-input-wrap">
                <input
                  type="number"
                  step="0.5"
                  min="1"
                  max="24"
                  name="required_hours"
                  value={formData.required_hours}
                  onChange={handleChange}
                  className="modern-auth-input"
                />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting}
            className="modern-auth-submit-btn"
          >
            {submitting ? (
              <>
                <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
                </svg>
                <span>Provisioning Workspace...</span>
              </>
            ) : (
              <>
                <span>Register Organization & Enter App</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                  <polyline points="12 5 19 12 12 19"></polyline>
                </svg>
              </>
            )}
          </button>
        </form>

        {/* Footer Redirect Link */}
        <div className="modern-auth-footer">
          Already have an organization account?
          <Link to="/login">Sign In</Link>
        </div>

        {/* Trust Badge */}
        <div className="modern-auth-trust-badge">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          <span>Instant setup • Multi-tenant cloud isolated • Zero hardware required</span>
        </div>
      </div>
    </div>
  );
}
