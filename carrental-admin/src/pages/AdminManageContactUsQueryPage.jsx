import React, { useState, useEffect } from 'react';
import client from '../api/client';

export default function AdminManageContactUsQueryPage() {
  const [queries, setQueries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  const loadQueries = async () => {
    try {
      const res = await client.get('/api/admin/queries');
      setQueries(res.data);
    } catch (err) {
      setError('Failed to load queries');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQueries();
  }, []);

  const handleMarkRead = async (id) => {
    if (!window.confirm('Do you really want to read')) return;
    setError('');
    setMsg('');
    try {
      await client.patch(`/api/admin/queries/${id}/read`);
      setMsg('Testimonial Successfully Inacrive'); // legacy copy phrasing
    } catch (err) {
      const errorMsg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        'Failed to update query status';
      setError(errorMsg);
    } finally {
      await loadQueries();
      if (typeof window !== 'undefined' && window.scrollTo) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  return (
    <div className="row">
      <div className="col-md-12">
        <h2 className="page-title">Manage Contact Us Queries</h2>

        <div className="panel panel-default">
          <div className="panel-heading">User queries</div>
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
              <p>Loading queries...</p>
            ) : (
              <table id="zctb" className="display table table-striped table-bordered table-hover" cellSpacing="0" width="100%">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Contact No</th>
                    <th>Message</th>
                    <th>Posting date</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tfoot>
                  <tr>
                    <th>#</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Contact No</th>
                    <th>Message</th>
                    <th>Posting date</th>
                    <th>Action</th>
                  </tr>
                </tfoot>
                <tbody>
                  {queries.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="text-center">No queries found</td>
                    </tr>
                  ) : (
                    queries.map((q, idx) => (
                      <tr key={q.id}>
                        <td>{idx + 1}</td>
                        <td>{q.name}</td>
                        <td>{q.EmailId}</td>
                        <td>{q.ContactNumber}</td>
                        <td>{q.Message}</td>
                        <td>{q.PostingDate ? new Date(q.PostingDate).toLocaleString() : ''}</td>
                        <td>
                          {q.status === 1 ? (
                            <span>Read</span>
                          ) : (
                            <a
                              href="#mark-read"
                              onClick={(e) => {
                                e.preventDefault();
                                handleMarkRead(q.id);
                              }}
                            >
                              Pending
                            </a>
                          )}
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
