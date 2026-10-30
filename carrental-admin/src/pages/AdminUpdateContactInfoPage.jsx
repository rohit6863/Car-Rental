import React, { useState, useEffect } from 'react';
import client from '../api/client';

export default function AdminUpdateContactInfoPage() {
  const [formData, setFormData] = useState({
    address: '',
    email: '',
    contactno: '',
  });
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function loadContactInfo() {
      try {
        const res = await client.get('/api/admin/contact-info');
        if (res.data) {
          setFormData({
            address: res.data.Address || '',
            email: res.data.EmailId || '',
            contactno: res.data.ContactNo || '',
          });
        }
      } catch (err) {
        setError('Failed to load contact information');
      } finally {
        setLoading(false);
      }
    }
    loadContactInfo();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMsg('');
    setSubmitting(true);

    try {
      await client.put('/api/admin/contact-info', formData);
      setMsg('Info Updateed successfully'); // legacy copy phrasing
    } catch (err) {
      if (err.response?.data?.details && Array.isArray(err.response.data.details) && err.response.data.details.length > 0) {
        setError(err.response.data.details.map((d) => d.message).join('. '));
      } else {
        setError(err.response?.data?.error || 'Failed to update contact info');
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
        <h2 className="page-title">Update Contact Info</h2>

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

                {loading ? (
                  <p>Loading contact information...</p>
                ) : (
                  <form className="form-horizontal" onSubmit={handleSubmit}>
                    <div className="form-group">
                      <label className="col-sm-4 control-label" htmlFor="address">Address</label>
                      <div className="col-sm-8">
                        <textarea
                          className="form-control"
                          name="address"
                          id="address"
                          value={formData.address}
                          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                          required
                        ></textarea>
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="col-sm-4 control-label" htmlFor="email">Email id</label>
                      <div className="col-sm-8">
                        <input
                          type="email"
                          className="form-control"
                          name="email"
                          id="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          required
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="col-sm-4 control-label" htmlFor="contactno">Contact Number</label>
                      <div className="col-sm-8">
                        <input
                          type="text"
                          className="form-control"
                          name="contactno"
                          id="contactno"
                          value={formData.contactno}
                          onChange={(e) => setFormData({ ...formData, contactno: e.target.value })}
                          required
                        />
                      </div>
                    </div>
                    <div className="hr-dashed" style={{ borderTop: '1px dashed #e4e4e4', margin: '20px 0' }}></div>

                    <div className="form-group">
                      <div className="col-sm-8 col-sm-offset-4">
                        <button className="btn btn-primary" name="submit" type="submit" disabled={submitting}>
                          {submitting ? 'Updating...' : 'Update'}
                        </button>
                      </div>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
