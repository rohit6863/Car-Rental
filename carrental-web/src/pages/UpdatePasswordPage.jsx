import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Sidebar from '../components/Sidebar';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function UpdatePasswordPage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [password, setPassword] = useState('');
  const [newpassword, setNewpassword] = useState('');
  const [confirmpassword, setConfirmpassword] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await api.get('/api/users/profile');
        setProfile(res.data);
      } catch (err) {
        console.error('Failed to load profile', err);
      }
    }
    loadProfile();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMsg('');

    if (newpassword !== confirmpassword) {
      alert('New Password and Confirm Password Field do not match !!');
      return;
    }

    setLoading(true);
    try {
      const res = await api.put('/api/users/password', {
        password,
        newpassword,
        confirmpassword,
      });
      setMsg(res.data.message || 'Your Password succesfully changed');
      setPassword('');
      setNewpassword('');
      setConfirmpassword('');
    } catch (err) {
      setError(err.response?.data?.error || 'Your current password is wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Header />

      <section className="page-header profile_page">
        <div className="container">
          <div className="page-header_wrap">
            <div className="page-heading">
              <h1>Update Password</h1>
            </div>
            <ul className="coustom-breadcrumb">
              <li>
                <Link to="/">Home</Link>
              </li>
              <li>Update Password</li>
            </ul>
          </div>
        </div>
        <div className="dark-overlay"></div>
      </section>

      <section className="user_profile inner_pages">
        <div className="container">
          <div className="user_profile_info gray-bg padding_4x4_40">
            <div className="upload_user_logo">
              <img src="/assets/images/dealer-logo.jpg" alt="image" />
            </div>
            <div className="dealer_info">
              <h5>{profile?.FullName || user?.fullname}</h5>
              <p>
                {profile?.Address}
                <br />
                {profile?.City}&nbsp;{profile?.Country}
              </p>
            </div>
          </div>

          <div className="row">
            <div className="col-md-3 col-sm-3">
              <Sidebar active="password" />
            </div>

            <div className="col-md-6 col-sm-8">
              <div className="profile_wrap">
                <form name="chngpwd" onSubmit={handleSubmit}>
                  <div className="gray-bg field-title" style={{ padding: '10px 15px', marginBottom: '20px' }}>
                    <h6>Update password</h6>
                  </div>

                  {error && (
                    <div className="errorWrap" style={{ padding: '10px', margin: '0 0 20px 0', background: '#fff', borderLeft: '4px solid #dd3d36' }}>
                      <strong>ERROR</strong>:{error}
                    </div>
                  )}
                  {msg && (
                    <div className="succWrap" style={{ padding: '10px', margin: '0 0 20px 0', background: '#fff', borderLeft: '4px solid #5cb85c' }}>
                      <strong>SUCCESS</strong>:{msg}
                    </div>
                  )}

                  <div className="form-group">
                    <label className="control-label">Current Password</label>
                    <input
                      className="form-control white_bg"
                      id="password"
                      name="password"
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="control-label">Password</label>
                    <input
                      className="form-control white_bg"
                      id="newpassword"
                      type="password"
                      name="newpassword"
                      required
                      value={newpassword}
                      onChange={(e) => setNewpassword(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="control-label">Confirm Password</label>
                    <input
                      className="form-control white_bg"
                      id="confirmpassword"
                      type="password"
                      name="confirmpassword"
                      required
                      value={confirmpassword}
                      onChange={(e) => setConfirmpassword(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <input
                      type="submit"
                      value={loading ? 'Updating...' : 'Update'}
                      name="update"
                      id="submit"
                      className="btn btn-block"
                      disabled={loading}
                    />
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
