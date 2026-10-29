import React, { useState, useEffect } from 'react';
import client from '../api/client';

export default function AdminManageSubscribersPage() {
  const [subscribers, setSubscribers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadSubscribers() {
      try {
        const res = await client.get('/api/admin/subscribers');
        setSubscribers(res.data);
      } catch (err) {
        setError('Failed to load subscribers');
      } finally {
        setLoading(false);
      }
    }
    loadSubscribers();
  }, []);

  return (
    <div className="row">
      <div className="col-md-12">
        <h2 className="page-title">Manage Subscribers</h2>

        <div className="panel panel-default">
          <div className="panel-heading">Subscribers Details</div>
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

            {loading ? (
              <p>Loading subscribers...</p>
            ) : (
              <table id="zctb" className="display table table-striped table-bordered table-hover" cellSpacing="0" width="100%">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Email Id</th>
                    <th>Subscription Date</th>
                  </tr>
                </thead>
                <tfoot>
                  <tr>
                    <th>#</th>
                    <th>Email Id</th>
                    <th>Subscription Date</th>
                  </tr>
                </tfoot>
                <tbody>
                  {subscribers.length === 0 ? (
                    <tr>
                      <td colSpan="3" className="text-center">No subscribers found</td>
                    </tr>
                  ) : (
                    subscribers.map((s, idx) => (
                      <tr key={s.id}>
                        <td>{idx + 1}</td>
                        <td>{s.SubscriberEmail}</td>
                        <td>{s.PostingDate ? new Date(s.PostingDate).toLocaleString() : ''}</td>
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
