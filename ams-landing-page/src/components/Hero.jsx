import React from 'react';
import { Link } from 'react-router-dom';

const VerifiedBadge = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{ flexShrink: 0, display: 'inline-block' }}
    aria-hidden="true"
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81c-.67-1.31-1.91-2.19-3.34-2.19s-2.67.88-3.34 2.19c-1.39-.46-2.9-.2-3.91.81s-1.27 2.52-.81 3.91C2.63 9.33 1.75 10.57 1.75 12s.88 2.67 2.19 3.34c-.46 1.39-.2 2.9.81 3.91s2.52 1.27 3.91.81c.67 1.31 1.91 2.19 3.34 2.19s2.67-.88 3.34-2.19c1.39.46 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34zm-11.71 4.2L6.8 12.46l1.41-1.42 2.26 2.26 4.8-5.23 1.47 1.36-6.2 6.77z"
      fill="#ffffff"
    />
  </svg>
);

export default function Hero() {
  return (
    <section className="hero-section">
      <section className="hero-area">
        <div className="w-layout-blockcontainer container w-container">
          <div className="content-wrapper">
            <div className="hero-section-content">
              {/* Top Tagline */}
              <div data-w-id="c40055d2-94a3-6ba6-1d58-b6fdf8123570" className="top-label">
                {/* <div className="top-label-tag-line"> */}
                <span style={{ fontSize: '13px', marginRight: '4px' }}></span>
                {/* <p className="tag-text">Contactless</p> */}
                {/* </div> */}
                <p className="tag-text">Face Recognition Attendance</p>
              </div>

              {/* Catchy Headline */}
              <h1 className="hero-display-heading">
                Smart Attendance. <br />
                Just Look &amp; Sign In.
              </h1>

              {/* Short & Concise Subtitle */}
              <p className="hero-description" style={{ maxWidth: '620px', margin: '0 auto 28px auto' }}>
                Instant contactless check-in for students, interns, and teams. Runs on any phone, tablet, or laptop camera. Zero hardware, zero proxy sign-ins.
              </p>

              {/* Clean CTA Buttons */}
              <div data-w-id="b927c552-6a49-f05d-2177-9856ff7dab96" className="hero-buttons">
                <Link
                  data-wf--hero-button--variant="hero"
                  to="/signup"
                  className="hero-button w-inline-block"
                >
                  <div className="hero-button-content-wrap">
                    <p className="hero-button-text">Start Free Trial →</p>
                  </div>
                </Link>
                <Link
                  data-wf--hero-button--variant="hero-v2"
                  to="/login"
                  className="hero-button w-inline-block"
                >
                  <div className="hero-button-content-wrap w-variant-445585f7-a63d-4c1c-6003-e9e77ad430a8">
                    <p className="hero-button-text w-variant-445585f7-a63d-4c1c-6003-e9e77ad430a8">Sign In</p>
                  </div>
                </Link>
              </div>

              {/* Crisp Benefits - White text & White Verified Badge */}
              <div
                style={{
                  display: 'flex',
                  gap: '24px',
                  justifyContent: 'center',
                  marginTop: '24px',
                  flexWrap: 'wrap',
                  fontSize: '14px',
                  color: '#ffffff',
                  fontWeight: 500,
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ffffff' }}>
                  <VerifiedBadge />
                  <span>0.5s Face Match</span>
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ffffff' }}>
                  <VerifiedBadge />
                  <span>100% Proxy-Proof</span>
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ffffff' }}>
                  <VerifiedBadge />
                  <span>Any Camera Device</span>
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ffffff' }}>
                  <VerifiedBadge />
                  <span>1-Click Excel Sheets</span>
                </span>
              </div>
            </div>

            {/* Dashboard Visual */}
            <div data-w-id="1b65ebc0-13aa-a5f1-0c64-e4f4e6aa7690" className="hero-dasboard-image-wrapper">
              <div className="hero-dasboard-image-wrap">
                <img
                  src="/images/693fada62152faaad4c3925f_Dashboard%20%2813%29.png"
                  loading="lazy"
                  alt="AMS Live Attendance Dashboard"
                  className="hero-dashboard-image"
                />
              </div>
            </div>
          </div>
        </div>

        <img
          src="/images/693f7a801b0f40ebff9c2e56_Mask%20group%20%284%29.png"
          loading="lazy"
          alt=""
          className="hero-bg-shape"
        />
        <img
          src="/images/693f6993aff3e20a61a64fc3_Background%20Container.avif"
          loading="lazy"
          alt=""
          className="hero-white-shape"
        />
        <div className="hero-bg-top-shape"></div>
      </section>
    </section>
  );
}
