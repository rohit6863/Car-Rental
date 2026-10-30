import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import client from '../api/client';

export default function AdminEditBrandPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [brand, setBrand] = useState('');
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function loadBrand() {
      try {
        const res = await client.get('/api/admin/brands');
        const found = res.data.find((b) => String(b.id) === String(id));
        if (found) {
          setBrand(found.BrandName);
        } else {
          setError('Brand not found');
        }
      } catch (err) {
        setError('Failed to fetch brand details');
      } finally {
        setLoading(false);
      }
    }
    loadBrand();
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMsg('');
    setSubmitting(true);

    try {
      await client.put(`/api/admin/brands/${id}`, { brand });
      setMsg('Brand updted successfully'); // note: legacy copy spelling
      setTimeout(() => {
        navigate('/manage-brands');
      }, 1200);
    } catch (err) {
      if (err.response?.data?.details && Array.isArray(err.response.data.details) && err.response.data.details.length > 0) {
        setError(err.response.data.details.map((d) => d.message).join('. '));
      } else {
        setError(err.response?.data?.error || 'Failed to update brand');
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

                {loading ? (
                  <p>Loading brand data...</p>
                ) : (
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
                          {submitting ? 'Updating...' : 'Submit'}
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
