import React from 'react';
import { Link } from 'react-router-dom';

export default function FeaturesMain() {
  return (
    <section className="features-section">
      <div className="w-layout-blockcontainer container w-container">
        <div className="features-content-wrapper">
          <div className="features-content-wrap">
            <div className="features-section-title">
              <h2 data-w-id="586a766c-d06d-17b6-7b23-b52794624c1e" className="align-center">
                Everything You Need, Nothing You Don&apos;t
              </h2>
              <p data-w-id="586a766c-d06d-17b6-7b23-b52794624c20" className="align-center">
                Built specifically for colleges, intern cohorts, and multi-branch teams.
              </p>
            </div>
            <div data-w-id="90f7629c-2933-7b3d-7a0c-8e3ff50413f5" className="features-card-wrap">
              {/* Feature 1 */}
              <div className="features-card">
                <img src="/images/ams_daily_checkin_status_card.jpg" loading="lazy" alt="Face Scanner" className="features-image-01" />
                <div className="features-content-left">
                  <div className="features-icon-flex">
                    <img src="/images/693f6993aff3e20a61a64fd2_chart-increase.svg" loading="lazy" alt="" className="features-icon" />
                  </div>
                  <div className="feature-title-wrap">
                    <h3>Face Check-In Scanner</h3>
                    <p className="body-14">
                      Turn any iPad, tablet, or laptop into an entrance check-in screen in 60 seconds. Instant face matching with temporary photo proof for audits.
                    </p>
                  </div>
                  <Link data-wf--hero-button--variant="features" to="/features" className="hero-button w-inline-block">
                    <div className="hero-button-content-wrap w-variant-2e2d7156-bf71-2b94-02c0-7d61d44d2e9b">
                      <p className="hero-button-text w-variant-2e2d7156-bf71-2b94-02c0-7d61d44d2e9b">See Scanner Demo</p>
                    </div>
                  </Link>
                </div>
              </div>

              {/* Feature 2 */}
              <div data-w-id="974fde1a-b301-6fbd-3fe2-de0109c20c83" className="features-card _02">
                <div className="features-content-left _02">
                  <div className="features-icon-flex">
                    <img src="/images/693f6993aff3e20a61a64fd4_Icon%20%283%29.svg" loading="lazy" alt="" className="features-icon" />
                  </div>
                  <div className="feature-title-wrap">
                    <h3>Multi-Branch &amp; Company Hub</h3>
                    <p className="body-14">
                      Super Admins get one master dashboard. Each department or partner firm gets its own shift rules, student lists, and leave tracking.
                    </p>
                  </div>
                  <Link data-wf--hero-button--variant="features" to="/features" className="hero-button w-inline-block">
                    <div className="hero-button-content-wrap w-variant-2e2d7156-bf71-2b94-02c0-7d61d44d2e9b">
                      <p className="hero-button-text w-variant-2e2d7156-bf71-2b94-02c0-7d61d44d2e9b">Explore Hub</p>
                    </div>
                  </Link>
                </div>
                <img src="/images/ams_multi_branch_hub_card.jpg" loading="lazy" alt="Multi-Branch &amp; Company Hub" className="features-image-01" />
              </div>

              {/* Feature 3 */}
              <div data-w-id="25f02863-aca7-13cb-2774-6cf189b6b7bf" className="features-card-03">
                <img src="/images/ams_excel_reports_card.jpg" loading="lazy" alt="Excel Reports" className="features-image-01" />
                <div className="features-content-left">
                  <div className="features-icon-flex">
                    <img src="/images/693f6993aff3e20a61a64fd6_Icon%20%284%29.svg" loading="lazy" alt="" className="features-icon" />
                  </div>
                  <div className="feature-title-wrap">
                    <h3>1-Click Color-Coded Excel</h3>
                    <p className="body-14">
                      Download daily, monthly, and semester Excel sheets with automated formulas, present/absent counts, and half-day markers.
                    </p>
                  </div>
                  <Link data-wf--hero-button--variant="features" to="/features" className="hero-button w-inline-block">
                    <div className="hero-button-content-wrap w-variant-2e2d7156-bf71-2b94-02c0-7d61d44d2e9b">
                      <p className="hero-button-text w-variant-2e2d7156-bf71-2b94-02c0-7d61d44d2e9b">View Reports</p>
                    </div>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
