import React from 'react';

const reviews = [
  {
    quote: "Saved our academic team 30+ hours every month. Tracking 600+ interns placed in partner firms is now completely automatic.",
    name: "Dr. Rajesh Sharma",
    role: "Dean of Placements",
    avatar: "/images/693f6993aff3e20a61a64fe2_Image.svg",
  },
  {
    quote: "We threw away our broken fingerprint sensors. Setting up AMS on two iPads at reception took 5 minutes.",
    name: "Priya Patel",
    role: "Head of People",
    avatar: "/images/693f6993aff3e20a61a64fe3_Image%20%281%29.svg",
  },
  {
    quote: "Proxy attendance dropped to zero on day one. Students walk up, glance at the camera, and they are in.",
    name: "Amit Verma",
    role: "Registrar",
    avatar: "/images/693f6993aff3e20a61a64fe4_Image%20%282%29.svg",
  },
  {
    quote: "The automated Excel exports with daily, monthly, and semester matrices make audits a breeze.",
    name: "Sneha Kulkarni",
    role: "Operations Director",
    avatar: "/images/693f6993aff3e20a61a64fe5_Image%20%283%29.svg",
  },
  {
    quote: "Zero hardware maintenance and zero RFID cards to replace. AMS paid for itself in two months.",
    name: "Vikram Mehta",
    role: "CTO",
    avatar: "/images/693f6993aff3e20a61a64fe6_Image%20%284%29.svg",
  },
  {
    quote: "Super clean interface. Fast, accurate, and students actually love using it.",
    name: "Ananya Deshmukh",
    role: "Campus Coordinator",
    avatar: "/images/693f6993aff3e20a61a64fe7_Image%20%285%29.svg",
  },
];

export default function ReviewSection() {
  return (
    <section className="review-section">
      <div className="w-layout-blockcontainer review-container w-container">
        <div className="review-content-wrapper">
          <div className="features-content-wrap">
            <div className="features-section-title">
              <h2 data-w-id="32e30959-1d77-cb7a-f15e-e7e34a284df3" className="align-center">
                Loved by Campuses &amp; Teams
              </h2>
              <p data-w-id="32e30959-1d77-cb7a-f15e-e7e34a284df5" className="align-center">
                Real feedback from deans, registrars, and operations heads.
              </p>
            </div>
          </div>

          <div data-w-id="fb6795b5-c522-f455-edb0-45bf043bd1e0" className="review-card-lists">
            <div className="review-card-list">
              {reviews.slice(0, 3).map((r, i) => (
                <div key={i} className="review-card">
                  <p className="review-text">“{r.quote}”</p>
                  <div className="review-information">
                    <div className="review-info">
                      <img src={r.avatar} loading="lazy" alt={r.name} className="review-image" />
                      <div className="review-names">
                        <p className="review-name">{r.name}</p>
                        <p className="review-position">{r.role}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="review-card-list">
              {reviews.slice(3, 6).map((r, i) => (
                <div key={i} className="review-card">
                  <p className="review-text">“{r.quote}”</p>
                  <div className="review-information">
                    <div className="review-info">
                      <img src={r.avatar} loading="lazy" alt={r.name} className="review-image" />
                      <div className="review-names">
                        <p className="review-name">{r.name}</p>
                        <p className="review-position">{r.role}</p>
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
  );
}
