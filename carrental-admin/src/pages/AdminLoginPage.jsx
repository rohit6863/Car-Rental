import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function AdminLoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await login(username, password);
      if (data.mustChangePassword) {
        navigate('/change-password', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid Details');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="login-page bk-img"
      style={{
        backgroundImage: 'url(/img/adminlogin.jpg)',
        minHeight: '100vh',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        paddingTop: '60px',
      }}
    >
      <div className="form-content">
        <div className="container">
          <div className="row">
            <div className="col-md-6 col-md-offset-3">
              <h1 className="text-center text-bold text-light mt-4x" style={{ color: '#fff', marginBottom: '30px' }}>
                Sign in
              </h1>
              <div className="well row pt-2x pb-3x bk-light">
                <div className="col-md-8 col-md-offset-2">
                  {error && (
                    <div className="alert alert-danger" style={{ marginBottom: '15px' }}>
                      {error}
                    </div>
                  )}

                  <form onSubmit={handleSubmit}>
                    <label htmlFor="username" className="text-uppercase text-sm">
                      Your Username
                    </label>
                    <input
                      id="username"
                      type="text"
                      placeholder="Username"
                      name="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="form-control mb"
                      style={{ marginBottom: '15px' }}
                      required
                    />

                    <label htmlFor="password" className="text-uppercase text-sm">
                      Password
                    </label>
                    <input
                      id="password"
                      type="password"
                      placeholder="Password"
                      name="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="form-control mb"
                      style={{ marginBottom: '20px' }}
                      required
                    />

                    <button
                      className="btn btn-primary btn-block"
                      name="login"
                      type="submit"
                      disabled={loading}
                    >
                      {loading ? 'LOGGING IN...' : 'LOGIN'}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
