import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import client, { getVehicleImageUrl } from '../api/client';

export default function AdminEditVehiclePage() {
  const { id } = useParams();
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

  const [images, setImages] = useState({
    vimage1: '',
    vimage2: '',
    vimage3: '',
    vimage4: '',
    vimage5: '',
  });

  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const [brandsRes, vehicleRes] = await Promise.all([
          client.get('/api/admin/brands'),
          client.get(`/api/vehicles/${id}`),
        ]);
        setBrands(brandsRes.data);
        const v = vehicleRes.data;
        setFormData({
          vehicletitle: v.VehiclesTitle || '',
          brandname: v.VehiclesBrand || '',
          vehicalorcview: v.VehiclesOverview || '',
          priceperday: v.PricePerDay || '',
          fueltype: v.FuelType || '',
          modelyear: v.ModelYear || '',
          seatingcapacity: v.SeatingCapacity || '',
          airconditioner: v.AirConditioner || 0,
          powerdoorlocks: v.PowerDoorLocks || 0,
          antilockbrakingsys: v.AntiLockBrakingSystem || 0,
          brakeassist: v.BrakeAssist || 0,
          powersteering: v.PowerSteering || 0,
          driverairbag: v.DriverAirbag || 0,
          passengerairbag: v.PassengerAirbag || 0,
          powerwindow: v.PowerWindows || 0,
          cdplayer: v.CDPlayer || 0,
          centrallocking: v.CentralLocking || 0,
          crashcensor: v.CrashSensor || 0,
          leatherseats: v.LeatherSeats || 0,
        });
        setImages({
          vimage1: v.Vimage1 || '',
          vimage2: v.Vimage2 || '',
          vimage3: v.Vimage3 || '',
          vimage4: v.Vimage4 || '',
          vimage5: v.Vimage5 || '',
        });
      } catch (err) {
        setError('Failed to load vehicle data');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === 'checkbox') {
      setFormData((prev) => ({ ...prev, [name]: checked ? 1 : 0 }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMsg('');
    setSubmitting(true);

    try {
      await client.put(`/api/admin/vehicles/${id}`, formData);
      setMsg('Data updated successfully');
    } catch (err) {
      if (err.response?.data?.details && Array.isArray(err.response.data.details) && err.response.data.details.length > 0) {
        setError(err.response.data.details.map((d) => d.message).join('. '));
      } else {
        setError(err.response?.data?.error || 'Failed to update vehicle');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="row">
      <div className="col-md-12">
        <h2 className="page-title">Edit Vehicle</h2>

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
                {loading ? (
                  <p>Loading vehicle data...</p>
                ) : (
                  <form className="form-horizontal" onSubmit={handleSubmit}>
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
                        <h4><b>Vehicle Images</b></h4>
                      </div>
                    </div>

                    <div className="form-group">
                      <div className="col-sm-4">
                        Image 1
                        <div>
                          <img
                            src={getVehicleImageUrl(images.vimage1)}
                            alt="Image 1"
                            width="300"
                            height="200"
                            style={{ border: 'solid 1px #000', objectFit: 'cover' }}
                          />
                        </div>
                        <Link to={`/change-image/${id}/1`}>Change Image 1</Link>
                      </div>
                      <div className="col-sm-4">
                        Image 2
                        <div>
                          <img
                            src={getVehicleImageUrl(images.vimage2)}
                            alt="Image 2"
                            width="300"
                            height="200"
                            style={{ border: 'solid 1px #000', objectFit: 'cover' }}
                          />
                        </div>
                        <Link to={`/change-image/${id}/2`}>Change Image 2</Link>
                      </div>
                      <div className="col-sm-4">
                        Image 3
                        <div>
                          {images.vimage3 ? (
                            <img
                              src={getVehicleImageUrl(images.vimage3)}
                              alt="Image 3"
                              width="300"
                              height="200"
                              style={{ border: 'solid 1px #000', objectFit: 'cover' }}
                            />
                          ) : (
                            <div style={{ width: '300px', height: '200px', border: 'solid 1px #ccc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              No Image
                            </div>
                          )}
                        </div>
                        <Link to={`/change-image/${id}/3`}>Change Image 3</Link>
                      </div>
                    </div>

                    <div className="form-group">
                      <div className="col-sm-4">
                        Image 4
                        <div>
                          {images.vimage4 ? (
                            <img
                              src={getVehicleImageUrl(images.vimage4)}
                              alt="Image 4"
                              width="300"
                              height="200"
                              style={{ border: 'solid 1px #000', objectFit: 'cover' }}
                            />
                          ) : (
                            <div style={{ width: '300px', height: '200px', border: 'solid 1px #ccc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              No Image
                            </div>
                          )}
                        </div>
                        <Link to={`/change-image/${id}/4`}>Change Image 4</Link>
                      </div>
                      <div className="col-sm-4">
                        Image 5
                        <div>
                          {images.vimage5 ? (
                            <img
                              src={getVehicleImageUrl(images.vimage5)}
                              alt="Image 5"
                              width="300"
                              height="200"
                              style={{ border: 'solid 1px #000', objectFit: 'cover' }}
                            />
                          ) : (
                            <div style={{ width: '300px', height: '200px', border: 'solid 1px #ccc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              No Image
                            </div>
                          )}
                        </div>
                        <Link to={`/change-image/${id}/5`}>Change Image 5</Link>
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
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
