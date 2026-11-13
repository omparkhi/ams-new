import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import '../../styles/ams-theme.css';

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
      setError('Passwords do not match.');
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
      setError(err.message || 'Failed to complete registration.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="ams-login-body">
      <div className="ams-login-container" style={{ maxWidth: '560px' }}>
        <h1>Create Organization Workspace</h1>
        <p style={{ color: '#E0E6ED', marginBottom: '20px', fontSize: '0.95rem' }}>
          Automated self-service registration for your company or college
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
              Company / Institution Name *
            </label>
            <input
              type="text"
              name="company_name"
              required
              placeholder="e.g. Acme Tech Solutions"
              value={formData.company_name}
              onChange={handleChange}
              className="ams-input"
              style={{ borderRadius: '8px' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px', textAlign: 'left' }}>
            <div>
              <label style={{ display: 'block', color: '#E0E6ED', marginBottom: '5px', fontWeight: '500' }}>
                Admin Username *
              </label>
              <input
                type="text"
                name="username"
                required
                placeholder="acme_admin"
                value={formData.username}
                onChange={handleChange}
                className="ams-input"
                style={{ borderRadius: '8px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', color: '#E0E6ED', marginBottom: '5px', fontWeight: '500' }}>
                Official Email
              </label>
              <input
                type="email"
                name="email"
                placeholder="admin@company.com"
                value={formData.email}
                onChange={handleChange}
                className="ams-input"
                style={{ borderRadius: '8px' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px', textAlign: 'left' }}>
            <div>
              <label style={{ display: 'block', color: '#E0E6ED', marginBottom: '5px', fontWeight: '500' }}>
                Password *
              </label>
              <input
                type="password"
                name="password"
                required
                placeholder="Min 6 characters"
                value={formData.password}
                onChange={handleChange}
                className="ams-input"
                style={{ borderRadius: '8px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', color: '#E0E6ED', marginBottom: '5px', fontWeight: '500' }}>
                Confirm Password *
              </label>
              <input
                type="password"
                name="confirm_password"
                required
                placeholder="Repeat password"
                value={formData.confirm_password}
                onChange={handleChange}
                className="ams-input"
                style={{ borderRadius: '8px' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '20px', textAlign: 'left' }}>
            <div>
              <label style={{ display: 'block', color: '#E0E6ED', marginBottom: '5px', fontSize: '0.85rem' }}>
                Check-In Time
              </label>
              <input
                type="text"
                name="check_in_time"
                value={formData.check_in_time}
                onChange={handleChange}
                className="ams-input"
                style={{ borderRadius: '8px', padding: '8px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', color: '#E0E6ED', marginBottom: '5px', fontSize: '0.85rem' }}>
                Check-Out Time
              </label>
              <input
                type="text"
                name="check_out_time"
                value={formData.check_out_time}
                onChange={handleChange}
                className="ams-input"
                style={{ borderRadius: '8px', padding: '8px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', color: '#E0E6ED', marginBottom: '5px', fontSize: '0.85rem' }}>
                Required Hours
              </label>
              <input
                type="text"
                name="required_hours"
                value={formData.required_hours}
                onChange={handleChange}
                className="ams-input"
                style={{ borderRadius: '8px', padding: '8px' }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="ams-btn ams-btn-success"
            style={{ width: '100%', padding: '12px', borderRadius: '8px', fontSize: '1rem', fontWeight: 'bold' }}
          >
            {submitting ? 'Registering Workspace...' : 'Register Organization & Enter App →'}
          </button>
        </form>

        <div style={{ marginTop: '20px', fontSize: '0.9rem', color: '#E0E6ED' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: '#ffffff', fontWeight: 'bold', textDecoration: 'underline' }}>
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
