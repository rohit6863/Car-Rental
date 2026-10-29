import React, { useState, useEffect } from 'react';
import client from '../api/client';

export default function AdminRegUsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadUsers() {
      try {
        const res = await client.get('/api/admin/users');
        setUsers(res.data);
      } catch (err) {
        setError('Failed to load registered users');
      } finally {
        setLoading(false);
      }
    }
    loadUsers();
  }, []);

  return (
    <div className="row">
      <div className="col-md-12">
        <h2 className="page-title">Registered Users</h2>

        <div className="panel panel-default">
          <div className="panel-heading">Reg Users</div>
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
              <p>Loading registered users...</p>
            ) : (
              <table id="zctb" className="display table table-striped table-bordered table-hover" cellSpacing="0" width="100%">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Contact no</th>
                    <th>DOB</th>
                    <th>Address</th>
                    <th>City</th>
                    <th>Country</th>
                    <th>Reg Date</th>
                  </tr>
                </thead>
                <tfoot>
                  <tr>
                    <th>#</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Contact no</th>
                    <th>DOB</th>
                    <th>Address</th>
                    <th>City</th>
                    <th>Country</th>
                    <th>Reg Date</th>
                  </tr>
                </tfoot>
                <tbody>
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="text-center">No registered users found</td>
                    </tr>
                  ) : (
                    users.map((u, idx) => (
                      <tr key={u.id}>
                        <td>{idx + 1}</td>
                        <td>{u.FullName}</td>
                        <td>{u.EmailId}</td>
                        <td>{u.ContactNo}</td>
                        <td>{u.dob || '-'}</td>
                        <td>{u.Address || '-'}</td>
                        <td>{u.City || '-'}</td>
                        <td>{u.Country || '-'}</td>
                        <td>{u.RegDate ? new Date(u.RegDate).toLocaleDateString() : ''}</td>
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
