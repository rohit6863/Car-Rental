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
    <>
      <Header />

      <section className="page-header aboutus_page">
        <div className="container">
          <div className="page-header_wrap">
            <div className="page-heading">
              <h1>{page ? page.PageName : 'Page Details'}</h1>
            </div>
            <ul className="coustom-breadcrumb">
              <li>
                <Link to="/">Home</Link>
              </li>
              <li>{page ? page.PageName : ''}</li>
            </ul>
          </div>
        </div>
        <div className="dark-overlay"></div>
      </section>

      <section className="about_us section-padding">
        <div className="container">
          <div className="section-header text-center">
            {loading ? (
              <p>Loading content...</p>
            ) : page ? (
              <>
                <h2>{page.PageName}</h2>
                <div
                  className="page-detail"
                  style={{ textAlign: 'justify', lineHeight: '1.8' }}
                  dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
                />
              </>
            ) : (
              <p>Page not found.</p>
            )}
          </div>
        </div>
      </section>

      <Footer />

      <div id="back-top" className="back-top">
        <a href="#top" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
          <i className="fa fa-angle-up" aria-hidden="true"></i>
        </a>
      </div>

      <LoginModal />
      <SignupModal />
      <ForgotPasswordModal />
    </>
  );
}
