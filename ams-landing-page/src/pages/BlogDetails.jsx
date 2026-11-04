import React, { useEffect } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Link } from 'react-router-dom';

export default function BlogDetails() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="body">
      <section className="sections">
        <Navbar />

        <section className="hero-section-main">
          <section className="hero-area-main">
            <section className="hero-area-block">
              <div className="w-layout-blockcontainer container blog-details w-container">
                <div data-w-id="354ee57e-ae18-c024-3795-f35dce4ed1a1" className="blog-details-content-block">
                  <div className="hero-content-wrapper blog-details">
                    <div className="hero-section-title-wrap blog-details">
                      <div className="blog-category-wrap">
                        <p className="blog-category-text">Biometric Technology</p>
                        <div className="blog-date-text">
                          <img src="/images/693f6993aff3e20a61a65010_CalendarMinus.svg" loading="lazy" alt="" className="blog-date-icon" />
                          <p className="blog-date">October 24, 2026</p>
                        </div>
                      </div>
                      <h1>How Zero-Hardware Face Recognition Eradicates Proxy Attendance</h1>
                    </div>
                    <div className="hero-image-wrap">
                      <img
                        src="/images/693f6993aff3e20a61a64f57_Blog%20Post%20Image%20Container%20(8).png"
                        loading="lazy"
                        alt="Biometric Face Recognition"
                        className="blog-details-image"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </section>
        </section>

        <section className="blog-details-section" style={{ padding: '60px 20px', maxWidth: '850px', margin: '0 auto' }}>
          <div style={{ fontSize: '16px', lineHeight: 1.8, color: '#334155' }}>
            <p style={{ fontSize: '18px', fontWeight: 500, color: '#0f172a', marginBottom: '24px' }}>
              For decades, educational institutions placing students across partner enterprises and companies managing remote branches faced an unsolvable trade-off: deploy costly biometric hardware or tolerate widespread proxy attendance.
            </p>

            <h3 style={{ fontSize: '22px', fontWeight: 700, color: '#0f172a', marginTop: '36px', marginBottom: '16px' }}>
              1. The Downfall of Legacy Fingerprint &amp; Card Scanners
            </h3>
            <p style={{ marginBottom: '16px' }}>
              Traditional fingerprint readers were once the gold standard. However, in high-throughput environments like college departments and entrance lobbies, optical sensors rapidly accumulate dirt, fail on dry skin, and suffer mechanical breakdown. Furthermore, RFID swipe cards are easily handed over to classmates — logging the presence of the card, never the person.
            </p>

            <h3 style={{ fontSize: '22px', fontWeight: 700, color: '#0f172a', marginTop: '36px', marginBottom: '16px' }}>
              2. Generating Mathematical 128-d Facial Vectors
            </h3>
            <p style={{ marginBottom: '16px' }}>
              AMS changes this dynamic by moving the entire biometric pipeline into standard web browsers. During the 20-frame registration procedure, deep neural networks detect 68 facial landmarks and project them into an immutable 128-dimensional embedding space.
            </p>
            <p style={{ marginBottom: '16px' }}>
              When a student steps in front of any camera-equipped laptop, iPad, or tablet screen, Euclidean distance comparisons identify the individual in under 400 milliseconds at a strict tolerance threshold (&lt;0.45), preventing false positives.
            </p>

            <h3 style={{ fontSize: '22px', fontWeight: 700, color: '#0f172a', marginTop: '36px', marginBottom: '16px' }}>
              3. Automatic Shift Logic &amp; Photographic Proof
            </h3>
            <p style={{ marginBottom: '16px' }}>
              Unlike simple punch-clock software, AMS enforces dynamic institutional policies:
            </p>
            <ul style={{ paddingLeft: '24px', marginBottom: '20px' }}>
              <li style={{ marginBottom: '8px' }}><strong>Target Shift Windows:</strong> Grace periods allow slight transit delays while flagging chronic tardiness.</li>
              <li style={{ marginBottom: '8px' }}><strong>Minimum Hours Check:</strong> Shifts exceeding full thresholds earn Full Day credit, while 4-8 hours earn Half Day status automatically.</li>
              <li style={{ marginBottom: '8px' }}><strong>Snapshot Audit Log:</strong> A timestamped camera snapshot is retained for active shifts, giving supervisors visual audit capability.</li>
            </ul>

            <h3 style={{ fontSize: '22px', fontWeight: 700, color: '#0f172a', marginTop: '36px', marginBottom: '16px' }}>
              4. The Multi-Tenant Super Admin Hub
            </h3>
            <p style={{ marginBottom: '24px' }}>
              When an engineering dean manages 600 interns placed across 30 different corporate partner companies, fragmented record-keeping is catastrophic. With AMS, each company operates with independent rosters and shift targets, while the university Super Admin can view campus-wide presence and download consolidated monthly and 6-month semester completion spreadsheets with a single click.
            </p>

            <div style={{ backgroundColor: '#f8fafc', padding: '24px', borderRadius: '12px', borderLeft: '4px solid #2563eb', marginTop: '30px' }}>
              <p style={{ margin: 0, fontWeight: 600, color: '#0f172a' }}>
                Ready to eliminate attendance fraud in your institution?{' '}
                <Link to="/book-a-demo" style={{ color: '#2563eb', textDecoration: 'underline' }}>
                  Schedule a live interactive walkthrough with our team.
                </Link>
              </p>
            </div>
          </div>
        </section>

        <Footer />
      </section>
    </div>
  );
}
