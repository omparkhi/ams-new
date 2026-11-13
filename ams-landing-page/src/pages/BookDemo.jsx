import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import FeaturesV2 from '../components/FeaturesV2';
import ProcessWalkthrough from '../components/ProcessWalkthrough';
import Footer from '../components/Footer';

export default function BookDemo() {
  const [booked, setBooked] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    organization: '',
    date: '',
    time: '11:00 AM',
  });

  useEffect(() => {
    window.location.href = 'https://tarsbookademoapp.vercel.app/demo/tars-attendify-newsletter';
  }, []);

  const handleBooking = (e) => {
    e.preventDefault();
    setBooked(true);
  };

  return (
    <div className="body">
      <section className="sections">
        <Navbar />

        <section className="hero-section">
          <section className="hero-area">
            <div className="w-layout-blockcontainer container w-container">
              <div className="content-wrapper">
                <div className="hero-section-content">
                  <div className="top-label">
                    <p className="tag-text">Live 1-on-1 Walkthrough</p>
                  </div>
                  <h1 className="hero-display-heading">
                    Experience AMS in Real-Time with a Technical Specialist
                  </h1>
                  <p className="hero-description">
                    See live 20-frame student onboarding, test the entrance face scan speed, and discover how AMS automates your multi-period attendance audits.
                  </p>
                </div>
              </div>
            </div>
          </section>
        </section>

        {/* Booking Form */}
        <section style={{ padding: '60px 20px', maxWidth: '750px', margin: '0 auto' }}>
          {booked ? (
            <div style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', padding: '40px', borderRadius: '16px', textAlign: 'center' }}>
              <h3 style={{ color: '#1e40af', fontSize: '24px', marginBottom: '8px' }}>Demo Confirmed!</h3>
              <p style={{ color: '#1d4ed8', fontSize: '15px' }}>
                We have reserved your session for <strong>{formData.date || 'your selected date'}</strong> at <strong>{formData.time}</strong>. An invite with video link has been sent to <strong>{formData.email}</strong>.
              </p>
            </div>
          ) : (
            <div style={{ backgroundColor: '#fff', padding: '36px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
              <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>Schedule Your 20-Minute Live Demo</h3>
              <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '24px' }}>Choose a convenient date and time to see the live face scanner in action.</p>

              <form onSubmit={handleBooking}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>Your Name</label>
                    <input
                      type="text"
                      required
                      placeholder="Prof. Ananya Roy"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>Work Email</label>
                    <input
                      type="email"
                      required
                      placeholder="a.roy@institution.edu"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>College / Company</label>
                    <input
                      type="text"
                      required
                      placeholder="Tech University / Firm Name"
                      value={formData.organization}
                      onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>Phone Number</label>
                    <input
                      type="tel"
                      required
                      placeholder="+1 (555) 000-0000"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>Preferred Date</label>
                    <input
                      type="date"
                      required
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', backgroundColor: '#fff' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>Preferred Time Window</label>
                    <select
                      value={formData.time}
                      onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', backgroundColor: '#fff' }}
                    >
                      <option value="10:00 AM">10:00 AM - 10:30 AM</option>
                      <option value="11:30 AM">11:30 AM - 12:00 PM</option>
                      <option value="02:00 PM">02:00 PM - 02:30 PM</option>
                      <option value="04:00 PM">04:00 PM - 04:30 PM</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  style={{
                    width: '100%',
                    padding: '14px',
                    backgroundColor: '#2563eb',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 600,
                    fontSize: '15px',
                    cursor: 'pointer',
                  }}
                >
                  Confirm Live Demo Booking
                </button>
              </form>
            </div>
          )}
        </section>

        <FeaturesV2 />
        <ProcessWalkthrough />
        <Footer />
      </section>
    </div>
  );
}
