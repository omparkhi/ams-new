import React, { useEffect } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export default function Styleguide() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="body">
      <section className="sections">
        <Navbar />
        <section className="hero-section-main"><section className="hero-area-main"><section className="hero-area-block"><div className="w-layout-blockcontainer container blog w-container"><div className="integrations-content-wrapper"><div className="integrations-content-wrap"><div className="features-section-title review"><h1 data-w-id="f656fa27-32bf-6374-af1a-09c047bd04bc" className="hero-display-heading-black">Styleguide</h1><p data-w-id="f656fa27-32bf-6374-af1a-09c047bd04be" className="align-center">TemplateFlow gives you the blocks needed to create a truly professional website for your SaaS is a long established fact that a reader.</p></div></div></div></div></section></section></section>
<section className="styleguide-section"><div className="w-layout-blockcontainer container blog-details w-container"><div className="license-content-wrapper"><div className="styleguide-content-block"><section data-w-id="a3255042-b619-6ddf-94bd-25003b8a8f19" className="color-style"><h2 className="color-style-text">Color Styles</h2><div className="content-area horizontal"><div className="color-box _01"><p className="text">Neutral Color 01</p></div><div className="color-box _02"><p className="text">Neutral Color 02</p></div><div className="color-box _03"><p className="text white">Neutral Color 03</p></div><div className="color-box _04"><p className="text white">Neutral Color 04</p></div><div className="color-box _05"><p className="text white">Theme Color 01</p></div><div className="color-box _06"><p className="text white">Theme Color 02</p></div><div className="color-box _07"><p className="text white">Theme Color 03</p></div></div></section><section data-w-id="a3255042-b619-6ddf-94bd-25003b8a8f32" className="heading-style"><h2 className="color-style-text">All Headings</h2><div className="content-area"><h1>Heading 1</h1><h2>Heading 2</h2><h3>Heading 3</h3><h4>Heading 4</h4><h5>Heading 5</h5></div></section><section data-w-id="a3255042-b619-6ddf-94bd-25003b8a8f40" className="paragraph-style"><h2 className="color-style-text">All Paragraph</h2><div className="content-area"><p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Suspendisse varius enim in eros elementum tristique. </p></div></section><section data-w-id="a3255042-b619-6ddf-94bd-25003b8a8f46" className="button-style"><h2 className="color-style-text">Button Styles</h2><div className="content-area"><a data-wf--hero-button--variant="features" href="#" className="hero-button w-inline-block"><div className="hero-button-content-wrap w-variant-2e2d7156-bf71-2b94-02c0-7d61d44d2e9b"><p className="hero-button-text w-variant-2e2d7156-bf71-2b94-02c0-7d61d44d2e9b">Get started for free</p></div></a></div></section></div></div></div></section>
        <Footer />
      </section>
    </div>
  );
}
