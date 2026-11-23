import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Sidebar from '../components/Sidebar';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function ProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [formData, setFormData] = useState({
    fullname: '',
    mobilenumber: '',
    dob: '',
    address: '',
    city: '',
    country: '',
  });
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('notice') === 'missing_contact') {
        setNotice('Please provide your contact number to complete your profile.');
      }
    }
  }, []);

  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await api.get('/api/users/profile');
        setProfile(res.data);
        setFormData({
          fullname: res.data.FullName || '',
          mobilenumber: res.data.ContactNo || '',
          dob: res.data.dob || '',
          address: res.data.Address || '',
          city: res.data.City || '',
          country: res.data.Country || '',
        });
      } catch (err) {
        console.error('Failed to load profile', err);
      }
    }
    fetchProfile();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMsg('');
    setLoading(true);
    try {
      const res = await api.put('/api/users/profile', formData);
      setMsg(res.data.message || 'Profile Updated Successfully');
      // Update local profile view
      setProfile((prev) => ({
        ...prev,
        FullName: formData.fullname,
        ContactNo: formData.mobilenumber,
        dob: formData.dob,
        Address: formData.address,
        City: formData.city,
        Country: formData.country,
      }));
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update profile');
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
              <h1>Your Profile</h1>
            </div>
            <ul className="coustom-breadcrumb">
              <li>
                <Link to="/">Home</Link>
              </li>
              <li>Profile</li>
            </ul>
          </div>
        </div>
        <div className="dark-overlay"></div>
      </section>

      <section className="user_profile inner_pages">
        <div className="container">
          <div className="user_profile_info gray-bg padding_4x4_40">
            <div className="upload_user_logo">
              <img src="/assets/images/user-avatar.svg" alt="image" />
            </div>
            <div className="dealer_info">
              <h5>{profile ? profile.FullName : user?.fullname}</h5>
              <p>
                {profile?.Address}
                <br />
                {profile?.City}&nbsp;{profile?.Country}
              </p>
            </div>
          </div>

          <div className="row">
            <div className="col-md-3 col-sm-3">
              <Sidebar active="profile" />
            </div>

            <div className="col-md-6 col-sm-8">
              <div className="profile_wrap">
                <h5 className="uppercase underline">GENRAL SETTINGS</h5>
                {(notice || (profile && !profile.ContactNo)) && (
                  <div className="errorWrap" style={{ padding: '10px', margin: '0 0 20px 0', background: '#fff', borderLeft: '4px solid #337ab7', boxShadow: '0 1px 1px 0 rgba(0,0,0,.1)' }}>
                    <strong>NOTICE</strong>: {notice || 'Please provide your contact number to complete your profile.'}
                  </div>
                )}
                {msg && (
                  <div className="succWrap" style={{ padding: '10px', margin: '0 0 20px 0', background: '#fff', borderLeft: '4px solid #5cb85c' }}>
                    <strong>SUCCESS</strong>:{msg}
                  </div>
                )}
                {error && (
                  <div className="errorWrap" style={{ padding: '10px', margin: '0 0 20px 0', background: '#fff', borderLeft: '4px solid #dd3d36' }}>
                    <strong>ERROR</strong>:{error}
                  </div>
                )}

                <form onSubmit={handleSubmit}>
                  <div className="form-group">
                    <label className="control-label">Reg Date -</label>
                    <span style={{ marginLeft: '8px' }}>{profile?.RegDate}</span>
                  </div>

                  {profile?.UpdationDate && (
                    <div className="form-group">
                      <label className="control-label">Last Update at -</label>
                      <span style={{ marginLeft: '8px' }}>{profile.UpdationDate}</span>
                    </div>
                  )}

                  <div className="form-group">
                    <label className="control-label">Full Name</label>
                    <input
                      className="form-control white_bg"
                      name="fullname"
                      value={formData.fullname}
                      id="fullname"
                      type="text"
                      required
                      onChange={handleChange}
                    />
                  </div>

                  <div className="form-group">
                    <label className="control-label">Email Address</label>
                    <input
                      className="form-control white_bg"
                      value={profile?.EmailId || user?.email || ''}
                      name="emailid"
                      id="email"
                      type="email"
                      required
                      readOnly
                    />
                  </div>

                  <div className="form-group">
                    <label className="control-label">Phone Number</label>
                    <input
                      className="form-control white_bg"
                      name="mobilenumber"
                      value={formData.mobilenumber}
                      id="phone-number"
                      type="text"
                      required
                      onChange={handleChange}
                    />
                  </div>

                  <div className="form-group">
                    <label className="control-label">Date of Birth&nbsp;(dd/mm/yyyy)</label>
                    <input
                      className="form-control white_bg"
                      value={formData.dob}
                      name="dob"
                      placeholder="dd/mm/yyyy"
                      id="birth-date"
                      type="text"
                      onChange={handleChange}
                    />
                  </div>

                  <div className="form-group">
                    <label className="control-label">Your Address</label>
                    <textarea
                      className="form-control white_bg"
                      name="address"
                      rows="4"
                      value={formData.address}
                      onChange={handleChange}
                    ></textarea>
                  </div>

                  <div className="form-group">
                    <label className="control-label">Country</label>
                    <input
                      className="form-control white_bg"
                      id="country"
                      name="country"
                      value={formData.country}
                      type="text"
                      onChange={handleChange}
                    />
                  </div>

                  <div className="form-group">
                    <label className="control-label">City</label>
                    <input
                      className="form-control white_bg"
                      id="city"
                      name="city"
                      value={formData.city}
                      type="text"
                      onChange={handleChange}
                    />
                  </div>

                  <div className="form-group">
                    <button type="submit" name="updateprofile" className="btn" disabled={loading}>
                      {loading ? 'Saving...' : 'Save Changes'}{' '}
                      <span className="angle_arrow">
                        <i className="fa fa-angle-right" aria-hidden="true"></i>
                      </span>
                    </button>
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
