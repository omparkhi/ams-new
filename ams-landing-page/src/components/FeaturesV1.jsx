import React from 'react';

export default function FeaturesV1() {
  return (
    <section className="features-section-v1">
      <div className="w-layout-blockcontainer feature-container w-container">
        <div className="features-content-wrapper">
          <div className="features-content-wrap">
            <div className="features-section-title">
              <h2 data-w-id="37b54a31-6d1f-c473-adfd-cfca31e134ff" className="align-center">
                Why Choose AMS?
              </h2>
              <p data-w-id="80e7714f-2dd0-897c-7e91-07d0f6f33989" className="align-center">
                Ditch manual paper logs and broken fingerprint readers.
              </p>
            </div>
            <div data-w-id="4dff95b6-8922-c062-c833-8eb65745486f" className="features-card-lists">
              <div className="features-card-v1">
                <div className="features-text-flex">
                  <div>
                    <div className="features-icon-block">
                      <img src="/images/693f6993aff3e20a61a64f66_Icon%20%282%29.svg" loading="lazy" alt="" className="features-icon" />
                    </div>
                  </div>
                  <div className="features-text-wrap">
                    <p className="body-20-medium">Scan &amp; In in 0.5s</p>
                    <p className="body-14">
                      Just glance at the camera. Contactless, ultra-fast, and proxy-proof.
                    </p>
                  </div>
                </div>
                <img src="/images/ams_scan_verification_card.jpg" loading="lazy" alt="AMS Scan Verification 0.5s" className="features-image-v1" />
              </div>

              <div className="features-card-v2">
                <div className="features-text-flex">
                  <div>
                    <div className="features-icon-block">
                      <img src="/images/693f6993aff3e20a61a64f4d_line-chart-up-02%20%281%29.svg" loading="lazy" alt="" className="features-icon" />
                    </div>
                  </div>
                  <div className="features-text-wrap">
                    <p className="body-20-medium">Automated Shift Hours</p>
                    <p className="body-14">
                      Computes daily hours, half-days, and leaves automatically.
                    </p>
                  </div>
                </div>
                <img src="/images/ams_shift_analytics_card.jpg" loading="lazy" alt="AMS Shift Analytics - Auto Hours & Leaves" className="features-image-v1" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
