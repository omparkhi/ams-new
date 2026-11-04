import React, { useEffect } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export default function IntegrationDetails() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="body">
      <section className="sections">
        <Navbar />

        <section className="hero-section-main">
          <section className="hero-area-main">
            <section className="hero-area-block case-study">
              <div className="w-layout-blockcontainer container integration w-container">
                <div className="integration-details-content-wrapper">
                  <div className="integration-content-top">
                    <div data-w-id="a4325e19-239d-2429-5c04-20b6e5ad5c36" className="integration-details-logo">
                      <img loading="lazy" src="/images/693f6993aff3e20a61a64f70_Icon%20(5).svg" alt="Moodle SIS Integration" className="integration-details-image" />
                    </div>
                    <h1 data-w-id="a4325e19-239d-2429-5c04-20b6e5ad5c38" className="integration-details-title">Moodle &amp; Canvas SIS Integration</h1>
                    <p data-w-id="a4325e19-239d-2429-5c04-20b6e5ad5c39" className="integration-details-description">
                      Seamlessly synchronize campus student cohorts, lecture groups, and attendance records with your existing Learning Management System.
                    </p>
                  </div>

                  <div data-w-id="a4325e19-239d-2429-5c04-20b6e5ad5c3a" className="integration-details-content w-richtext" style={{ marginTop: '30px', lineHeight: 1.8 }}>
                    <h4>Step 1: Obtain Your AMS Webhook &amp; API Key</h4>
                    <p>
                      Log in to your AMS Super Admin dashboard and navigate to <strong>Settings &gt; Integrations &gt; API Access</strong>. Generate a tenant API key and copy the unique webhook callback endpoint.
                    </p>

                    <h4>Step 2: Map Student Roster Fields</h4>
                    <p>
                      In your LMS or Student Information System, configure the automated roster export webhook to send student IDs, full names, and registered course cohort tags. AMS maps these directly into the appropriate company or department workspace.
                    </p>

                    <h4>Step 3: Biometric Camera Scanner Linking</h4>
                    <p>
                      When students enroll their 20-frame facial vectors at the start of the semester, AMS automatically attaches the resulting 128-d vector to their official student ID. Any attendance logged at campus entrance check-in screens instantly updates course presence records.
                    </p>

                    <h4>Step 4: Real-Time Gradebook &amp; Attendance Sync</h4>
                    <p>
                      Enable daily or hourly synchronization so that attendance percentages and minimum hour qualifications reflect in the student&apos;s academic portal without manual administrative entry.
                    </p>
                  </div>
                </div>
              </div>
            </section>
          </section>
        </section>

        <Footer />
      </section>
    </div>
  );
}
