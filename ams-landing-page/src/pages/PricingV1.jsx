import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import BrandLogos from '../components/BrandLogos';
import FAQ from '../components/FAQ';
import Footer from '../components/Footer';
import { Link } from 'react-router-dom';

const featIcons = [
  '693f6993aff3e20a61a65006_Vector%20%2812%29.svg',
  '693f6993aff3e20a61a65008_Vector%20%2813%29.svg',
  '693f6993aff3e20a61a65007_Vector%20%2814%29.svg',
  '693f6993aff3e20a61a65007_Vector%20%2814%29.svg',
  '693f6993aff3e20a61a65007_Vector%20%2814%29.svg',
  '693f6993aff3e20a61a65007_Vector%20%2814%29.svg',
  '693f6993aff3e20a61a65007_Vector%20%2814%29.svg',
];

const plans = {
  monthly: [
    {
      name: 'Department / Pilot',
      price: '$49',
      period: '/Per month',
      description: 'Ideal for single departments, academic labs, and pilot cohorts.',
      buttonText: 'Start Free Trial',
      features: [
        'Up to 100 Enrolled Students/Staff',
        '1 Entrance Check-In Screen',
        '20-Frame Face Enrollment',
        'Daily & Weekly Master Excel Reports',
        'Shift Window & Grace Period Rules',
        'Standard Email Support',
      ],
    },
    {
      name: 'Campus / Mid-Size',
      price: '$129',
      period: '/Per month',
      description: 'Designed for colleges and growing firms managing multi-branch cohorts.',
      buttonText: 'Get Started with Campus',
      features: [
        'Up to 1,000 Enrolled Users',
        'Unlimited Entrance Check-In Screens',
        'Multi-Tenant (Up to 10 Departments)',
        'Monthly & 6-Month Semester Matrices',
        'Leave Quota & Half-Day Calculator',
        'Automated Force Check-Out Overrides',
        'Priority Phone & Ticket Support',
      ],
    },
    {
      name: 'University / Enterprise',
      price: '$299',
      period: '/Per month',
      description: 'Full multi-tenant power for large universities and enterprise networks.',
      buttonText: 'Contact Enterprise Sales',
      features: [
        'Unlimited Students & Staff',
        'Unlimited Multi-Tenant Partner Portals',
        'Central Super Admin Real-Time Hub',
        'Custom SIS / ERP & API Integration',
        'Dedicated Onboarding & Account Manager',
        '99.9% Uptime SLA Guarantee',
      ],
    },
  ],
  yearly: [
    {
      name: 'Department / Pilot',
      price: '$39',
      period: '/Per month, billed annually',
      description: 'Ideal for single departments, academic labs, and pilot cohorts.',
      buttonText: 'Start Free Trial',
      features: [
        'Up to 100 Enrolled Students/Staff',
        '1 Entrance Check-In Screen',
        '20-Frame Face Enrollment',
        'Daily & Weekly Master Excel Reports',
        'Shift Window & Grace Period Rules',
        'Standard Email Support',
      ],
    },
    {
      name: 'Campus / Mid-Size',
      price: '$99',
      period: '/Per month, billed annually',
      description: 'Designed for colleges and growing firms managing multi-branch cohorts.',
      buttonText: 'Get Started with Campus',
      features: [
        'Up to 1,000 Enrolled Users',
        'Unlimited Entrance Check-In Screens',
        'Multi-Tenant (Up to 10 Departments)',
        'Monthly & 6-Month Semester Matrices',
        'Leave Quota & Half-Day Calculator',
        'Automated Force Check-Out Overrides',
        'Priority Phone & Ticket Support',
      ],
    },
    {
      name: 'University / Enterprise',
      price: '$249',
      period: '/Per month, billed annually',
      description: 'Full multi-tenant power for large universities and enterprise networks.',
      buttonText: 'Contact Enterprise Sales',
      features: [
        'Unlimited Students & Staff',
        'Unlimited Multi-Tenant Partner Portals',
        'Central Super Admin Real-Time Hub',
        'Custom SIS / ERP & API Integration',
        'Dedicated Onboarding & Account Manager',
        '99.9% Uptime SLA Guarantee',
      ],
    },
  ],
};

const compareFeatures = [
  { name: 'Enrolled Students & Staff', starter: 'Up to 100', growth: 'Up to 1,000', enterprise: 'Unlimited' },
  { name: 'Entrance Check-In Screens', starter: '1 Screen', growth: 'Unlimited', enterprise: 'Unlimited' },
  { name: '20-Frame Face Capture Burst', starter: true, growth: true, enterprise: true },
  { name: 'Instant Face Match (0.5s)', starter: true, growth: true, enterprise: true },
  { name: 'Multi-Branch & Partner Firm Hub', starter: false, growth: 'Up to 10 Hubs', enterprise: 'Unlimited' },
  { name: 'Shift Windows & Grace Rules', starter: true, growth: true, enterprise: true },
  { name: 'Half-Day & Leave Balances', starter: 'Basic', growth: 'Automated Matrix', enterprise: 'Custom Enterprise Rules' },
  { name: '1-Click Master Excel Exports', starter: true, growth: true, enterprise: true },
  { name: 'Automated Force Check-Out', starter: false, growth: true, enterprise: true },
  { name: 'Audit Proof (Temporary Photos)', starter: true, growth: true, enterprise: true },
  { name: 'Super Admin Multi-Tenant Hub', starter: false, growth: true, enterprise: true },
  { name: 'Custom SIS / ERP API Integration', starter: false, growth: false, enterprise: true },
  { name: '99.9% Uptime SLA', starter: 'Standard', growth: 'Priority', enterprise: 'Enterprise 99.9% SLA' },
  { name: 'Support Channel', starter: 'Email Support', growth: 'Priority Ticket & Phone', enterprise: 'Dedicated 24/7 Slack & Mgr' },
];

export default function PricingV1() {
  const [billingCycle, setBillingCycle] = useState('monthly');

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const currentPlans = plans[billingCycle];

  const renderVal = (val) => {
    if (val === true) {
      return (
        <img
          alt="Included"
          className="plan-icon"
          height="20"
          width="20"
          loading="lazy"
          src="/images/693f6993aff3e20a61a65003_Container.svg"
        />
      );
    }
    if (val === false) {
      return (
        <img
          alt="Not Included"
          className="plan-icon"
          height="20"
          width="20"
          loading="lazy"
          src="/images/67c80c34b9f84a2c31cf44ad_minus.svg"
        />
      );
    }
    return <p className="plan-text">{val}</p>;
  };

  return (
    <div className="body">
      <section className="sections">
        <Navbar />

        {/* Pricing Hero Area */}
        <section className="hero-section">
          <section className="hero-area">
            <div className="w-layout-blockcontainer container pricing w-container">
              <div className="content-wrapper">
                <div className="hero-section-content">
                  <h1 className="heading-1-white">
                    Find Your Perfect Plan
                  </h1>
                  <p className="body-18-white">
                    Hardware-free face recognition attendance. Simple, transparent plans designed to fit your department, campus, or multi-branch enterprise.
                  </p>
                </div>

                {/* Billing Toggle */}
                <div className="pricing-card-wrapper">
                  <div className="pricing-toggle">
                    <div
                      className="toggle-wrapper"
                      style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.2)',
                        border: '1px solid rgba(255, 255, 255, 0.3)',
                        borderRadius: '100px',
                        padding: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        backdropFilter: 'blur(8px)',
                      }}
                    >
                      <div
                        className="toggle-text-monthly"
                        onClick={() => setBillingCycle('monthly')}
                        style={{
                          cursor: 'pointer',
                          backgroundColor: billingCycle === 'monthly' ? '#ffffff' : 'transparent',
                          borderRadius: '100px',
                          padding: '10px 32px',
                          transition: 'all 0.25s ease',
                        }}
                      >
                        <p
                          className="toggle-text-month"
                          style={{
                            color: billingCycle === 'monthly' ? '#322b80' : '#ffffff',
                            fontWeight: 600,
                            margin: 0,
                          }}
                        >
                          Monthly
                        </p>
                      </div>
                      <div
                        className="toggle-text-yearly"
                        onClick={() => setBillingCycle('yearly')}
                        style={{
                          cursor: 'pointer',
                          backgroundColor: billingCycle === 'yearly' ? '#ffffff' : 'transparent',
                          borderRadius: '100px',
                          padding: '10px 32px',
                          transition: 'all 0.25s ease',
                        }}
                      >
                        <p
                          className="toggle-text-year"
                          style={{
                            color: billingCycle === 'yearly' ? '#322b80' : '#ffffff',
                            fontWeight: 600,
                            margin: 0,
                          }}
                        >
                          Yearly
                        </p>
                      </div>
                    </div>

                    {/* Original Template Save Container Badge */}
                    <img
                      alt="Save 20%"
                      className="pricing-save-image"
                      loading="lazy"
                      src="/images/693f6993aff3e20a61a65009_Save%20container.png"
                    />
                  </div>

                  {/* Pricing Cards Grid */}
                  <div className="pricing-table monthly" style={{ display: 'grid' }}>
                    {currentPlans.map((plan, i) => (
                      <div key={i} className="pricing-card">
                        <div className="pricing-title-top">
                          <div className="head-title">
                            <p className="body-20-medium">{plan.name}</p>
                          </div>
                          <div className="price-text">
                            <div className="pricing-card-price">
                              <h2 className="pricing-price-heading">{plan.price}</h2>
                              <p className="body-18-medium">{plan.period}</p>
                            </div>
                            <p className="body-text-14">{plan.description}</p>
                          </div>
                        </div>

                        <div className="pricing-button-features">
                          <a
                            data-wf--hero-button--variant="features"
                            href="https://tarsbookademoapp.vercel.app/demo/tars-attendify-newsletter"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hero-button w-inline-block"
                          >
                            <div className="hero-button-content-wrap w-variant-2e2d7156-bf71-2b94-02c0-7d61d44d2e9b">
                              <p className="hero-button-text w-variant-2e2d7156-bf71-2b94-02c0-7d61d44d2e9b">
                                {plan.buttonText}
                              </p>
                            </div>
                          </a>

                          <div className="pricing-features-lists">
                            <p className="body-16-medium">Features you get</p>
                            <div className="pricing-card-features">
                              {plan.features.map((feat, fi) => (
                                <div key={fi} className="pricing-card-feature-item">
                                  <img
                                    width="Auto"
                                    height="Auto"
                                    alt="Icon"
                                    src={`/images/${featIcons[fi % featIcons.length]}`}
                                    loading="lazy"
                                    className="icon"
                                  />
                                  <p className="pricing-card-feature-text">{feat}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>
        </section>

        {/* Brand Logos */}
        <BrandLogos />

        {/* Compare Plan Section (100% exact replica from Rivero Template) */}
        <section className="compare-plan-section">
          <div className="w-layout-blockcontainer container w-container">
            <div className="content-wrapper-3">
              <div className="section-content">
                <h2 className="align-center">
                  Compare Our Plans
                </h2>
              </div>

              {/* Desktop Table */}
              <div className="compare-plan-area">
                <div className="plan-text-head">
                  <div className="plan-title-main">
                    <p className="plan-title align-left">Plan Features</p>
                  </div>
                  <div className="plan-title-main">
                    <p className="plan-title">Department / Pilot</p>
                  </div>
                  <div className="plan-title-main bg-neutral-02 _02">
                    <p className="plan-title">Campus / Mid-Size</p>
                  </div>
                  <div className="plan-title-main _03">
                    <p className="plan-title">University / Enterprise</p>
                  </div>
                </div>

                <div className="plan-text-flex-wrapper">
                  {compareFeatures.map((row, idx) => (
                    <div key={idx} className="plan-text-flex-wrap">
                      <div className="plan-text-flex align-left">
                        <p className="plan-text align-left">{row.name}</p>
                      </div>
                      <div className="plan-text-flex">
                        {renderVal(row.starter)}
                      </div>
                      <div className={`plan-text-flex bg-neutral-02 _02 ${idx === compareFeatures.length - 1 ? 'bottom' : ''}`}>
                        {renderVal(row.growth)}
                      </div>
                      <div className="plan-text-flex _03">
                        {renderVal(row.enterprise)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tablet Table */}
              <div className="compare-plan-area _02">
                <div className="plan-text-head">
                  <div className="plan-title-main">
                    <p className="plan-title align-left">Plan Features</p>
                  </div>
                  <div className="plan-title-main bg-neutral-02 _02 block">
                    <p className="plan-title">Campus / Mid-Size</p>
                  </div>
                </div>
                <div className="plan-text-flex-wrapper">
                  {compareFeatures.map((row, idx) => (
                    <div key={idx} className="plan-text-flex-wrap">
                      <div className="plan-text-flex align-left">
                        <p className="plan-text align-left">{row.name}</p>
                      </div>
                      <div className={`plan-text-flex bg-neutral-02 _02 block ${idx === compareFeatures.length - 1 ? 'bottom' : ''}`}>
                        {renderVal(row.growth)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Mobile Table */}
              <div className="compare-plan-area _03">
                <div className="plan-text-head">
                  <div className="plan-title-main">
                    <p className="plan-title align-left">Plan Features</p>
                  </div>
                  <div className="plan-title-main _03 block">
                    <p className="plan-title">University / Enterprise</p>
                  </div>
                </div>
                <div className="plan-text-flex-wrapper">
                  {compareFeatures.map((row, idx) => (
                    <div key={idx} className="plan-text-flex-wrap">
                      <div className="plan-text-flex align-left">
                        <p className="plan-text align-left">{row.name}</p>
                      </div>
                      <div className="plan-text-flex _03 block">
                        {renderVal(row.enterprise)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <FAQ />

        {/* Footer */}
        <Footer />
      </section>
    </div>
  );
}
