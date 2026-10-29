import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import client, { getVehicleImageUrl } from '../api/client';

export default function AdminChangeImagePage({ fixedNum }) {
  const { id: paramId, num: paramNum } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const id = paramId || searchParams.get('imgid');
  const num = fixedNum || paramNum || 1;

  const [currentImage, setCurrentImage] = useState('');
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function loadVehicle() {
      if (!id) return;
      try {
        const res = await client.get(`/api/vehicles/${id}`);
        const key = `Vimage${num}`;
        setCurrentImage(res.data[key] || '');
      } catch (err) {
        setError('Failed to load vehicle image');
      } finally {
        setLoading(false);
      }
    }
    loadVehicle();
  }, [id, num]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMsg('');

    if (!file) {
      setError('Please choose an image file to upload');
      return;
    }

    setSubmitting(true);
    try {
      const data = new FormData();
      data.append('img', file);

      const res = await client.put(`/api/admin/vehicles/${id}/image/${num}`, data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setMsg('Image updated successfully');
      setCurrentImage(res.data.filename);
      setFile(null);
      setTimeout(() => {
        navigate(`/edit-vehicle/${id}`);
      }, 1200);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update image');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="row">
      <div className="col-md-12">
        <h2 className="page-title">Vehicle Image {num}</h2>

        <div className="row">
          <div className="col-md-10">
            <div className="panel panel-default">
              <div className="panel-heading">Vehicle Image {num} Details</div>
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
                  <p>Loading image...</p>
                ) : (
                  <form className="form-horizontal" onSubmit={handleSubmit}>
                    <div className="form-group">
                      <label className="col-sm-4 control-label">Current Image {num}</label>
                      <div className="col-sm-8">
                        {currentImage ? (
                          <img
                            src={getVehicleImageUrl(currentImage)}
                            width="300"
                            height="200"
                            style={{ border: 'solid 1px #000', objectFit: 'cover' }}
                            alt={`Image ${num}`}
                          />
                        ) : (
                          <p>No current image</p>
                        )}
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="col-sm-4 control-label">
                        Upload New Image {num} <span style={{ color: 'red' }}>*</span>
                      </label>
                      <div className="col-sm-8">
                        <input
                          type="file"
                          name="img"
                          onChange={(e) => setFile(e.target.files?.[0] || null)}
                          required
                        />
                      </div>
                    </div>
                    <div className="hr-dashed" style={{ borderTop: '1px dashed #e4e4e4', margin: '20px 0' }}></div>

                    <div className="form-group">
                      <div className="col-sm-8 col-sm-offset-4">
                        <Link to={`/edit-vehicle/${id}`} className="btn btn-default">
                          Back to Vehicle
                        </Link>
                        &nbsp;
                        <button className="btn btn-primary" name="update" type="submit" disabled={submitting}>
                          {submitting ? 'Updating...' : 'Update'}
                        </button>
                      </div>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
