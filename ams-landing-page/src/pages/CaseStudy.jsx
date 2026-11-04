import React, { useEffect } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Link } from 'react-router-dom';

const caseStudies = [
  {
    title: "Apex Institute: Eradicating Proxy Sign-Ins Across 650 Distributed Interns",
    description: "How a premier engineering college achieved 100% verified attendance tracking across 24 corporate partner branches with live photo proof.",
    image: "/images/693f6993aff3e20a61a64f6f_image%20(38).png",
    stat: "100% Authenticity",
    tag: "Higher Education",
  },
  {
    title: "Metro Tech: Retiring 14 Broken Fingerprint Scanners for Browser Face Scanners",
    description: "Eliminating hardware replacement and optical sensor maintenance costs by deploying AMS on standard entrance tablets.",
    image: "/images/693f6993aff3e20a61a64f6e_image%20(44).png",
    stat: "$8,500 Saved/Year",
    tag: "Zero-Hardware",
  },
  {
    title: "Nexora Corporate: Cutting Monthly Attendance Audit Time by 85%",
    description: "How HR operations automated shift hour calculations, half-day qualifications, and monthly leave quotas with one-click Excel workbooks.",
    image: "/images/693f6993aff3e20a61a64f6d_image%20(43).png",
    stat: "35 Hours Saved/Mo",
    tag: "Workforce Analytics",
  },
  {
    title: "Global Training Academy: Automated 6-Month Semester Compliance",
    description: "Centralizing 30+ host company training cohorts under a single Super Admin oversight dashboard.",
    image: "/images/693f6993aff3e20a61a64f6c_image%20(42).png",
    stat: "30+ Tenants Unified",
    tag: "Multi-Tenancy",
  },
];

export default function CaseStudy() {
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
              <div className="w-layout-blockcontainer container case-study w-container">
                <div className="case-study-content-wrapper">
                  <div className="features-section-title case-study">
                    <h1 className="hero-display-heading-black">Institutional Success Stories</h1>
                    <p className="align-center style-02">
                      Discover how leading colleges, internship placement cells, and enterprises solved attendance fraud and eliminated manual spreadsheet overhead with AMS.
                    </p>
                  </div>

                  <div className="case-study-card-wrapper" style={{ marginTop: '40px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '30px' }}>
                      {caseStudies.map((cs, i) => (
                        <div
                          key={i}
                          style={{
                            backgroundColor: '#fff',
                            borderRadius: '16px',
                            border: '1px solid #e2e8f0',
                            overflow: 'hidden',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
                            display: 'flex',
                            flexDirection: 'column',
                          }}
                        >
                          <img
                            src={cs.image}
                            alt={cs.title}
                            style={{ width: '100%', height: '200px', objectFit: 'cover' }}
                          />
                          <div style={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                              <span style={{ fontSize: '12px', fontWeight: 700, color: '#2563eb', backgroundColor: '#eff6ff', padding: '4px 10px', borderRadius: '12px' }}>
                                {cs.tag}
                              </span>
                              <span style={{ fontSize: '13px', fontWeight: 600, color: '#16a34a' }}>
                                {cs.stat}
                              </span>
                            </div>
                            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', marginBottom: '8px', lineHeight: 1.3 }}>
                              {cs.title}
                            </h3>
                            <p style={{ fontSize: '14px', color: '#64748b', lineHeight: 1.5, marginBottom: '20px', flex: 1 }}>
                              {cs.description}
                            </p>
                            <Link
                              to="/case-study/accelerated-hr-workflow-efficiency-by-60"
                              style={{
                                display: 'inline-block',
                                textAlign: 'center',
                                padding: '10px 16px',
                                backgroundColor: '#0f172a',
                                color: '#fff',
                                textDecoration: 'none',
                                borderRadius: '8px',
                                fontSize: '14px',
                                fontWeight: 600,
                              }}
                            >
                              Read Full Case Study →
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
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
