/**
 * src/App.jsx
 * PHASE 6 — Now a thin router shell, not the app itself. The actual
 * homepage UI lives in pages/ToolApp.jsx. This file's only job is
 * wrapping everything in the providers SEO needs (HelmetProvider)
 * and defining where each URL path goes.
 *
 * Netlify already has the required SPA catch-all in netlify.toml
 * ( "/*" → "/index.html" status 200 ) — confirmed present from
 * earlier in this project, no netlify.toml change needed for
 * client-side routing to work.
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';

import ToolApp     from './pages/ToolApp';
import SeoToolPage from './pages/SeoToolPage';

import PrivacyPolicy from './pages/legal/PrivacyPolicy';
import TermsOfUse    from './pages/legal/TermsOfUse';
import AboutUs       from './pages/legal/AboutUs';
import CookiePolicy  from './pages/legal/CookiePolicy';
import ContactUs     from './pages/legal/ContactUs';

export default function App() {
  return (
    <HelmetProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/"                element={<ToolApp />} />
          <Route path="/tools/:slug"     element={<SeoToolPage />} />

          <Route path="/privacy-policy"  element={<PrivacyPolicy />} />
          <Route path="/terms-of-use"    element={<TermsOfUse />} />
          <Route path="/about"           element={<AboutUs />} />
          <Route path="/cookie-policy"   element={<CookiePolicy />} />
          <Route path="/contact"         element={<ContactUs />} />

          {/* Unknown path — send home rather than a blank screen */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </HelmetProvider>
  );
}
