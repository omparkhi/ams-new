import React, { useEffect } from 'react';
import Navbar from '../components/Navbar';
import BrandLogos from '../components/BrandLogos';
import FeaturesV1 from '../components/FeaturesV1';
import FeaturesMain from '../components/FeaturesMain';
import FeaturesV2 from '../components/FeaturesV2';
import FAQ from '../components/FAQ';
import Footer from '../components/Footer';
import { Link } from 'react-router-dom';

export default function Features() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="body">
      <section className="sections">
        <Navbar />

        {/* Features Hero */}
        <section className="hero-section">
          <section className="hero-area features">
            <div className="w-layout-blockcontainer container features w-container">
              <div className="feature-content-wrapper-main">
                <div data-w-id="6493c12b-9fd6-f3b7-fc31-b43c7baae1e4" className="feature-content-wrap-main">
                  <p className="feature-hero-subtext">Enterprise-Grade Computer Vision</p>
                  <div className="section-title _01">
                    <h1 className="features-hero-title">
                      Powerful Biometric Capabilities Built for Academics &amp; Industry
                    </h1>
                    <p className="hero-feature-subtitle">
                      Replace fragile biometric fingerprint scanners and inaccurate paper rosters with instant browser-based facial recognition, automated shift calculations, and multi-tenant department control.
                    </p>
                  </div>
                  <Link data-wf--hero-button--variant="features" to="/book-a-demo" className="hero-button w-inline-block">
                    <div className="hero-button-content-wrap w-variant-2e2d7156-bf71-2b94-02c0-7d61d44d2e9b">
                      <p className="hero-button-text w-variant-2e2d7156-bf71-2b94-02c0-7d61d44d2e9b">Schedule A Live Demo</p>
                    </div>
                  </Link>
                </div>
              </div>
            </div>
            <img src="/images/693f6993aff3e20a61a64fc3_Background%20Container.avif" loading="lazy" alt="" className="hero-white-shape" />
            <div data-w-id="609c3f9b-9e30-cc44-2cd3-4abf068cdb0a" className="hero-feature-image">
              <img
                src="/images/693f6993aff3e20a61a6500e_Dashboard%201.png"
                loading="lazy"
                sizes="(max-width: 1012px) 100vw, 1012px"
                alt="AMS Feature Dashboard"
                className="hero-feature-dasboard"
              />
            </div>
          </section>
        </section>

        <BrandLogos />
        <FeaturesV1 />
        <FeaturesMain />
        <FeaturesV2 />
        <FAQ />
        <Footer />
      </section>
    </div>
  );
}
