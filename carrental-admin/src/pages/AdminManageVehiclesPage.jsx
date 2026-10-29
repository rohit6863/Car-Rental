import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import client from '../api/client';

export default function AdminManageVehiclesPage() {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  const loadVehicles = async () => {
    try {
      const res = await client.get('/api/admin/vehicles');
      setVehicles(res.data);
    } catch (err) {
      setError('Failed to load vehicles');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVehicles();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Permanently delete this vehicle?')) return;
    setError('');
    setMsg('');
    try {
      await client.delete(`/api/admin/vehicles/${id}`);
      setMsg('Vehicle and related bookings deleted successfully');
    } catch (err) {
      const errorMsg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        'Deletion failed';
      setError(errorMsg);
    } finally {
      await loadVehicles();
      if (typeof window !== 'undefined' && window.scrollTo) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  return (
    <div className="row">
      <div className="col-md-12">
        <h2 className="page-title">Manage Vehicles</h2>

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

        <div className="panel panel-default">
          <div className="panel-heading clearfix">
            <span>All Vehicles</span>
            <Link to="/post-vehicle" className="btn btn-primary btn-xs pull-right">
              <i className="fa fa-plus"></i> Add New Vehicle
            </Link>
          </div>
          <div className="panel-body">
            {loading ? (
              <p>Loading vehicles...</p>
            ) : (
              <table id="vehicleTable" className="table table-striped table-bordered table-hover" width="100%">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Vehicle</th>
                    <th>Brand</th>
                    <th>Price/Day</th>
                    <th>Fuel Type</th>
                    <th>Year</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {vehicles.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="text-center">No vehicles found</td>
                    </tr>
                  ) : (
                    vehicles.map((v, idx) => (
                      <tr key={v.id}>
                        <td>{idx + 1}</td>
                        <td>{v.VehiclesTitle}</td>
                        <td>{v.BrandName}</td>
                        <td>Rs. {v.PricePerDay}</td>
                        <td>{v.FuelType}</td>
                        <td>{v.ModelYear}</td>
                        <td>
                          <span
                            className="status-label"
                            style={{
                              padding: '3px 8px',
                              borderRadius: '4px',
                              fontSize: '12px',
                              fontWeight: 'bold',
                              color: 'white',
                              backgroundColor: v.vehicle_status === 'Available' ? '#5cb85c' : '#d9534f',
                            }}
                          >
                            {v.vehicle_status || 'Available'}
                          </span>
                        </td>
                        <td className="action-links">
                          <Link to={`/edit-vehicle/${v.id}`} className="text-primary" title="Edit">
                            <i className="fa fa-edit"></i>
                          </Link>
                          &nbsp;&nbsp;
                          <a
                            href="#delete"
                            className="text-danger"
                            title="Delete"
                            onClick={(e) => {
                              e.preventDefault();
                              handleDelete(v.id);
                            }}
                            style={{ color: '#d9534f' }}
                          >
                            <i className="fa fa-trash"></i>
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
