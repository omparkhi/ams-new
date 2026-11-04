import React, { useEffect } from 'react';
import Navbar from '../components/Navbar';
import BrandLogos from '../components/BrandLogos';
import FAQ from '../components/FAQ';
import Footer from '../components/Footer';
import { Link } from 'react-router-dom';

export default function About() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="body">
      <section className="sections">
        <Navbar />

        {/* Hero Section */}
        <section className="hero-section">
          <section className="hero-area">
            <div className="w-layout-blockcontainer container w-container">
              <div className="content-wrapper">
                <div className="hero-section-content">
                  <div className="top-label">
                    <p className="tag-text">Our Mission</p>
                  </div>
                  <h1 className="hero-display-heading">
                    Attendance Made Effortless.
                  </h1>
                  <p className="hero-description" style={{ maxWidth: '600px', margin: '0 auto 24px auto' }}>
                    We built AMS to replace clunky fingerprint scanners and paper sign-in sheets with fast, browser-based face check-in for modern campuses and teams.
                  </p>
                  <div className="hero-buttons">
                    <Link to="/features" className="hero-button w-inline-block">
                      <div className="hero-button-content-wrap">
                        <p className="hero-button-text">See Features</p>
                      </div>
                    </Link>
                    <Link to="/book-a-demo" className="hero-button w-inline-block" style={{ backgroundColor: '#fff', border: '1px solid #cbd5e1' }}>
                      <div className="hero-button-content-wrap">
                        <p className="hero-button-text" style={{ color: '#0f172a' }}>Book Demo</p>
                      </div>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </section>

        <BrandLogos />

        {/* 4 Pillars */}
        <section className="features-section">
          <div className="w-layout-blockcontainer container w-container">
            <div className="features-content-wrapper">
              <div className="features-content-wrap">
                <div className="features-section-title">
                  <h2 className="align-center">What We Stand For</h2>
                  <p className="align-center">
                    Simple, fast, and completely hardware-free.
                  </p>
                </div>

                <div className="features-card-wrap">
                  <div className="features-card">
                    <div className="features-content-left">
                      <div className="feature-title-wrap">
                        <h3>1. Zero Hardware Needed</h3>
                        <p className="body-14">
                          No expensive scanners or cards to replace. Works on any phone, tablet, or laptop camera.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="features-card _02">
                    <div className="features-content-left _02">
                      <div className="feature-title-wrap">
                        <h3>2. 100% Proxy-Proof</h3>
                        <p className="body-14">
                          Deep face matching and live check-in snapshots mean no one can clock in for a friend.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="features-card-03">
                    <div className="features-content-left">
                      <div className="feature-title-wrap">
                        <h3>3. Multi-Branch Support</h3>
                        <p className="body-14">
                          Manage multiple colleges, companies, or departments with independent shift rules.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="features-card">
                    <div className="features-content-left">
                      <div className="feature-title-wrap">
                        <h3>4. 1-Click Excel Reports</h3>
                        <p className="body-14">
                          Export clean, color-coded daily, monthly, and semester spreadsheets with automated totals.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <FAQ />
        <Footer />
      </section>
    </div>
  );
}
