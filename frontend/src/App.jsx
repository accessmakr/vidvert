/**
 * src/App.jsx
 * PHASE 6 — Thin router shell.
 * Updated to add /tools hub route (ToolsHub).
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';

import ToolApp     from './pages/ToolApp';
import ToolsHub    from './pages/ToolsHub';
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
          <Route path="/"               element={<ToolApp />} />
          <Route path="/tools"          element={<ToolsHub />} />
          <Route path="/tools/:slug"    element={<SeoToolPage />} />

          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/terms-of-use"   element={<TermsOfUse />} />
          <Route path="/about"          element={<AboutUs />} />
          <Route path="/cookie-policy"  element={<CookiePolicy />} />
          <Route path="/contact"        element={<ContactUs />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </HelmetProvider>
  );
}
