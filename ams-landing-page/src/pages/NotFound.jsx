import React, { useEffect } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Link } from 'react-router-dom';

export default function NotFound() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="body">
      <section className="sections">
        <Navbar />

        <section className="hero-section-main" style={{ padding: '80px 20px', textAlign: 'center' }}>
          <div className="w-layout-blockcontainer container blog w-container">
            <h1 style={{ fontSize: '96px', fontWeight: 800, color: '#2563eb', margin: 0, lineHeight: 1 }}>404</h1>
            <h2 style={{ fontSize: '28px', fontWeight: 700, color: '#0f172a', marginTop: '16px', marginBottom: '12px' }}>
              Page Not Found
            </h2>
            <p style={{ fontSize: '16px', color: '#64748b', maxWidth: '500px', margin: '0 auto 30px auto', lineHeight: 1.6 }}>
              The page you are looking for doesn&apos;t exist or has been moved. Explore our core attendance and student management platform below.
            </p>
            <Link
              to="/"
              style={{
                display: 'inline-block',
                padding: '14px 28px',
                backgroundColor: '#2563eb',
                color: '#fff',
                textDecoration: 'none',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '15px',
              }}
            >
              Return to Homepage →
            </Link>
          </div>
        </section>

        <Footer />
      </section>
    </div>
  );
}
