import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import '../../styles/ams-theme.css';

export default function CompanySettings() {
  const [settings, setSettings] = useState({
    company_name: '',
    check_in_time: '10:00',
    check_out_time: '18:30',
    required_hours: '7.0',
    leaves_per_month: '2',
    email: '',
    contact: '',
    address: ''
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await api.getCompanySettings();
        const d = res.settings || {};
        setSettings({
          company_name: d['Company Name'] || '',
          check_in_time: (d['Check In Time'] || '10:00:00').substring(0, 5),
          check_out_time: (d['Check Out Time'] || '18:30:00').substring(0, 5),
          required_hours: String(d['Required Hours'] || '7.0'),
          leaves_per_month: String(d['Leaves Per Month'] || '2'),
          email: d['Email'] || '',
          contact: d['Contact'] || '',
          address: d['Address'] || ''
        });
      } catch (err) {
        console.error("Failed to load settings:", err);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSettings((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      await api.updateCompanySettings({
        check_in_time: settings.check_in_time,
        check_out_time: settings.check_out_time,
        required_hours: settings.required_hours,
        leaves_per_month: settings.leaves_per_month,
        email: settings.email,
        contact: settings.contact,
        address: settings.address
      });
      setMessage({ type: 'success', text: 'Company shift settings updated successfully!' });
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to update settings.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div style={{ color: '#A0A0A0', textAlign: 'center', padding: '50px' }}>Loading configuration...</div>;
  }

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto' }}>
      <div className="ams-dashboard-header" style={{ textAlign: 'center' }}>
        <h1>Setup Company Shift & Times</h1>
        <p>Configure daily check-in targets, check-out targets, and required hours</p>
      </div>

      {message.text && (
        <div className={message.type === 'error' ? 'ams-error-message' : 'ams-welcome-message'}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="ams-card">
        <div style={{ marginBottom: '15px' }}>
          <label className="ams-label">Company Name</label>
          <input
            type="text"
            disabled
            value={settings.company_name}
            className="ams-input"
            style={{ opacity: 0.8 }}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
          <div>
            <label className="ams-label">Check-In Time (HH:MM)</label>
            <input
              type="text"
              name="check_in_time"
              placeholder="10:00"
              value={settings.check_in_time}
              onChange={handleChange}
              className="ams-input"
            />
          </div>

          <div>
            <label className="ams-label">Check-Out Time (HH:MM)</label>
            <input
              type="text"
              name="check_out_time"
              placeholder="18:30"
              value={settings.check_out_time}
              onChange={handleChange}
              className="ams-input"
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
          <div>
            <label className="ams-label">Required Daily Hours</label>
            <input
              type="text"
              name="required_hours"
              placeholder="7.0"
              value={settings.required_hours}
              onChange={handleChange}
              className="ams-input"
            />
          </div>

          <div>
            <label className="ams-label">Leaves Per Month</label>
            <input
              type="number"
              name="leaves_per_month"
              value={settings.leaves_per_month}
              onChange={handleChange}
              className="ams-input"
            />
          </div>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label className="ams-label">Official Contact Phone</label>
          <input
            type="text"
            name="contact"
            placeholder="+91 9876543210"
            value={settings.contact}
            onChange={handleChange}
            className="ams-input"
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label className="ams-label">Company Address</label>
          <input
            type="text"
            name="address"
            placeholder="Office Address"
            value={settings.address}
            onChange={handleChange}
            className="ams-input"
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="ams-btn ams-btn-success"
          style={{ width: '100%', padding: '12px', fontSize: '1rem', fontWeight: 'bold' }}
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </form>
    </div>
  );
}
