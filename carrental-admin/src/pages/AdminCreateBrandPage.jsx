import React, { useState } from 'react';
import client from '../api/client';

export default function AdminCreateBrandPage() {
  const [brand, setBrand] = useState('');
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMsg('');
    setSubmitting(true);

    try {
      await client.post('/api/admin/brands', { brand });
      setMsg('Brand Created successfully');
      setBrand('');
    } catch (err) {
      if (err.response?.data?.details && Array.isArray(err.response.data.details) && err.response.data.details.length > 0) {
        setError(err.response.data.details.map((d) => d.message).join('. '));
      } else {
        setError(err.response?.data?.error || 'Something went wrong. Please try again');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="row">
      <div className="col-md-12">
        <h2 className="page-title">Create Brand</h2>

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
                    <label className="col-sm-4 control-label" htmlFor="brand">Brand Name</label>
                    <div className="col-sm-8">
                      <input
                        type="text"
                        className="form-control"
                        name="brand"
                        id="brand"
                        value={brand}
                        onChange={(e) => setBrand(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div className="hr-dashed" style={{ borderTop: '1px dashed #e4e4e4', margin: '20px 0' }}></div>

                  <div className="form-group">
                    <div className="col-sm-8 col-sm-offset-4">
                      <button className="btn btn-primary" name="submit" type="submit" disabled={submitting}>
                        {submitting ? 'Submitting...' : 'Submit'}
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
