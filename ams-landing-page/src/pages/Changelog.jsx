import React, { useEffect } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export default function Changelog() {
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
              <div className="w-layout-blockcontainer container blog w-container">
                <div className="integrations-content-wrapper">
                  <div className="integrations-content-wrap">
                    <div className="features-section-title core-value">
                      <h1 className="hero-display-heading-black">AMS Product Changelog</h1>
                      <p className="align-center">
                        Track new features, biometric model improvements, and performance enhancements released in AMS.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </section>
        </section>

        <section className="changelog-section">
          <div className="w-layout-blockcontainer container changelog w-container">
            <div className="changelog-content-wrapper">
              <div className="changelog-card-wrapper">
                {/* Version 2.4.0 */}
                <div className="changelog-card">
                  <div className="changelog-verson">
                    <div className="bullet-wrap-3"><div className="bullet-2"></div></div>
                    <p className="changelog-date">October 2026</p>
                  </div>
                  <div className="changelog-content-wrap">
                    <div className="changelog-feature-title">
                      <p className="verson-text-main">v2.4.0 (Latest Stable)</p>
                      <div className="changelog-title-wrap">
                        <p className="changelog-title">Multi-Tenant Super Admin Hub &amp; 6-Month Semester Reports</p>
                        <p className="body-text-16">
                          Added complete multi-tenant organization support. Super Admins can monitor 30+ partner companies in real time and export styled multi-period Excel sheets across Daily, Weekly, Monthly, and 6-Month horizons.
                        </p>
                      </div>
                      <div className="changelog-title-wrap">
                        <p className="changelog-title">Temporary Check-In Snapshot Proofs</p>
                        <p className="body-text-16">
                          Live entrance check-ins now save a temporary timestamped webcam frame (`temp_checkin_images`) for supervisor visual audits.
                        </p>
                      </div>
                    </div>
                  </div>
                  <p className="most-popular-text-v2">Major Release</p>
                </div>

                {/* Version 2.2.0 */}
                <div className="changelog-card">
                  <div className="changelog-verson">
                    <div className="bullet-wrap-3"><div className="bullet-2"></div></div>
                    <p className="changelog-date">August 2026</p>
                  </div>
                  <div className="changelog-content-wrap">
                    <div className="changelog-feature-title">
                      <p className="verson-text-main">v2.2.0</p>
                      <div className="changelog-title-wrap">
                        <p className="changelog-title">20-Frame Face Onboarding Wizard</p>
                        <p className="body-text-16">
                          Upgraded facial registration with a 20-frame camera burst at 500ms intervals, validating face quality before storing encrypted 128-d vectors.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Version 2.0.0 */}
                <div className="changelog-card">
                  <div className="changelog-verson">
                    <div className="bullet-wrap-3"><div className="bullet-2"></div></div>
                    <p className="changelog-date">May 2026</p>
                  </div>
                  <div className="changelog-content-wrap">
                    <div className="changelog-feature-title">
                      <p className="verson-text-main">v2.0.0</p>
                      <div className="changelog-title-wrap">
                        <p className="changelog-title">Zero-Hardware Browser Check-In Screen</p>
                        <p className="body-text-16">
                          Full transition to browser-based computer vision. Entrance terminals run in any browser on tablets, iPads, and standard webcams without dedicated hardware.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <Footer />
      </section>
    </div>
  );
}
