import React, { useEffect } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export default function PrivacyPolicy() {
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
                      <h1 className="hero-display-heading-black">Biometric &amp; Data Privacy Policy</h1>
                      <p className="privacy-subtext">Last Updated: October 2026 | Compliant with Institutional Standards</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </section>
        </section>

        <section className="privacy-section">
          <div className="w-layout-blockcontainer container terms w-container">
            <div data-w-id="59bdefe3-ddd5-810c-d5ed-6c03bc3143f0" className="privacy-content-wrapper">
              <div className="privacy-content-wrap">
                <div className="singel-privacy-content">
                  <p className="privacy-title-main">1. Biometric Data &amp; Mathematical Facial Encodings</p>
                  <p className="privacy-text">
                    AMS does not store continuous raw video streams or reconstructable face photos. During the 20-frame onboarding procedure, computer vision algorithms map facial landmarks into a non-reversible 128-dimensional numerical vector. These encrypted embeddings are used exclusively for mathematical distance comparisons (&lt;0.45 tolerance) during attendance verification.
                  </p>
                </div>

                <div className="singel-privacy-content">
                  <p className="privacy-title-main">2. Temporary Shift Snapshot Proofs</p>
                  <p className="privacy-text">
                    Upon a successful face check-in, a single timestamped verification photo is captured. This snapshot is held in temporary storage strictly to provide supervisor visual confirmation during the active shift window and is purged in accordance with institutional data retention schedules.
                  </p>
                </div>

                <div className="singel-privacy-content">
                  <p className="privacy-title-main">3. Multi-Tenant Architectural Isolation</p>
                  <p className="privacy-text">
                    Each organization, academic department, and partner company operates inside an isolated logical workspace. Facial encodings and attendance records associated with Company A can never be queried, accessed, or viewed by Company B or unauthorized third parties.
                  </p>
                </div>

                <div className="singel-privacy-content">
                  <p className="privacy-title-main">4. Security Measures &amp; Access Controls</p>
                  <p className="privacy-text">
                    We implement cryptographic protection, role-based access controls (Super Admin, Company Admin, and Student levels), and secure socket communication (TLS 1.3). Administrative access requires authenticated credentials and session management.
                  </p>
                </div>

                <div className="singel-privacy-content">
                  <p className="privacy-title-main">5. Data Deletion &amp; Right to Forget</p>
                  <p className="privacy-text">
                    Educational institutions and participating organizations maintain full ownership of their data. When an institution offboards a student cohort or deletes a tenant account, all associated facial vectors, historical logs, and audit records are permanently cascade-deleted from all active databases and disks.
                  </p>
                </div>

                <div className="singel-privacy-content">
                  <p className="privacy-title-main">6. Contact Our Compliance Team</p>
                  <p className="privacy-text">
                    If you have questions regarding our biometric privacy practices or need data processing agreements for your university or enterprise, contact our compliance office at <strong>privacy@amsplatform.io</strong>.
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
