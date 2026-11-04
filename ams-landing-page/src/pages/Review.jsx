import React, { useEffect } from 'react';
import Navbar from '../components/Navbar';
import ReviewSection from '../components/ReviewSection';
import ProcessWalkthrough from '../components/ProcessWalkthrough';
import FAQ from '../components/FAQ';
import Footer from '../components/Footer';

export default function Review() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="body">
      <section className="sections">
        <Navbar />

        <section className="hero-section-main">
          <section className="hero-area-main">
            <section className="hero-area-block">
              <div className="w-layout-blockcontainer container blog w-container">
                <div className="integrations-content-wrapper">
                  <div className="integrations-content-wrap">
                    <div className="features-section-title review">
                      <h1 className="hero-display-heading-black">Customer Stories &amp; Institutional Reviews</h1>
                      <p className="align-center">
                        Discover how higher education institutions, corporate training hubs, and placement deans eliminated manual attendance friction with AMS.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </section>
        </section>

        <ReviewSection />
        <ProcessWalkthrough />
        <FAQ />
        <Footer />
      </section>
    </div>
  );
}
