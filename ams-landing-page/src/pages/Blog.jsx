import React, { useEffect } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Link } from 'react-router-dom';

const articles = [
  {
    title: "Why Universities Are Replacing Biometric Fingerprint Hardware with Browser Face Recognition",
    excerpt: "Optical dirt, physical hardware wear, and proxy clock-ins cost institutions thousands. Discover why zero-hardware computer vision is the new standard.",
    date: "October 20, 2026",
    category: "Campus Technology",
    image: "/images/693f6993aff3e20a61a64dfe_Image%20(34).png",
  },
  {
    title: "The Math of 128-Dimensional Facial Vectors: How AMS Stops Proxy Attendance",
    excerpt: "Deep dive into HOG face detection, dlib neural networks, and mathematical distance tolerance (<0.45) that makes buddy punching impossible.",
    date: "October 14, 2026",
    category: "Biometric Engineering",
    image: "/images/693f6993aff3e20a61a64e21_Image%20(36).png",
  },
  {
    title: "Multi-Tenant Architecture for Student Internships: Managing 30+ Companies",
    excerpt: "How placement coordinators use a centralized Super Admin hub to track distributed student cohorts across autonomous company portals.",
    date: "October 08, 2026",
    category: "Higher Education",
    image: "/images/693f6993aff3e20a61a64e42_Image%20(37).png",
  },
  {
    title: "Automating Working Hours, Grace Windows, and Half-Day Thresholds",
    excerpt: "Stop wasting 30+ hours every month manually computing check-in/out spreadsheets. Here is how automatic policy rules calculate duration to the minute.",
    date: "September 28, 2026",
    category: "Workforce Analytics",
    image: "/images/693f6993aff3e20a61a64f57_Blog%20Post%20Image%20Container%20(8).png",
  },
];

export default function Blog() {
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
                <div className="blog-content-wrapper">
                  <div className="blog-content-wrap">
                    <div className="features-section-title company-v3">
                      <h1 className="hero-display-heading-black">AMS Insights &amp; Research</h1>
                      <p className="align-center">
                        Practical guides, engineering insights, and best practices on face biometrics, student tracking, and workforce automation.
                      </p>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '30px', marginTop: '40px' }}>
                      {articles.map((art, i) => (
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
                            src={art.image}
                            alt={art.title}
                            style={{ width: '100%', height: '200px', objectFit: 'cover' }}
                          />
                          <div style={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                              <span style={{ fontSize: '11px', fontWeight: 700, color: '#2563eb', backgroundColor: '#eff6ff', padding: '4px 8px', borderRadius: '8px' }}>
                                {art.category}
                              </span>
                              <span style={{ fontSize: '12px', color: '#64748b' }}>
                                {art.date}
                              </span>
                            </div>
                            <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#0f172a', marginBottom: '8px', lineHeight: 1.35 }}>
                              {art.title}
                            </h3>
                            <p style={{ fontSize: '14px', color: '#64748b', lineHeight: 1.5, marginBottom: '20px', flex: 1 }}>
                              {art.excerpt}
                            </p>
                            <Link
                              to="/blog-posts/zero-hardware-face-recognition-guide"
                              style={{
                                color: '#2563eb',
                                textDecoration: 'none',
                                fontSize: '14px',
                                fontWeight: 600,
                              }}
                            >
                              Read Article →
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
