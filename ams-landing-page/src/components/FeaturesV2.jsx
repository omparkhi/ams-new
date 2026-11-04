import React, { useState } from 'react';

export default function FeaturesV2() {
  const [activeTab, setActiveTab] = useState(1);

  return (
    <section className="features-section-v2">
      <div className="w-layout-blockcontainer features-container-v2 w-container">
        <div className="features-content-wrapper-v2">
          <div className="features-content-wrap">
            <div className="features-section-title">
              <h2 data-w-id="80e9e3ee-6ea0-9527-ba1e-caa6f0996f2f" className="align-center">
                Built for Speed &amp; Accuracy
              </h2>
              <p data-w-id="80e9e3ee-6ea0-9527-ba1e-caa6f0996f31" className="align-center">
                Three simple tools designed to make attendance effortless for staff and students.
              </p>
            </div>
          </div>

          <div className="choose-us-tabs w-tabs">
            <div className="tabs-menu w-tab-menu">
              {/* Tab 1 */}
              <div
                style={{
                  backgroundColor: activeTab === 1 ? 'rgb(255,255,255)' : 'rgb(248, 250, 252)',
                  cursor: 'pointer',
                  border: activeTab === 1 ? '1px solid #e2e8f0' : '1px solid transparent',
                  boxShadow: activeTab === 1 ? '0 4px 6px -1px rgba(0, 0, 0, 0.05)' : 'none',
                }}
                className={`singel-choose-us-card w-inline-block w-tab-link ${activeTab === 1 ? 'w--current' : ''}`}
                onClick={() => setActiveTab(1)}
              >
                <div className="choose-us-title">
                  <div>
                    <div style={{ backgroundColor: 'rgb(251,251,251)' }} className="choose-us-icon-wrap">
                      <img width="Auto" height="Auto" alt="Enrollment" src="/images/693f6993aff3e20a61a64fda_user-story%20%281%29.svg" loading="lazy" className="icon" />
                    </div>
                  </div>
                  <div className="choose-us-card-description">
                    <div className="choose-title">10s Face Setup</div>
                    <p className="choose-us-paragraph">
                      Register student faces in seconds with a fast webcam burst. Zero tedious profile setup.
                    </p>
                  </div>
                </div>
              </div>

              {/* Tab 2 */}
              <div
                style={{
                  backgroundColor: activeTab === 2 ? 'rgb(255,255,255)' : 'rgb(248, 250, 252)',
                  cursor: 'pointer',
                  border: activeTab === 2 ? '1px solid #e2e8f0' : '1px solid transparent',
                  boxShadow: activeTab === 2 ? '0 4px 6px -1px rgba(0, 0, 0, 0.05)' : 'none',
                }}
                className={`singel-choose-us-card w-inline-block w-tab-link ${activeTab === 2 ? 'w--current' : ''}`}
                onClick={() => setActiveTab(2)}
              >
                <div className="choose-us-title">
                  <div>
                    <div style={{ backgroundColor: 'rgb(251,251,251)' }} className="choose-us-icon-wrap">
                      <img width="Auto" height="Auto" alt="Scanner" src="/images/693f6993aff3e20a61a64fd8_security-check.svg" loading="lazy" className="icon" />
                    </div>
                  </div>
                  <div className="choose-us-card-description">
                    <div className="choose-title">Entrance Check-In Screen</div>
                    <p className="choose-us-paragraph">
                      Open in any browser at your front door. Face detected &amp; logged in under 500ms.
                    </p>
                  </div>
                </div>
              </div>

              {/* Tab 3 */}
              <div
                style={{
                  backgroundColor: activeTab === 3 ? 'rgb(255,255,255)' : 'rgb(248, 250, 252)',
                  cursor: 'pointer',
                  border: activeTab === 3 ? '1px solid #e2e8f0' : '1px solid transparent',
                  boxShadow: activeTab === 3 ? '0 4px 6px -1px rgba(0, 0, 0, 0.05)' : 'none',
                }}
                className={`singel-choose-us-card w-inline-block w-tab-link ${activeTab === 3 ? 'w--current' : ''}`}
                onClick={() => setActiveTab(3)}
              >
                <div className="choose-us-title">
                  <div>
                    <div style={{ backgroundColor: 'rgb(251,251,251)' }} className="choose-us-icon-wrap">
                      <img width="Auto" height="Auto" alt="Rules" src="/images/693f6993aff3e20a61a64fdd_eco-power.svg" loading="lazy" className="icon" />
                    </div>
                  </div>
                  <div className="choose-us-card-description">
                    <div className="choose-title">Auto Shift Rules</div>
                    <p className="choose-us-paragraph">
                      Grace windows, half-day cuts, and monthly leave balances tracked automatically.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Tab Visuals */}
            <div className="tabs-content w-tab-content">
              <div className={`tab-image-wrapper w-tab-pane ${activeTab === 1 ? 'w--tab-active' : ''}`} style={{ display: activeTab === 1 ? 'block' : 'none' }}>
                <img width="Auto" height="Auto" alt="Face Onboarding" src="/images/ams_face_onboarding_tab.jpg" loading="lazy" className="choose-us-image-01" />
              </div>
              <div className={`tab-image-wrapper w-tab-pane ${activeTab === 2 ? 'w--tab-active' : ''}`} style={{ display: activeTab === 2 ? 'block' : 'none' }}>
                <img width="Auto" height="Auto" alt="Entrance Scanner" src="/images/ams_entrance_scanner_tab.jpg" loading="lazy" className="choose-us-image-01" />
              </div>
              <div className={`tab-image-wrapper w-tab-pane ${activeTab === 3 ? 'w--tab-active' : ''}`} style={{ display: activeTab === 3 ? 'block' : 'none' }}>
                <img width="Auto" height="Auto" alt="Auto Shift Rules" src="/images/ams_auto_shift_rules_tab.jpg" loading="lazy" className="choose-us-image-01" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
