import React from 'react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <section className="footer-section">
      <section className="footer-hero-area">
        <div className="w-layout-blockcontainer footer-container w-container">
          <div className="content-wrapper footer">
            <div className="hero-section-content">
              <h1 className="hero-display-heading">
                Ready for Smarter Attendance?
              </h1>
              <p className="hero-description" style={{ maxWidth: '580px', margin: '0 auto 24px auto' }}>
                Join campuses and companies ditching broken fingerprint readers for instant face check-in.
              </p>
              <div className="hero-buttons">
                <Link
                  data-wf--hero-button--variant="hero"
                  to="/pricing-v1"
                  className="hero-button w-inline-block"
                >
                  <div className="hero-button-content-wrap">
                    <p className="hero-button-text">Start Free Trial</p>
                  </div>
                </Link>
                <a
                  data-wf--hero-button--variant="hero-v2"
                  href="https://tarsbookademoapp.vercel.app/demo/tars-attendify-newsletter"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hero-button w-inline-block"
                >
                  <div className="hero-button-content-wrap w-variant-445585f7-a63d-4c1c-6003-e9e77ad430a8">
                    <p className="hero-button-text w-variant-445585f7-a63d-4c1c-6003-e9e77ad430a8">Book A Live Demo</p>
                  </div>
                </a>
              </div>
            </div>

            <div className="footer-content-wrapper">
              <div className="footer-content-wrap">
                <div className="content-navitems">
                  <div className="footer-content-left">
                    <Link
                      to="/"
                      aria-current="page"
                      className="w-inline-block w--current"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        textDecoration: 'none',
                        background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
                        padding: '8px 16px',
                        borderRadius: '10px',
                        width: 'fit-content'
                      }}
                    >
                      <img
                        src="/attendify-logo.png"
                        alt="Attendify"
                        style={{ height: '30px', width: 'auto', display: 'block', objectFit: 'contain' }}
                      />
                    </Link>
                    <p className="body-14">
                      Fast, contactless face attendance for colleges, departments, and growing teams.
                    </p>
                  </div>

                  <div className="footer-content-right">
                    <div className="navitem-wrapper">
                      <p className="navitem-default-title">Platform</p>
                      <div className="navitem-list footer">
                        <Link to="/" className="navtext">Home</Link>
                        <Link to="/features" className="navtext">Features</Link>
                        <Link to="/pricing-v1" className="navtext">Pricing</Link>
                        <Link to="/about" className="navtext">About</Link>
                      </div>
                    </div>

                    <div className="navitem-wrapper">
                      <p className="navitem-default-title">Resources</p>
                      <div className="navitem-list footer">
                        <a href="https://tarsbookademoapp.vercel.app/demo/tars-attendify-newsletter" target="_blank" rel="noopener noreferrer" className="navtext">Book Demo</a>
                        <Link to="/case-study" className="navtext">Case Studies</Link>
                        <Link to="/review" className="navtext">Reviews</Link>
                        <Link to="/contact" className="navtext">Contact</Link>
                      </div>
                    </div>

                    <div id="w-node-_7d908fbd-4297-858a-e2e4-16f3db73fe8b-db73fe5c" className="navitem-wrapper _02">
                      <p className="navitem-default-title">Get in Touch</p>
                      <div className="navitem-list footer">
                        <div className="mail-links">
                          <div className="mail-icon-wrap">
                            <img src="/images/693f6993aff3e20a61a64ff7_mail-01%20%281%29.svg" loading="lazy" alt="" className="mail-icon" />
                          </div>
                          <a href="mailto:support@amsplatform.io" className="navtext">support@amsplatform.io</a>
                        </div>
                        <div className="mail-links">
                          <div className="mail-icon-wrap">
                            <img src="/images/693f6993aff3e20a61a64ff8_smart-phone-01.svg" loading="lazy" alt="" className="mail-icon" />
                          </div>
                          <a href="tel:+18005552671" className="navtext">+1 (800) 555-AMS1</a>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="footer-contact-links">
                  <Link
                    data-wf--hero-button--variant="features"
                    to="/contact"
                    className="hero-button w-inline-block"
                  >
                    <div className="hero-button-content-wrap w-variant-2e2d7156-bf71-2b94-02c0-7d61d44d2e9b">
                      <p className="hero-button-text w-variant-2e2d7156-bf71-2b94-02c0-7d61d44d2e9b">Talk to Sales</p>
                    </div>
                  </Link>
                </div>
              </div>

              <div className="footer-bottom-content">
                <p className="bottom-text">© 2026 Attendify Platform. All rights reserved.</p>
                <div className="bottom-navtext">
                  <Link to="/privacy-policy" className="navtext">Privacy Policy</Link>
                  <Link to="/terms-conditions" className="navtext">Terms of Service</Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        <img src="/images/693f6993aff3e20a61a64fc0_Mask%20group%20%282%29.avif" loading="lazy" alt="" className="hero-bg-shape" />
        <div className="footer-bg-top-shape"></div>
      </section>
    </section>
  );
}
