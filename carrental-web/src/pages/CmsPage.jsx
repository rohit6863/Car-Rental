import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import DOMPurify from 'dompurify';
import Header from '../components/Header';
import Footer from '../components/Footer';
import LoginModal from '../components/LoginModal';
import SignupModal from '../components/SignupModal';
import ForgotPasswordModal from '../components/ForgotPasswordModal';
import api from '../api/client';

export default function CmsPage() {
  const params = useParams();
  const [searchParams] = useSearchParams();

  // Support both /page/:type and legacy /page.php?type=:type
  const pageType = params.type || searchParams.get('type') || 'aboutus';

  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPage() {
      setLoading(true);
      try {
        const res = await api.get(`/api/pages/${pageType}`);
        setPage(res.data);
      } catch (err) {
        console.error('Failed to load CMS page', err);
      } finally {
        setLoading(false);
      }
    }
    loadPage();
  }, [pageType]);

  const sanitizedHtml = page?.detail ? DOMPurify.sanitize(page.detail) : '';

  return (
    <div className="min-h-screen bg-brand-light dark:bg-brand-darker text-slate-800 dark:text-slate-100 flex flex-col font-sans transition-colors duration-300">
      <Header />

      {/* Subbanner */}
      <section className="page-header aboutus_page relative subbanner-overlay py-12 md:py-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-brand-darker via-brand-dark to-brand-slate opacity-95"></div>
        <div className="relative max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="page-header_wrap">
            <div className="page-heading">
              <h1 className="font-display text-3xl md:text-4xl font-extrabold text-white tracking-tight">
                {page ? page.PageName : 'Page Details'}
              </h1>
            </div>
            <ul className="coustom-breadcrumb flex items-center gap-2 text-xs md:text-sm text-slate-300 mt-2 font-medium">
              <li>
                <Link to="/" className="text-slate-300 hover:text-white transition-colors">Home</Link>
              </li>
              <li className="text-slate-400">/</li>
              <li className="text-brand-amber font-semibold">{page ? page.PageName : 'Details'}</li>
            </ul>
          </div>
        </div>
        <div className="dark-overlay"></div>
      </section>

      {/* CMS Content */}
      <section className="about_us section-padding flex-1 py-12 md:py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white dark:bg-brand-slate border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-10 shadow-sm transition-colors">
            <div className="section-header text-center mb-8 border-b border-slate-100 dark:border-slate-800 pb-6">
              {loading ? (
                <div className="py-12 flex flex-col items-center justify-center gap-3">
                  <div className="w-8 h-8 border-3 border-brand-red border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Loading content...</p>
                </div>
              ) : page ? (
                <>
                  <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
                    {page.PageName}
                  </h2>
                  <div className="w-16 h-1 bg-brand-red mx-auto mt-3 rounded-full"></div>
                </>
              ) : (
                <p className="text-slate-500 dark:text-slate-400 py-8">Page not found.</p>
              )}
            </div>

            {!loading && page && (
              <div
                className="page-detail prose dark:prose-invert max-w-none text-slate-700 dark:text-slate-300 text-sm sm:text-base leading-relaxed"
                style={{ textAlign: 'justify', lineHeight: '1.8' }}
                dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
              />
            )}
          </div>
        </div>
      </section>

      <Footer />

      <div id="back-top" className="back-top fixed bottom-6 right-6 z-40">
        <a
          href="#top"
          onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
          className="w-11 h-11 rounded-xl bg-brand-red hover:bg-brand-darkRed text-white flex items-center justify-center shadow-lg transition-all"
          aria-label="Back to top"
        >
          <i className="fa fa-angle-up text-lg" aria-hidden="true"></i>
        </a>
      </div>

      <LoginModal />
      <SignupModal />
      <ForgotPasswordModal />
    </div>
  );
}
