import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import client from '../api/client';

export default function AdminManageBrandsPage() {
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  const loadBrands = async () => {
    try {
      const res = await client.get('/api/admin/brands');
      setBrands(res.data);
    } catch (err) {
      setError('Failed to load brands');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBrands();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Do you want to delete')) return;
    setError('');
    setMsg('');
    try {
      await client.delete(`/api/admin/brands/${id}`);
      setMsg('Brand deleted successfully');
    } catch (err) {
      const errorMsg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        'Failed to delete brand';
      setError(errorMsg);
    } finally {
      await loadBrands();
      if (typeof window !== 'undefined' && window.scrollTo) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  return (
    <div className="row">
      <div className="col-md-12">
        <h2 className="page-title">Manage Brands</h2>

        <div className="panel panel-default">
          <div className="panel-heading">Listed Brands</div>
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
              <p>Loading brands...</p>
            ) : (
              <table id="zctb" className="display table table-striped table-bordered table-hover" cellSpacing="0" width="100%">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Brand Name</th>
                    <th>Creation Date</th>
                    <th>Updation date</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tfoot>
                  <tr>
                    <th>#</th>
                    <th>Brand Name</th>
                    <th>Creation Date</th>
                    <th>Updation date</th>
                    <th>Action</th>
                  </tr>
                </tfoot>
                <tbody>
                  {brands.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="text-center">No brands found</td>
                    </tr>
                  ) : (
                    brands.map((b, idx) => (
                      <tr key={b.id}>
                        <td>{idx + 1}</td>
                        <td>{b.BrandName}</td>
                        <td>{b.CreationDate ? new Date(b.CreationDate).toLocaleString() : ''}</td>
                        <td>{b.UpdationDate ? new Date(b.UpdationDate).toLocaleString() : ''}</td>
                        <td>
                          <Link to={`/edit-brand/${b.id}`} title="Edit">
                            <i className="fa fa-edit"></i>
                          </Link>
                          &nbsp;&nbsp;
                          <a
                            href="#delete"
                            title="Delete"
                            onClick={(e) => {
                              e.preventDefault();
                              handleDelete(b.id);
                            }}
                            style={{ color: '#dd3d36' }}
                          >
                            <i className="fa fa-close"></i>
                          </a>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
