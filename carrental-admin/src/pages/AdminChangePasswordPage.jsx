import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function AdminChangePasswordPage() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { changePassword, mustChangePassword } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMsg('');

    if (newPassword !== confirmPassword) {
      setError('New Password and Confirm Password Field do not match  !!');
      return;
    }

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters long');
      return;
    }

    setSubmitting(true);
    try {
      await changePassword(currentPassword, newPassword);
      setMsg('Your Password succesfully changed');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err.response?.data?.error || 'Your current password is not valid.');
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
        <h2 className="page-title">Change Password</h2>

        {mustChangePassword && (
          <div className="alert alert-warning">
            <strong>Security Notice:</strong> You must change the default password before proceeding.
          </div>
        )}

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
                    <label className="col-sm-4 control-label">Current Password</label>
                    <div className="col-sm-8">
                      <input
                        type="password"
                        className="form-control"
                        name="password"
                        id="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div className="hr-dashed" style={{ borderTop: '1px dashed #e4e4e4', margin: '20px 0' }}></div>

                  <div className="form-group">
                    <label className="col-sm-4 control-label">New Password</label>
                    <div className="col-sm-8">
                      <input
                        type="password"
                        className="form-control"
                        name="newpassword"
                        id="newpassword"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div className="hr-dashed" style={{ borderTop: '1px dashed #e4e4e4', margin: '20px 0' }}></div>

                  <div className="form-group">
                    <label className="col-sm-4 control-label">Confirm Password</label>
                    <div className="col-sm-8">
                      <input
                        type="password"
                        className="form-control"
                        name="confirmpassword"
                        id="confirmpassword"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div className="hr-dashed" style={{ borderTop: '1px dashed #e4e4e4', margin: '20px 0' }}></div>

                  <div className="form-group">
                    <div className="col-sm-8 col-sm-offset-4">
                      <button className="btn btn-primary" name="submit" type="submit" disabled={submitting}>
                        {submitting ? 'Saving...' : 'Save changes'}
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
