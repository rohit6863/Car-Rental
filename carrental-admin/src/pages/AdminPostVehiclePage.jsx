import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';

export default function AdminPostVehiclePage() {
  const navigate = useNavigate();

  const [brands, setBrands] = useState([]);
  const [formData, setFormData] = useState({
    vehicletitle: '',
    brandname: '',
    vehicalorcview: '',
    priceperday: '',
    fueltype: '',
    modelyear: '',
    seatingcapacity: '',
    airconditioner: 0,
    powerdoorlocks: 0,
    antilockbrakingsys: 0,
    brakeassist: 0,
    powersteering: 0,
    driverairbag: 0,
    passengerairbag: 0,
    powerwindow: 0,
    cdplayer: 0,
    centrallocking: 0,
    crashcensor: 0,
    leatherseats: 0,
  });

  const [files, setFiles] = useState({
    img1: null,
    img2: null,
    img3: null,
    img4: null,
    img5: null,
  });

  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function loadBrands() {
      try {
        const res = await client.get('/api/admin/brands');
        setBrands(res.data);
      } catch (err) {
        console.error('Failed to load brands:', err);
      }
    }
    loadBrands();
  }, []);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === 'checkbox') {
      setFormData((prev) => ({ ...prev, [name]: checked ? 1 : 0 }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleFileChange = (e) => {
    const { name, files: selectedFiles } = e.target;
    if (selectedFiles && selectedFiles[0]) {
      setFiles((prev) => ({ ...prev, [name]: selectedFiles[0] }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMsg('');

    if (!files.img1 || !files.img2) {
      setError('Image 1 and Image 2 are required');
      return;
    }

    setSubmitting(true);
    try {
      const data = new FormData();
      Object.keys(formData).forEach((key) => {
        data.append(key, formData[key]);
      });
      if (files.img1) data.append('img1', files.img1);
      if (files.img2) data.append('img2', files.img2);
      if (files.img3) data.append('img3', files.img3);
      if (files.img4) data.append('img4', files.img4);
      if (files.img5) data.append('img5', files.img5);

      await client.post('/api/admin/vehicles', data);

      setMsg('Vehicle posted successfully');
      setTimeout(() => {
        navigate('/manage-vehicles');
      }, 1200);
    } catch (err) {
      if (err.response?.data?.details && Array.isArray(err.response.data.details) && err.response.data.details.length > 0) {
        setError(err.response.data.details.map((d) => d.message).join('. '));
      } else {
        setError(err.response?.data?.error || 'Something went wrong. Please try again');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="row">
      <div className="col-md-12">
        <h2 className="page-title">Post A Vehicle</h2>

        <div className="row">
          <div className="col-md-12">
            <div className="panel panel-default">
              <div className="panel-heading">Basic Info</div>

              {error && (
                <div className="errorWrap" style={{
                  padding: '10px',
                  margin: '20px',
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
                  margin: '20px',
                  background: '#fff',
                  borderLeft: '4px solid #5cb85c',
                  boxShadow: '0 1px 1px 0 rgba(0,0,0,.1)'
                }}>
                  <strong>SUCCESS</strong>: {msg}
                </div>
              )}

              <div className="panel-body">
                <form className="form-horizontal" onSubmit={handleSubmit} noValidate>
                  <div className="form-group">
                    <label className="col-sm-2 control-label">
                      Vehicle Title<span style={{ color: 'red' }}>*</span>
                    </label>
                    <div className="col-sm-4">
                      <input
                        type="text"
                        name="vehicletitle"
                        className="form-control"
                        value={formData.vehicletitle}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <label className="col-sm-2 control-label">
                      Select Brand<span style={{ color: 'red' }}>*</span>
                    </label>
                    <div className="col-sm-4">
                      <select
                        className="form-control"
                        name="brandname"
                        value={formData.brandname}
                        onChange={handleInputChange}
                        required
                      >
                        <option value=""> Select </option>
                        {brands.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.BrandName}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="hr-dashed" style={{ borderTop: '1px dashed #e4e4e4', margin: '20px 0' }}></div>

                  <div className="form-group">
                    <label className="col-sm-2 control-label">
                      Vehical Overview<span style={{ color: 'red' }}>*</span>
                    </label>
                    <div className="col-sm-10">
                      <textarea
                        className="form-control"
                        name="vehicalorcview"
                        rows="3"
                        value={formData.vehicalorcview}
                        onChange={handleInputChange}
                        required
                      ></textarea>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="col-sm-2 control-label">
                      Price Per Day(in Rs.)<span style={{ color: 'red' }}>*</span>
                    </label>
                    <div className="col-sm-4">
                      <input
                        type="number"
                        name="priceperday"
                        className="form-control"
                        value={formData.priceperday}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <label className="col-sm-2 control-label">
                      Select Fuel Type<span style={{ color: 'red' }}>*</span>
                    </label>
                    <div className="col-sm-4">
                      <select
                        className="form-control"
                        name="fueltype"
                        value={formData.fueltype}
                        onChange={handleInputChange}
                        required
                      >
                        <option value=""> Select </option>
                        <option value="Petrol">Petrol</option>
                        <option value="Diesel">Diesel</option>
                        <option value="CNG">CNG</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="col-sm-2 control-label">
                      Model Year<span style={{ color: 'red' }}>*</span>
                    </label>
                    <div className="col-sm-4">
                      <input
                        type="number"
                        name="modelyear"
                        className="form-control"
                        value={formData.modelyear}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <label className="col-sm-2 control-label">
                      Seating Capacity<span style={{ color: 'red' }}>*</span>
                    </label>
                    <div className="col-sm-4">
                      <input
                        type="number"
                        name="seatingcapacity"
                        className="form-control"
                        value={formData.seatingcapacity}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                  </div>

                  <div className="hr-dashed" style={{ borderTop: '1px dashed #e4e4e4', margin: '20px 0' }}></div>

                  <div className="form-group">
                    <div className="col-sm-12">
                      <h4><b>Upload Images</b></h4>
                    </div>
                  </div>

                  <div className="form-group">
                    <div className="col-sm-4">
                      Image 1 <span style={{ color: 'red' }}>*</span>
                      <input type="file" name="img1" onChange={handleFileChange} required />
                    </div>
                    <div className="col-sm-4">
                      Image 2 <span style={{ color: 'red' }}>*</span>
                      <input type="file" name="img2" onChange={handleFileChange} required />
                    </div>
                    <div className="col-sm-4">
                      Image 3
                      <input type="file" name="img3" onChange={handleFileChange} />
                    </div>
                  </div>

                  <div className="form-group">
                    <div className="col-sm-4">
                      Image 4
                      <input type="file" name="img4" onChange={handleFileChange} />
                    </div>
                    <div className="col-sm-4">
                      Image 5
                      <input type="file" name="img5" onChange={handleFileChange} />
                    </div>
                  </div>

                  <div className="hr-dashed" style={{ borderTop: '1px dashed #e4e4e4', margin: '20px 0' }}></div>

                  <div className="row">
                    <div className="col-md-12">
                      <div className="panel panel-default">
                        <div className="panel-heading">Accessories</div>
                        <div className="panel-body">
                          <div className="form-group">
                            <div className="col-sm-3">
                              <div className="checkbox checkbox-inline">
                                <input
                                  type="checkbox"
                                  id="airconditioner"
                                  name="airconditioner"
                                  checked={formData.airconditioner === 1}
                                  onChange={handleInputChange}
                                />
                                <label htmlFor="airconditioner"> Air Conditioner </label>
                              </div>
                            </div>
                            <div className="col-sm-3">
                              <div className="checkbox checkbox-inline">
                                <input
                                  type="checkbox"
                                  id="powerdoorlocks"
                                  name="powerdoorlocks"
                                  checked={formData.powerdoorlocks === 1}
                                  onChange={handleInputChange}
                                />
                                <label htmlFor="powerdoorlocks"> Power Door Locks </label>
                              </div>
                            </div>
                            <div className="col-sm-3">
                              <div className="checkbox checkbox-inline">
                                <input
                                  type="checkbox"
                                  id="antilockbrakingsys"
                                  name="antilockbrakingsys"
                                  checked={formData.antilockbrakingsys === 1}
                                  onChange={handleInputChange}
                                />
                                <label htmlFor="antilockbrakingsys"> AntiLock Braking System </label>
                              </div>
                            </div>
                            <div className="col-sm-3">
                              <div className="checkbox checkbox-inline">
                                <input
                                  type="checkbox"
                                  id="brakeassist"
                                  name="brakeassist"
                                  checked={formData.brakeassist === 1}
                                  onChange={handleInputChange}
                                />
                                <label htmlFor="brakeassist"> Brake Assist </label>
                              </div>
                            </div>
                          </div>

                          <div className="form-group">
                            <div className="col-sm-3">
                              <div className="checkbox checkbox-inline">
                                <input
                                  type="checkbox"
                                  id="powersteering"
                                  name="powersteering"
                                  checked={formData.powersteering === 1}
                                  onChange={handleInputChange}
                                />
                                <label htmlFor="powersteering"> Power Steering </label>
                              </div>
                            </div>
                            <div className="col-sm-3">
                              <div className="checkbox checkbox-inline">
                                <input
                                  type="checkbox"
                                  id="driverairbag"
                                  name="driverairbag"
                                  checked={formData.driverairbag === 1}
                                  onChange={handleInputChange}
                                />
                                <label htmlFor="driverairbag"> Driver Airbag </label>
                              </div>
                            </div>
                            <div className="col-sm-3">
                              <div className="checkbox checkbox-inline">
                                <input
                                  type="checkbox"
                                  id="passengerairbag"
                                  name="passengerairbag"
                                  checked={formData.passengerairbag === 1}
                                  onChange={handleInputChange}
                                />
                                <label htmlFor="passengerairbag"> Passenger Airbag </label>
                              </div>
                            </div>
                            <div className="col-sm-3">
                              <div className="checkbox checkbox-inline">
                                <input
                                  type="checkbox"
                                  id="powerwindow"
                                  name="powerwindow"
                                  checked={formData.powerwindow === 1}
                                  onChange={handleInputChange}
                                />
                                <label htmlFor="powerwindow"> Power Windows </label>
                              </div>
                            </div>
                          </div>

                          <div className="form-group">
                            <div className="col-sm-3">
                              <div className="checkbox checkbox-inline">
                                <input
                                  type="checkbox"
                                  id="cdplayer"
                                  name="cdplayer"
                                  checked={formData.cdplayer === 1}
                                  onChange={handleInputChange}
                                />
                                <label htmlFor="cdplayer"> CD Player </label>
                              </div>
                            </div>
                            <div className="col-sm-3">
                              <div className="checkbox checkbox-inline">
                                <input
                                  type="checkbox"
                                  id="centrallocking"
                                  name="centrallocking"
                                  checked={formData.centrallocking === 1}
                                  onChange={handleInputChange}
                                />
                                <label htmlFor="centrallocking"> Central Locking </label>
                              </div>
                            </div>
                            <div className="col-sm-3">
                              <div className="checkbox checkbox-inline">
                                <input
                                  type="checkbox"
                                  id="crashcensor"
                                  name="crashcensor"
                                  checked={formData.crashcensor === 1}
                                  onChange={handleInputChange}
                                />
                                <label htmlFor="crashcensor"> Crash Sensor </label>
                              </div>
                            </div>
                            <div className="col-sm-3">
                              <div className="checkbox checkbox-inline">
                                <input
                                  type="checkbox"
                                  id="leatherseats"
                                  name="leatherseats"
                                  checked={formData.leatherseats === 1}
                                  onChange={handleInputChange}
                                />
                                <label htmlFor="leatherseats"> Leather Seats </label>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="form-group">
                    <div className="col-sm-8 col-sm-offset-2">
                      <button
                        className="btn btn-default"
                        type="button"
                        onClick={() => navigate('/manage-vehicles')}
                      >
                        Cancel
                      </button>
                      &nbsp;
                      <button
                        className="btn btn-primary"
                        name="submit"
                        type="submit"
                        disabled={submitting}
                      >
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
