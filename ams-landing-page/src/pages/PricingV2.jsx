import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import BrandLogos from '../components/BrandLogos';
import FAQ from '../components/FAQ';
import Footer from '../components/Footer';
import { Link } from 'react-router-dom';

export default function PricingV2() {
  const [billingCycle, setBillingCycle] = useState('monthly');

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="body">
      <section className="sections">
        <Navbar />

        <section className="hero-section">
          <section className="hero-area">
            <div className="w-layout-blockcontainer container pricing w-container">
              <div className="content-wrapper">
                <div className="hero-section-content">
                  <h1 className="heading-1-white">Choose the Right AMS Plan</h1>
                  <p className="body-18-white">
                    Zero hardware capital expenditure. Instant browser facial recognition deployed across all your departments.
                  </p>
                </div>

                <div className="pricing-card-wrapper">
                  <div style={{ display: 'grid' }} className="pricing-table monthly">
                    {/* Starter Card */}
                    <div className="pricing-card">
                      <div className="pricing-title-top">
                        <div className="head-title"><p className="body-20-medium">Department Plan</p></div>
                        <div className="price-text">
                          <div className="pricing-card-price">
                            <h2 className="pricing-price-heading">$49</h2>
                            <p className="body-18-medium">/month</p>
                          </div>
                          <p className="body-text-14">Up to 100 students, 1 entrance check-in screen.</p>
                        </div>
                      </div>
                      <div className="pricing-button-features">
                        <Link to="/book-a-demo" data-wf--hero-button--variant="features" className="hero-button w-inline-block">
                          <div className="hero-button-content-wrap w-variant-2e2d7156-bf71-2b94-02c0-7d61d44d2e9b"><p className="hero-button-text w-variant-2e2d7156-bf71-2b94-02c0-7d61d44d2e9b">Start Free Trial</p></div>
                        </Link>
                        <div className="pricing-features-lists">
                          <p className="body-16-medium">Features</p>
                          <div className="pricing-card-features">
                            <div className="pricing-card-feature-item"><img width="Auto" height="Auto" alt="Icon" src="/images/693f6993aff3e20a61a65006_Vector%20%2812%29.svg" loading="lazy" className="icon" /><p className="pricing-card-feature-text">100 User Biometric Encodings</p></div>
                            <div className="pricing-card-feature-item"><img width="Auto" height="Auto" alt="Icon" src="/images/693f6993aff3e20a61a65008_Vector%20%2813%29.svg" loading="lazy" className="icon" /><p className="pricing-card-feature-text">Daily &amp; Weekly Excel Sheets</p></div>
                            <div className="pricing-card-feature-item"><img width="Auto" height="Auto" alt="Icon" src="/images/693f6993aff3e20a61a65007_Vector%20%2814%29.svg" loading="lazy" className="icon" /><p className="pricing-card-feature-text">Custom Grace Period Timing</p></div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Campus Card */}
                    <div className="pricing-card">
                      <div className="pricing-title-top">
                        <div className="head-title"><p className="body-20-medium">Campus Plan</p></div>
                        <div className="price-text">
                          <div className="pricing-card-price">
                            <h2 className="pricing-price-heading">$129</h2>
                            <p className="body-18-medium">/month</p>
                          </div>
                          <p className="body-text-14">Up to 1,000 students across 10 department tenancies.</p>
                        </div>
                      </div>
                      <div className="pricing-button-features">
                        <Link to="/book-a-demo" data-wf--hero-button--variant="features" className="hero-button w-inline-block">
                          <div className="hero-button-content-wrap w-variant-2e2d7156-bf71-2b94-02c0-7d61d44d2e9b"><p className="hero-button-text w-variant-2e2d7156-bf71-2b94-02c0-7d61d44d2e9b">Get Started</p></div>
                        </Link>
                        <div className="pricing-features-lists">
                          <p className="body-16-medium">Features</p>
                          <div className="pricing-card-features">
                            <div className="pricing-card-feature-item"><img width="Auto" height="Auto" alt="Icon" src="/images/693f6993aff3e20a61a65006_Vector%20%2812%29.svg" loading="lazy" className="icon" /><p className="pricing-card-feature-text">Unlimited Entrance Screens</p></div>
                            <div className="pricing-card-feature-item"><img width="Auto" height="Auto" alt="Icon" src="/images/693f6993aff3e20a61a65008_Vector%20%2813%29.svg" loading="lazy" className="icon" /><p className="pricing-card-feature-text">Monthly &amp; 6-Month Semester Audits</p></div>
                            <div className="pricing-card-feature-item"><img width="Auto" height="Auto" alt="Icon" src="/images/693f6993aff3e20a61a65007_Vector%20%2814%29.svg" loading="lazy" className="icon" /><p className="pricing-card-feature-text">Leave Quotas &amp; Force Check-Out</p></div>
                            <div className="pricing-card-feature-item"><img width="Auto" height="Auto" alt="Icon" src="/images/693f6993aff3e20a61a65007_Vector%20%2814%29.svg" loading="lazy" className="icon" /><p className="pricing-card-feature-text">Live Check-In Cameras</p></div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Enterprise Card */}
                    <div className="pricing-card">
                      <div className="pricing-title-top">
                        <div className="head-title"><p className="body-20-medium">University Network</p></div>
                        <div className="price-text">
                          <div className="pricing-card-price">
                            <h2 className="pricing-price-heading">$299</h2>
                            <p className="body-18-medium">/month</p>
                          </div>
                          <p className="body-text-14">Unlimited students, 30+ partner companies &amp; branches.</p>
                        </div>
                      </div>
                      <div className="pricing-button-features">
                        <Link to="/book-a-demo" data-wf--hero-button--variant="features" className="hero-button w-inline-block">
                          <div className="hero-button-content-wrap w-variant-2e2d7156-bf71-2b94-02c0-7d61d44d2e9b"><p className="hero-button-text w-variant-2e2d7156-bf71-2b94-02c0-7d61d44d2e9b">Contact Sales</p></div>
                        </Link>
                        <div className="pricing-features-lists">
                          <p className="body-16-medium">Features</p>
                          <div className="pricing-card-features">
                            <div className="pricing-card-feature-item"><img width="Auto" height="Auto" alt="Icon" src="/images/693f6993aff3e20a61a65006_Vector%20%2812%29.svg" loading="lazy" className="icon" /><p className="pricing-card-feature-text">Multi-Tenant Super Admin Hub</p></div>
                            <div className="pricing-card-feature-item"><img width="Auto" height="Auto" alt="Icon" src="/images/693f6993aff3e20a61a65008_Vector%20%2813%29.svg" loading="lazy" className="icon" /><p className="pricing-card-feature-text">Custom SIS, ERP &amp; API Webhooks</p></div>
                            <div className="pricing-card-feature-item"><img width="Auto" height="Auto" alt="Icon" src="/images/693f6993aff3e20a61a65007_Vector%20%2814%29.svg" loading="lazy" className="icon" /><p className="pricing-card-feature-text">99.9% High Availability SLA</p></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </section>

        <BrandLogos />
        <FAQ />
        <Footer />
      </section>
    </div>
  );
}
