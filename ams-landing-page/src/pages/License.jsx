import React, { useEffect } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export default function License() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="body">
      <section className="sections">
        <Navbar />
        <section className="hero-section-main"><section className="hero-area-main"><section className="hero-area-block"><div className="w-layout-blockcontainer container blog w-container"><div className="integrations-content-wrapper"><div className="integrations-content-wrap"><div className="features-section-title review"><h1 data-w-id="6eec1683-dfc2-55ad-dc1e-358a885694a6" className="hero-display-heading-black">License</h1><p data-w-id="6eec1683-dfc2-55ad-dc1e-358a885694a8" className="align-center">All graphical assets in this template are licensed for personal and commercial use. If you'd like to use a specific asset, please check the license below.</p></div></div></div></div></section></section></section>
<section className="license-section"><div className="w-layout-blockcontainer container changelog w-container"><div data-w-id="fe2654b6-0fbb-9f75-25c6-db218f545f46" className="license-content-wrapper"><div className="license-content-block"><div className="singel-form-list"><h2 className="license-title">Images</h2><div className="form-list"><a href="https://www.freepik.com/" className="singel-form w-inline-block"><p className="paragraph">freepik.com</p></a><a href="http://unsplash.com/" className="singel-form w-inline-block"><p className="paragraph">unsplash.com</p></a></div></div><div className="singel-form-list"><h2 className="license-title">Fonts</h2><div className="form-list"><a href="https://fonts.google.com/?query=inter" className="singel-form w-inline-block"><p className="paragraph">Inter</p></a></div></div></div></div></div></section>
        <Footer />
      </section>
    </div>
  );
}
