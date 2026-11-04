import React, { useEffect } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Link } from 'react-router-dom';

export default function CaseStudyDetails() {
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
                <div data-w-id="d1725ed9-85ec-ad70-db2f-5829d879f322" className="case-study-details-content-wrapper">
                  <div className="case-study-details-content-wrap">
                    <div className="case-study-details-title-wrap">
                      <h1>How Apex Institute Eliminated Proxy Attendance for 650 Distributed Interns</h1>
                      <p className="case-study-details-paragraph">
                        A real-world breakdown of how one of the largest engineering institutions transitioned from paper sign-in sheets to zero-hardware browser face biometrics.
                      </p>
                    </div>
                    <div className="case-study-author-details">
                      <img src="/images/693f6993aff3e20a61a64f69_Frame%201000001053%201.svg" loading="lazy" alt="" className="case-study-author-image" />
                      <div className="case-study-author-info">
                        <p className="case-study-author-name">Dr. Rajesh Sharma</p>
                        <p className="case-study-author-position">Dean of Placements, Apex Institute</p>
                      </div>
                    </div>
                  </div>
                  <img
                    src="/images/693f6993aff3e20a61a64f6f_image%20(38).png"
                    loading="lazy"
                    alt="Case Study Showcase"
                    className="case-study-details-image"
                  />
                </div>
              </div>
            </section>
          </section>
        </section>

        <section className="case-study-details-section" style={{ padding: '60px 20px', maxWidth: '850px', margin: '0 auto' }}>
          <div style={{ fontSize: '16px', lineHeight: 1.8, color: '#334155' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', padding: '24px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '36px', textAlign: 'center' }}>
              <div>
                <p style={{ fontSize: '28px', fontWeight: 800, color: '#2563eb', margin: 0 }}>650+</p>
                <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>Students Tracked</p>
              </div>
              <div>
                <p style={{ fontSize: '28px', fontWeight: 800, color: '#16a34a', margin: 0 }}>100%</p>
                <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>Verified Attendance</p>
              </div>
              <div>
                <p style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', margin: 0 }}>$0</p>
                <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>Hardware Capital Exp</p>
              </div>
            </div>

            <h3 style={{ fontSize: '22px', fontWeight: 700, color: '#0f172a', marginBottom: '12px' }}>The Challenge</h3>
            <p style={{ marginBottom: '16px' }}>
              Every semester, Apex Institute coordinates industry internships for over 650 students placed across 24 independent host tech companies. Historically, the college relied on host managers emailing monthly scanned signature sheets. This process suffered from:
            </p>
            <ul style={{ paddingLeft: '24px', marginBottom: '24px' }}>
              <li style={{ marginBottom: '6px' }}>Frequent proxy signatures and inflated shift hours.</li>
              <li style={{ marginBottom: '6px' }}>30+ days lag before coordinators noticed unapproved student absences.</li>
              <li style={{ marginBottom: '6px' }}>High administrative overhead reconciling 24 different spreadsheet formats.</li>
            </ul>

            <h3 style={{ fontSize: '22px', fontWeight: 700, color: '#0f172a', marginBottom: '12px' }}>The AMS Solution</h3>
            <p style={{ marginBottom: '16px' }}>
              Apex deployed AMS using its Multi-Tenant architecture. In a 30-minute setup session, the institute&apos;s Super Admin provisioned 24 separate company accounts, each configured with that company&apos;s respective shift hours (e.g. 9:00 AM check-in, 6:00 PM check-out, 8 mandatory hours).
            </p>
            <p style={{ marginBottom: '24px' }}>
              Students were enrolled in under 10 seconds via a 20-frame webcam burst during onboarding. At each company entrance, an existing reception tablet was designated as a contactless check-in screen.
            </p>

            <h3 style={{ fontSize: '22px', fontWeight: 700, color: '#0f172a', marginBottom: '12px' }}>The Outcome</h3>
            <p style={{ marginBottom: '16px' }}>
              In the first semester of deployment, buddy punching fell to zero. The university placement dean logged in to a live dashboard showing exact daily presence, while automated OpenPyXL workbooks allowed instant semester completion audits.
            </p>

            <div style={{ backgroundColor: '#eff6ff', padding: '24px', borderRadius: '12px', borderLeft: '4px solid #2563eb', marginTop: '30px' }}>
              <p style={{ margin: 0, fontWeight: 600, color: '#1e40af' }}>
                “AMS gave our academic coordinators complete transparency across all partner firms without imposing hardware installation or complex setup on our corporate hosts.”
              </p>
              <p style={{ margin: '8px 0 0 0', fontSize: '13px', color: '#2563eb' }}>— Dr. Rajesh Sharma, Dean of Placements</p>
            </div>
          </div>
        </section>

        <Footer />
      </section>
    </div>
  );
}
