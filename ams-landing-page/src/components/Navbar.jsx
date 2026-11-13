import React, { useState } from 'react';
import { Link } from 'react-router-dom';

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const closeMenus = () => {
    setMobileMenuOpen(false);
  };

  return (
    <section className="navbar" style={{ top: '30px' }}>
      <section className="header">
        <div className="w-layout-blockcontainer navbar-container w-container">
          <div
            data-animation="default"
            data-collapse="medium"
            data-duration="400"
            data-easing="ease"
            data-easing2="ease"
            role="banner"
            className="navbar-black w-nav"
          >
            <div className="w-layout-blockcontainer navbar-container w-container">
              <div className="header-content">
                {/* Brand Logo - AMS only */}
                <Link
                  to="/"
                  onClick={closeMenus}
                  aria-current="page"
                  className="brand-logo w-nav-brand w--current"
                  style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}
                >
                  <span
                    style={{
                      fontWeight: 400,
                      fontSize: '20px',
                      letterSpacing: '1.8px',
                      color: '#ffffffff',
                      lineHeight: 1,
                    }}
                  >
                    AMS
                  </span>
                </Link>

                {/* Nav Links */}
                <nav
                  role="navigation"
                  className={`nav-menu _01 w-nav-menu ${mobileMenuOpen ? 'w--open' : ''}`}
                  style={mobileMenuOpen ? { display: 'block' } : {}}
                >
                  <Link to="/features" onClick={closeMenus} className="nav-link gap-top w-nav-link">Features</Link>
                  <Link to="/pricing-v1" onClick={closeMenus} className="nav-link gap-top w-nav-link">Pricing</Link>
                  <Link to="/about" onClick={closeMenus} className="nav-link gap-top w-nav-link">About</Link>
                  <Link to="/contact" onClick={closeMenus} className="nav-link w-nav-link">Contact</Link>
                  <Link to="/login" onClick={closeMenus} className="nav-link w-nav-link" style={{ color: '#60A5FA', fontWeight: '600' }}>Sign In</Link>
                </nav>

                {/* Header CTA Buttons */}
                <div className="header-button" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Link
                    to="/login"
                    onClick={closeMenus}
                    style={{
                      color: '#E2E8F0',
                      textDecoration: 'none',
                      fontSize: '14px',
                      fontWeight: '600',
                      padding: '8px 12px'
                    }}
                  >
                    Sign In
                  </Link>

                  <div className="button-wrap">
                    <Link
                      to="/signup"
                      onClick={closeMenus}
                      className="hero-button w-variant-445a0c0f-f314-4cf0-1342-7d380467caed w-inline-block"
                      style={{ background: 'linear-gradient(135deg, #2563EB, #1D4ED8)' }}
                    >
                      <div className="hero-button-content-wrap w-variant-445a0c0f-f314-4cf0-1342-7d380467caed">
                        <p className="hero-button-text w-variant-445a0c0f-f314-4cf0-1342-7d380467caed">Start Free Trial →</p>
                      </div>
                    </Link>
                  </div>


                  {/* Mobile Hamburger Button */}
                  <div
                    className={`menu-button w-nav-button ${mobileMenuOpen ? 'w--open' : ''}`}
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    style={{ cursor: 'pointer' }}
                    aria-label="menu"
                    role="button"
                    tabIndex="0"
                  >
                    <div
                      className="humburger-icon"
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-around',
                        width: '24px',
                        height: '20px',
                      }}
                    >
                      <span style={{ display: 'block', height: '2px', background: '#000', borderRadius: '1px' }}></span>
                      <span style={{ display: 'block', height: '2px', background: '#000', borderRadius: '1px' }}></span>
                      <span style={{ display: 'block', height: '2px', background: '#000', borderRadius: '1px' }}></span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </section>
  );
}
