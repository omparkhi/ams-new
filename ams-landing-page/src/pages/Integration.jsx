import React, { useEffect } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Link } from 'react-router-dom';

const integrations = [
  {
    name: 'Moodle & Canvas LMS',
    category: 'Academic SIS',
    description: 'Sync student course rosters, lecture groups, and semester schedules directly into AMS attendance screens.',
    icon: '/images/693f6993aff3e20a61a64f70_Icon%20(5).svg',
  },
  {
    name: 'Microsoft 365 & Azure AD',
    category: 'SSO & Identity',
    description: 'Enable Single Sign-On (SSO) for Super Admins, faculty, and company coordinators using campus credentials.',
    icon: '/images/693f6993aff3e20a61a64f71_Icon%20(6).svg',
  },
  {
    name: 'Google Workspace',
    category: 'Directory Sync',
    description: 'Import student and faculty emails instantly, with automatic shift reminder emails and calendar sync.',
    icon: '/images/693f6993aff3e20a61a64f72_Icon%20(7).svg',
  },
  {
    name: 'SAP & Oracle HCM',
    category: 'Payroll & HR',
    description: 'Export validated hours, overtime, and leave deductions directly to corporate payroll accounting engines.',
    icon: '/images/693f6993aff3e20a61a64f73_Icon%20(8).svg',
  },
  {
    name: 'Slack & Teams Webhooks',
    category: 'Real-Time Alerts',
    description: 'Receive real-time alerts when students miss mandatory shifts or when daily attendance tallies fall below thresholds.',
    icon: '/images/693f6993aff3e20a61a64f76_Icon%20(11).svg',
  },
  {
    name: 'OpenPyXL Excel Engine',
    category: 'Reporting',
    description: 'Native generation of stylized, color-coded .xlsx spreadsheets with built-in duration math and summary badges.',
    icon: '/images/693f6993aff3e20a61a64f74_Icon%20(9).svg',
  },
];

export default function Integration() {
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
              <div className="w-layout-blockcontainer container blog w-container">
                <div className="integrations-content-wrapper">
                  <div className="integrations-content-wrap">
                    <div className="features-section-title core-value">
                      <h1 className="hero-display-heading-black">Ecosystem &amp; ERP Integrations</h1>
                      <p className="align-center">
                        Seamlessly connect AMS with your campus Student Information System (SIS), corporate payroll engines, and identity providers.
                      </p>
                    </div>

                    <div className="integration-card-wrapper" style={{ marginTop: '40px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
                        {integrations.map((item, i) => (
                          <div
                            key={i}
                            style={{
                              backgroundColor: '#fff',
                              borderRadius: '16px',
                              padding: '24px',
                              border: '1px solid #e2e8f0',
                              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '12px',
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <img src={item.icon} alt={item.name} style={{ width: '40px', height: '40px' }} />
                              <span style={{ fontSize: '11px', fontWeight: 600, color: '#2563eb', backgroundColor: '#eff6ff', padding: '4px 8px', borderRadius: '8px' }}>
                                {item.category}
                              </span>
                            </div>
                            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', margin: '4px 0' }}>{item.name}</h3>
                            <p style={{ fontSize: '14px', color: '#64748b', lineHeight: 1.5, margin: 0 }}>{item.description}</p>
                          </div>
                        ))}
                      </div>
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
