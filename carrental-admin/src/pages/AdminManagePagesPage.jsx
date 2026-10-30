import React, { useState, useEffect, useRef } from 'react';
import Quill from 'quill';
import 'quill/dist/quill.snow.css';
import DOMPurify from 'dompurify';
import client from '../api/client';

const PAGE_NAMES = {
  terms: 'Terms and Conditions',
  privacy: 'Privacy And Policy',
  aboutus: 'About US',
  faqs: 'FAQs',
};

export default function AdminManagePagesPage() {
  const [selectedType, setSelectedType] = useState('terms');
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const editorContainerRef = useRef(null);
  const quillInstanceRef = useRef(null);

  // Initialize Quill once
  useEffect(() => {
    if (editorContainerRef.current && !quillInstanceRef.current) {
      quillInstanceRef.current = new Quill(editorContainerRef.current, {
        theme: 'snow',
        modules: {
          toolbar: [
            [{ header: [1, 2, 3, false] }],
            ['bold', 'italic', 'underline', 'strike'],
            [{ list: 'ordered' }, { list: 'bullet' }],
            ['link', 'clean'],
          ],
        },
      });
    }
  }, []);

  // Fetch page detail whenever selectedType changes
  useEffect(() => {
    async function fetchPage() {
      if (!selectedType) return;
      setLoading(true);
      setError('');
      try {
        const res = await client.get('/api/admin/pages');
        const found = res.data.find((p) => p.type === selectedType);
        if (quillInstanceRef.current) {
          quillInstanceRef.current.root.innerHTML = DOMPurify.sanitize(found?.detail || '');
        }
      } catch (err) {
        setError('Failed to load page content');
      } finally {
        setLoading(false);
      }
    }
    fetchPage();
  }, [selectedType]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMsg('');

    if (!selectedType) {
      setError('Please select a page');
      return;
    }

    const rawDetail = quillInstanceRef.current ? quillInstanceRef.current.root.innerHTML : '';
    const detail = DOMPurify.sanitize(rawDetail);

    setSubmitting(true);
    try {
      await client.put(`/api/admin/pages/${selectedType}`, { detail });
      setMsg('Page data updated  successfully'); // legacy phrasing
    } catch (err) {
      if (err.response?.data?.details && Array.isArray(err.response.data.details) && err.response.data.details.length > 0) {
        setError(err.response.data.details.map((d) => d.message).join('. '));
      } else {
        setError(err.response?.data?.error || 'Failed to update page data');
      }
    } finally {
      setSubmitting(false);
      if (typeof window !== 'undefined' && window.scrollTo) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  return (
    <div className="row">
      <div className="col-md-12">
        <h2 className="page-title">Manage Pages</h2>

        <div className="row">
          <div className="col-md-10">
            <div className="panel panel-default">
              <div className="panel-heading">Form fields</div>
              <div className="panel-body">
                {error && (
                  <div className="errorWrap" style={{
                    padding: '10px',
                    margin: '0 0 20px 0',
                    background: '#fff',
                    borderLeft: '4px solid #dd3d36',
                    boxShadow: '0 1px 1px 0 rgba(0,0,0,.1)'
                  }}>
                    <strong>ERROR</strong>: {error}
                  </div>
                )}
                {msg && (
                  <div className="succWrap" style={{
                    padding: '10px',
                    margin: '0 0 20px 0',
                    background: '#fff',
                    borderLeft: '4px solid #5cb85c',
                    boxShadow: '0 1px 1px 0 rgba(0,0,0,.1)'
                  }}>
                    <strong>SUCCESS</strong>: {msg}
                  </div>
                )}

                <form className="form-horizontal" onSubmit={handleSubmit}>
                  <div className="form-group">
                    <label className="col-sm-4 control-label" htmlFor="menu1">select Page</label>
                    <div className="col-sm-8">
                      <select
                        id="menu1"
                        name="menu1"
                        className="form-control"
                        value={selectedType}
                        onChange={(e) => setSelectedType(e.target.value)}
                      >
                        <option value="">***Select One***</option>
                        <option value="terms">terms and condition</option>
                        <option value="privacy">privacy and policy</option>
                        <option value="aboutus">aboutus</option>
                        <option value="faqs">FAQs</option>
                      </select>
                    </div>
                  </div>
                  <div className="hr-dashed" style={{ borderTop: '1px dashed #e4e4e4', margin: '20px 0' }}></div>

                  <div className="form-group">
                    <label className="col-sm-4 control-label">selected Page</label>
                    <div className="col-sm-8" style={{ paddingTop: '7px', fontWeight: 'bold' }}>
                      {PAGE_NAMES[selectedType] || ''}
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="col-sm-4 control-label">Page Details</label>
                    <div className="col-sm-8">
                      {loading ? (
                        <p>Loading editor...</p>
                      ) : null}
                      <div
                        ref={editorContainerRef}
                        style={{ minHeight: '220px', background: '#fff' }}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <div className="col-sm-8 col-sm-offset-4">
                      <button
                        type="submit"
                        name="submit"
                        value="Update"
                        id="submit"
                        className="btn-primary btn"
                        disabled={submitting}
                      >
                        {submitting ? 'Updating...' : 'Update'}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
