import React, { useEffect } from 'react';
import Navbar from '../components/Navbar';
import Hero from '../components/Hero';
import BrandLogos from '../components/BrandLogos';
import FeaturesV1 from '../components/FeaturesV1';
import HowItWorks from '../components/HowItWorks';
import FeaturesMain from '../components/FeaturesMain';
import FeaturesV2 from '../components/FeaturesV2';
import ReviewSection from '../components/ReviewSection';
import ProcessWalkthrough from '../components/ProcessWalkthrough';
import FAQ from '../components/FAQ';
import Footer from '../components/Footer';

export default function Home() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="body">
      <section className="sections">
        <Navbar />
        <Hero />
        <BrandLogos />
        <FeaturesV1 />
        <HowItWorks />
        <FeaturesMain />
        <FeaturesV2 />
        <ReviewSection />
        <ProcessWalkthrough />
        <FAQ />
        <Footer />
      </section>
    </div>
  );
}

