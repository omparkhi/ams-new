import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './styles/riveero.css';

// Pages
import Home from './pages/Home';
import Features from './pages/Features';
import PricingV1 from './pages/PricingV1';
import PricingV2 from './pages/PricingV2';
import About from './pages/About';
import Blog from './pages/Blog';
import BlogDetails from './pages/BlogDetails';
import Contact from './pages/Contact';
import CaseStudy from './pages/CaseStudy';
import CaseStudyDetails from './pages/CaseStudyDetails';
import Integration from './pages/Integration';
import IntegrationDetails from './pages/IntegrationDetails';
import Shop from './pages/Shop';
import ProductDetails from './pages/ProductDetails';
import BookDemo from './pages/BookDemo';
import Review from './pages/Review';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsConditions from './pages/TermsConditions';
import License from './pages/License';
import Changelog from './pages/Changelog';
import Styleguide from './pages/Styleguide';
import NotFound from './pages/NotFound';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/features" element={<Features />} />
        <Route path="/pricing-v1" element={<PricingV1 />} />
        <Route path="/pricing-v2" element={<PricingV2 />} />
        <Route path="/about" element={<About />} />
        <Route path="/blog" element={<Blog />} />
        <Route path="/blog-posts/:slug" element={<BlogDetails />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/case-study" element={<CaseStudy />} />
        <Route path="/case-study/:slug" element={<CaseStudyDetails />} />
        <Route path="/integration" element={<Integration />} />
        <Route path="/integrations/:slug" element={<IntegrationDetails />} />
        <Route path="/shop" element={<Shop />} />
        <Route path="/product/:slug" element={<ProductDetails />} />
        <Route path="/book-a-demo" element={<BookDemo />} />
        <Route path="/review" element={<Review />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/terms-conditions" element={<TermsConditions />} />
        <Route path="/license" element={<License />} />
        <Route path="/changelog" element={<Changelog />} />
        <Route path="/styleguide" element={<Styleguide />} />
        <Route path="/404" element={<NotFound />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
