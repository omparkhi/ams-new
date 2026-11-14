import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Signup.css';

export default function Signup() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [formData, setFormData] = useState({
    company_name: '',
    username: '',
    password: '',
    confirm_password: '',
    check_in_time: '09:00',
    check_out_time: '18:00',
    required_hours: '8.0'
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
        company_name: formData.company_name.trim(),
        username: formData.username.trim(),
        email: `${formData.username.trim()}@${formData.company_name.toLowerCase().replace(/[^a-z0-9]/g, '') || 'company'}.local`,
        password: formData.password,
        check_in_time: formData.check_in_time,
        check_out_time: formData.check_out_time,
        required_hours: formData.required_hours,
        leaves_per_month: '2'
      });

      navigate('/app/dashboard');
    } catch (err) {
      setError(err.message || 'Failed to complete registration. Please check your details.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="attendify-signup-page">
      <div className="signup-hero-container">
        {/* Exact Hero Background Shapes & Textures from Landing Page */}
        <img
          src="/images/693f7a801b0f40ebff9c2e56_Mask%20group%20%284%29.png"
          alt=""
          className="signup-hero-texture"
          loading="lazy"
        />
        <div className="signup-hero-top-gradient" />
        <img
          src="/images/693f6993aff3e20a61a64fc3_Background%20Container.avif"
          alt=""
          className="signup-hero-bottom-wave"
          loading="lazy"
        />

        {/* Header with Centered Attendify Logo & Heading */}
        <header className="signup-header">
          <Link to="/" className="signup-logo-link" title="Attendify Home">
            <img
              src="/attendify-logo.png"
              alt="Attendify"
              className="signup-logo-img"
            />
          </Link>
          <h1 className="signup-main-title">Create Your Organization</h1>
          <p className="signup-main-subtitle">
            Set up your organization in minutes and start smart attendance<br />
            for your students, interns, or team.
          </p>
        </header>

        {/* Main Registration Card */}
        <main className="signup-card-container">
          {/* Error Alert if any */}
          {error && (
            <div className="signup-alert-error" role="alert">
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

          <form onSubmit={handleSubmit} noValidate>
            {/* Company Name */}
            <div className="signup-form-group">
              <label className="signup-form-label" htmlFor="company_name">
                Company Name <span className="required-star">*</span>
              </label>
              <div className="signup-input-box">
                <span className="signup-input-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect>
                    <path d="M9 22v-4h6v4"></path>
                    <line x1="8" y1="6" x2="8.01" y2="6"></line>
                    <line x1="16" y1="6" x2="16.01" y2="6"></line>
                    <line x1="12" y1="6" x2="12.01" y2="6"></line>
                    <line x1="12" y1="10" x2="12.01" y2="10"></line>
                    <line x1="12" y1="14" x2="12.01" y2="14"></line>
                    <line x1="16" y1="10" x2="16.01" y2="10"></line>
                    <line x1="16" y1="14" x2="16.01" y2="14"></line>
                    <line x1="8" y1="10" x2="8.01" y2="10"></line>
                    <line x1="8" y1="14" x2="8.01" y2="14"></line>
                  </svg>
                </span>
                <input
                  id="company_name"
                  type="text"
                  name="company_name"
                  required
                  placeholder="Enter company or institution name"
                  value={formData.company_name}
                  onChange={handleChange}
                  className="signup-text-input"
                />
              </div>
            </div>

            {/* Username */}
            <div className="signup-form-group">
              <label className="signup-form-label" htmlFor="username">
                Username <span className="required-star">*</span>
              </label>
              <div className="signup-input-box">
                <span className="signup-input-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                </span>
                <input
                  id="username"
                  type="text"
                  name="username"
                  required
                  placeholder="Choose an admin username"
                  value={formData.username}
                  onChange={handleChange}
                  className="signup-text-input"
                  autoComplete="username"
                />
              </div>
            </div>

            {/* Password & Confirm Password (2-col grid) */}
            <div className="signup-grid-2">
              <div>
                <label className="signup-form-label" htmlFor="password">
                  Password <span className="required-star">*</span>
                </label>
                <div className="signup-input-box">
                  <span className="signup-input-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                    </svg>
                  </span>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    required
                    placeholder="Create a strong password"
                    value={formData.password}
                    onChange={handleChange}
                    className="signup-text-input"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="signup-eye-toggle-btn"
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

              <div>
                <label className="signup-form-label" htmlFor="confirm_password">
                  Confirm Password <span className="required-star">*</span>
                </label>
                <div className="signup-input-box">
                  <span className="signup-input-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                    </svg>
                  </span>
                  <input
                    id="confirm_password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    name="confirm_password"
                    required
                    placeholder="Re-enter your password"
                    value={formData.confirm_password}
                    onChange={handleChange}
                    className="signup-text-input"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="signup-eye-toggle-btn"
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

            {/* Shift Timings & Rules Box */}
            <div className="signup-shift-box">
              <div className="signup-shift-icon-circle">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6366F1" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
              </div>
              <div className="signup-shift-text-wrap">
                <h3 className="signup-shift-heading">Shift Timings & Rules</h3>
                <p className="signup-shift-subtext">Define your organization's attendance policy</p>
              </div>
            </div>

            {/* 3 Dropdowns (Check-In Time, Check-Out Time, Required Hours) */}
            <div className="signup-grid-3">
              <div>
                <label className="signup-form-label" htmlFor="check_in_time">
                  Check-In Time
                </label>
                <div className="signup-select-wrapper">
                  <span className="signup-select-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"></circle>
                      <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                  </span>
                  <select
                    id="check_in_time"
                    name="check_in_time"
                    value={formData.check_in_time}
                    onChange={handleChange}
                    className="signup-select-element"
                  >
                    <option value="08:00">08:00 AM</option>
                    <option value="08:30">08:30 AM</option>
                    <option value="09:00">09:00 AM</option>
                    <option value="09:30">09:30 AM</option>
                    <option value="10:00">10:00 AM</option>
                    <option value="10:30">10:30 AM</option>
                    <option value="11:00">11:00 AM</option>
                  </select>
                  <span className="signup-select-chevron">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                  </span>
                </div>
              </div>

              <div>
                <label className="signup-form-label" htmlFor="check_out_time">
                  Check-Out Time
                </label>
                <div className="signup-select-wrapper">
                  <span className="signup-select-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"></circle>
                      <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                  </span>
                  <select
                    id="check_out_time"
                    name="check_out_time"
                    value={formData.check_out_time}
                    onChange={handleChange}
                    className="signup-select-element"
                  >
                    <option value="16:00">04:00 PM</option>
                    <option value="16:30">04:30 PM</option>
                    <option value="17:00">05:00 PM</option>
                    <option value="17:30">05:30 PM</option>
                    <option value="18:00">06:00 PM</option>
                    <option value="18:30">06:30 PM</option>
                    <option value="19:00">07:00 PM</option>
                    <option value="19:30">07:30 PM</option>
                    <option value="20:00">08:00 PM</option>
                  </select>
                  <span className="signup-select-chevron">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                  </span>
                </div>
              </div>

              <div>
                <label className="signup-form-label" htmlFor="required_hours">
                  Required Hours
                </label>
                <div className="signup-select-wrapper">
                  <span className="signup-select-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="13" r="8"></circle>
                      <path d="M12 9v4l2 2"></path>
                      <path d="M5 3L2 6"></path>
                      <path d="M22 6l-3-3"></path>
                      <path d="M12 2v3"></path>
                    </svg>
                  </span>
                  <select
                    id="required_hours"
                    name="required_hours"
                    value={formData.required_hours}
                    onChange={handleChange}
                    className="signup-select-element"
                  >
                    <option value="4.0">4 Hours</option>
                    <option value="5.0">5 Hours</option>
                    <option value="6.0">6 Hours</option>
                    <option value="7.0">7 Hours</option>
                    <option value="7.5">7.5 Hours</option>
                    <option value="8.0">8 Hours</option>
                    <option value="8.5">8.5 Hours</option>
                    <option value="9.0">9 Hours</option>
                    <option value="10.0">10 Hours</option>
                  </select>
                  <span className="signup-select-chevron">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                  </span>
                </div>
              </div>
            </div>

            {/* Primary CTA Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className="signup-submit-btn"
            >
              {submitting ? (
                <>
                  <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}>
                    <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
                  </svg>
                  <span>Creating Organization...</span>
                </>
              ) : (
                <>
                  <span>Register Organization &amp; Enter App</span>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                    <polyline points="12 5 19 12 12 19"></polyline>
                  </svg>
                </>
              )}
            </button>
          </form>

          {/* Card Footer: Sign In Link */}
          <div className="signup-signin-footer">
            Already have an organization account?
            <Link to="/login" className="signup-signin-link">
              Sign In
            </Link>
          </div>
        </main>

        {/* Trust Badges Row (Below Card) */}
        <footer className="signup-trust-row" aria-label="Trust assurances">
          <div className="signup-trust-item">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
            </svg>
            <span>Instant setup</span>
          </div>

          <span className="signup-trust-divider">|</span>

          <div className="signup-trust-item">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"></path>
            </svg>
            <span>Multi-tenant cloud isolated</span>
          </div>

          <span className="signup-trust-divider">|</span>

          <div className="signup-trust-item">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
              <line x1="8" y1="21" x2="16" y2="21"></line>
              <line x1="12" y1="17" x2="12" y2="21"></line>
            </svg>
            <span>Zero hardware required</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
