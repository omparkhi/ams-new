import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import FAQ from '../components/FAQ';
import Footer from '../components/Footer';

export default function Contact() {
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    organization: '',
    cohortSize: '100-500',
    message: '',
  });

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
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
                    <p className="tag-text">Get in Touch</p>
                  </div>
                  <h1 className="hero-display-heading">
                    Let&apos;s Modernize Your Institution&apos;s Attendance
                  </h1>
                  <p className="hero-description">
                    Whether you manage 50 students in a single department or 5,000 interns placed across 40 partner companies, our technical team is ready to assist.
                  </p>
                </div>
              </div>
            </div>
          </section>
        </section>

        {/* Contact Form Section */}
        <section className="contact-section" style={{ padding: '60px 20px', maxWidth: '800px', margin: '0 auto' }}>
          {submitted ? (
            <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', padding: '40px', borderRadius: '12px', textAlign: 'center' }}>
              <h3 style={{ color: '#166534', marginBottom: '12px', fontSize: '24px' }}>Thank You for Reaching Out!</h3>
              <p style={{ color: '#15803d', fontSize: '16px' }}>
                Our institutional deployment team has received your message and will schedule your consultation within 24 hours.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ backgroundColor: '#fff', padding: '36px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Dr. Rajesh Sharma"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Official Email</label>
                  <input
                    type="email"
                    required
                    placeholder="r.sharma@university.edu"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Institution / Organization</label>
                  <input
                    type="text"
                    required
                    placeholder="Apex Institute of Technology"
                    value={formData.organization}
                    onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Student / User Count</label>
                  <select
                    value={formData.cohortSize}
                    onChange={(e) => setFormData({ ...formData, cohortSize: e.target.value })}
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', backgroundColor: '#fff' }}
                  >
                    <option value="Under 100">Under 100 Users</option>
                    <option value="100-500">100 - 500 Users</option>
                    <option value="500-2000">500 - 2,000 Users</option>
                    <option value="2000+">2,000+ Multi-Campus Users</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Inquiry Details</label>
                <textarea
                  rows="4"
                  placeholder="Tell us about your attendance setup, number of partner companies, and specific shift rules..."
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                ></textarea>
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
                  fontSize: '16px',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                }}
              >
                Request Consultation &amp; Pilot Access
              </button>
            </form>
          )}
        </section>

        <FAQ />
        <Footer />
      </section>
    </div>
  );
}
