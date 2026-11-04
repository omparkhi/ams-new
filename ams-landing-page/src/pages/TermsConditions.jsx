import React, { useEffect } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export default function TermsConditions() {
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
                    <div className="features-section-title privacy">
                      <h1 className="hero-display-heading-black">Terms &amp; Conditions</h1>
                      <p className="privacy-subtext">Last Updated: October 2026 | AMS Academic Platform Terms</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </section>
        </section>

        <section className="privacy-section">
          <div className="w-layout-blockcontainer container terms w-container">
            <div className="privacy-content-wrapper">
              <div className="privacy-content-wrap">
                <div className="singel-privacy-content">
                  <p className="privacy-title-main">1. Platform License &amp; Permitted Use</p>
                  <p className="privacy-text">
                    AMS grants subscribing educational institutions, colleges, and enterprise organizations a non-exclusive, multi-tenant license to operate contactless biometric attendance systems, manage student and employee rosters, and generate attendance compliance audits.
                  </p>
                </div>

                <div className="singel-privacy-content">
                  <p className="privacy-title-main">2. Biometric Consent &amp; Compliance</p>
                  <p className="privacy-text">
                    Subscribing institutions are responsible for obtaining appropriate enrollment consent from participating students, interns, or employees in accordance with their local educational and employment regulations. AMS processes facial vectors solely for identity verification during active shifts.
                  </p>
                </div>

                <div className="singel-privacy-content">
                  <p className="privacy-title-main">3. Shift Accuracy &amp; System Availability</p>
                  <p className="privacy-text">
                    AMS provides automated calculation of working hours, grace periods, and shift duration down to the minute. In the event of temporary local network interruptions at an entrance check-in screen, administrative force check-out overrides are provided for managers to maintain audit continuity.
                  </p>
                </div>

                <div className="singel-privacy-content">
                  <p className="privacy-title-main">4. Subscription Billing &amp; Data Cascade</p>
                  <p className="privacy-text">
                    Subscriptions are billed monthly or annually per enrolled cohort tier. Upon subscription termination or tenant deletion, all associated facial encodings and attendance logs are cascade-deleted permanently.
                  </p>
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
