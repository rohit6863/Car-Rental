import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import client from '../api/client';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({
    regUsers: 0,
    listedVehicles: 0,
    totalBookings: 0,
    listedBrands: 0,
    subscribers: 0,
    queries: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadStats() {
      try {
        const res = await client.get('/api/admin/stats');
        setStats(res.data);
      } catch (err) {
        setError('Failed to load dashboard statistics');
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  return (
    <div className="row">
      <div className="col-md-12">
        <h2 className="page-title">Dashboard</h2>

        {error && <div className="alert alert-danger">{error}</div>}

        <div className="row">
          <div className="col-md-12">
            <div className="row">
              {/* Reg Users */}
              <div className="col-md-3">
                <div className="panel panel-default">
                  <div className="panel-body bk-primary text-light">
                    <div className="stat-panel text-center">
                      <div className="stat-panel-number h1">
                        {loading ? '...' : stats.regUsers}
                      </div>
                      <div className="stat-panel-title text-uppercase">Reg Users</div>
                    </div>
                  </div>
                  <Link to="/reg-users" className="block-anchor panel-footer">
                    Full Detail <i className="fa fa-arrow-right"></i>
                  </Link>
                </div>
              </div>

              {/* Listed Vehicles */}
              <div className="col-md-3">
                <div className="panel panel-default">
                  <div className="panel-body bk-success text-light">
                    <div className="stat-panel text-center">
                      <div className="stat-panel-number h1">
                        {loading ? '...' : stats.listedVehicles}
                      </div>
                      <div className="stat-panel-title text-uppercase">Listed Vehicles</div>
                    </div>
                  </div>
                  <Link to="/manage-vehicles" className="block-anchor panel-footer text-center">
                    Full Detail &nbsp; <i className="fa fa-arrow-right"></i>
                  </Link>
                </div>
              </div>

              {/* Total Bookings */}
              <div className="col-md-3">
                <div className="panel panel-default">
                  <div className="panel-body bk-info text-light">
                    <div className="stat-panel text-center">
                      <div className="stat-panel-number h1">
                        {loading ? '...' : stats.totalBookings}
                      </div>
                      <div className="stat-panel-title text-uppercase">Total Bookings</div>
                    </div>
                  </div>
                  <Link to="/manage-bookings" className="block-anchor panel-footer text-center">
                    Full Detail &nbsp; <i className="fa fa-arrow-right"></i>
                  </Link>
                </div>
              </div>

              {/* Listed Brands */}
              <div className="col-md-3">
                <div className="panel panel-default">
                  <div className="panel-body bk-warning text-light">
                    <div className="stat-panel text-center">
                      <div className="stat-panel-number h1">
                        {loading ? '...' : stats.listedBrands}
                      </div>
                      <div className="stat-panel-title text-uppercase">Listed Brands</div>
                    </div>
                  </div>
                  <Link to="/manage-brands" className="block-anchor panel-footer text-center">
                    Full Detail &nbsp; <i className="fa fa-arrow-right"></i>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="row" style={{ marginTop: '20px' }}>
          <div className="col-md-12">
            <div className="row">
              {/* Subscribers */}
              <div className="col-md-3">
                <div className="panel panel-default">
                  <div className="panel-body bk-primary text-light">
                    <div className="stat-panel text-center">
                      <div className="stat-panel-number h1">
                        {loading ? '...' : stats.subscribers}
                      </div>
                      <div className="stat-panel-title text-uppercase">Subscibers</div>
                    </div>
                  </div>
                  <Link to="/manage-subscribers" className="block-anchor panel-footer">
                    Full Detail <i className="fa fa-arrow-right"></i>
                  </Link>
                </div>
              </div>

              {/* Queries */}
              <div className="col-md-3">
                <div className="panel panel-default">
                  <div className="panel-body bk-success text-light">
                    <div className="stat-panel text-center">
                      <div className="stat-panel-number h1">
                        {loading ? '...' : stats.queries}
                      </div>
                      <div className="stat-panel-title text-uppercase">Queries</div>
                    </div>
                  </div>
                  <Link to="/manage-contactusquery" className="block-anchor panel-footer text-center">
                    Full Detail &nbsp; <i className="fa fa-arrow-right"></i>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
