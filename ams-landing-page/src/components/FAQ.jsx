import React, { useState } from 'react';

const faqs = [
  {
    question: 'How fast is the face recognition?',
    answer:
      'Under 0.5 seconds. Students simply walk up to the camera and their check-in is logged immediately with on-screen confirmation.',
  },
  {
    question: 'Do I need to buy any special biometric hardware?',
    answer:
      'No hardware needed. AMS runs inside any modern browser on standard laptops, tablets, iPads, or phone cameras.',
  },
  {
    question: 'Can someone clock in for a friend (proxy attendance)?',
    answer:
      'No. Our biometric engine validates unique 128-d face vectors and captures live snapshot verification at check-in, completely preventing buddy punching.',
  },
  {
    question: 'Can we manage multiple departments or partner companies?',
    answer:
      'Yes. One central admin hub lets you manage multiple colleges, branch offices, or partner firms with isolated student rosters and shift rules.',
  },
  {
    question: 'How do we export attendance for audits or payroll?',
    answer:
      'Download ready-to-use, color-coded Excel reports anytime with 1 click. Includes daily, weekly, monthly, and semester matrices.',
  },
  {
    question: 'How long does student enrollment take?',
    answer:
      'About 10 seconds. The student looks at the webcam once for a quick frame burst, and their biometric profile is saved securely.',
  },
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState(0);

  const toggleFAQ = (index) => {
    setOpenIndex(openIndex === index ? -1 : index);
  };

  return (
    <section className="faq-section">
      <div className="w-layout-blockcontainer container faq w-container">
        <div className="faq-content-wrapper">
          <div className="features-content-wrap">
            <div className="features-section-title">
              <h2 className="align-center">Got Questions? Quick Answers.</h2>
              <p className="align-center">
                Everything you need to know about setting up and running AMS.
              </p>
            </div>
          </div>
          <div className="faq-wrapper">
            {faqs.map((faq, index) => {
              const isOpen = openIndex === index;
              return (
                <div
                  key={index}
                  style={{
                    backgroundColor: 'rgb(251, 251, 251)',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                  }}
                  className={`single-faq w-dropdown ${isOpen ? 'w--open' : ''}`}
                  onClick={() => toggleFAQ(index)}
                >
                  <div className={`faq-question w-dropdown-toggle ${isOpen ? 'w--open' : ''}`}>
                    <div className="faq-question-wrapper">
                      <div className="faq-title">{faq.question}</div>
                      <div className="faq-icon-wrapper">
                        <img
                          width="Auto"
                          height="Auto"
                          alt="Icon"
                          src="/images/693f6993aff3e20a61a64fef_Toggle%20Icon.svg"
                          loading="lazy"
                          style={{
                            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                            transition: 'transform 0.3s ease',
                          }}
                          className="faq-icon"
                        />
                      </div>
                    </div>
                  </div>
                  <nav
                    style={{
                      height: isOpen ? 'auto' : '0px',
                      overflow: 'hidden',
                      display: isOpen ? 'block' : 'none',
                      transition: 'all 0.3s ease',
                    }}
                    className={`faq-answer w-dropdown-list ${isOpen ? 'w--open' : ''}`}
                  >
                    <div className="faq-answer-text">
                      <p className="faq-paragraph">{faq.answer}</p>
                    </div>
                  </nav>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
