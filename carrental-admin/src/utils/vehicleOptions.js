export const FUEL_TYPES = ['Petrol', 'Diesel', 'Electric', 'CNG', 'Hybrid'];
export const TRANSMISSIONS = ['Automatic', 'Manual'];
export const VEHICLE_CATEGORIES = ['Sedan', 'SUV', 'Hatchback', 'Luxury', 'Sports', 'EV'];

export const MODERN_FEATURES = [
  { id: 'sunroof', name: 'sunroof', label: 'Sunroof / Panoramic Roof' },
  { id: 'applecarplay', name: 'applecarplay', label: 'Apple CarPlay / Android Auto' },
  { id: 'reversecamera', name: 'reversecamera', label: 'Reverse Camera' },
  { id: 'cruisecontrol', name: 'cruisecontrol', label: 'Cruise Control' },
  { id: 'keylessentry', name: 'keylessentry', label: 'Keyless Entry & Push Start' },
  { id: 'gpsnavigation', name: 'gpsnavigation', label: 'GPS Navigation' },
  { id: 'fastcharging', name: 'fastcharging', label: 'EV Fast Charging / Regen Braking' },
];

export const CORE_ACCESSORIES = [
  { id: 'airconditioner', name: 'airconditioner', label: 'Air Conditioner' },
  { id: 'powerdoorlocks', name: 'powerdoorlocks', label: 'Power Door Locks' },
  { id: 'antilockbrakingsys', name: 'antilockbrakingsys', label: 'AntiLock Braking System' },
  { id: 'brakeassist', name: 'brakeassist', label: 'Brake Assist' },
  { id: 'powersteering', name: 'powersteering', label: 'Power Steering' },
  { id: 'driverairbag', name: 'driverairbag', label: 'Driver Airbag' },
  { id: 'passengerairbag', name: 'passengerairbag', label: 'Passenger Airbag' },
  { id: 'powerwindow', name: 'powerwindow', label: 'Power Windows' },
  { id: 'centrallocking', name: 'centrallocking', label: 'Central Locking' },
  { id: 'crashcensor', name: 'crashcensor', label: 'Crash Sensor' },
  { id: 'leatherseats', name: 'leatherseats', label: 'Leather Seats' },
  { id: 'cdplayer', name: 'cdplayer', label: 'CD / Multimedia Player' },
];

export const INITIAL_VEHICLE_FORM = {
  vehicletitle: '',
  brandname: '',
  vehicalorcview: '',
  priceperday: '',
  fueltype: '',
  transmission: 'Automatic',
  category: 'Sedan',
  registrationplate: '',
  hublocation: 'Pune Koregaon Park',
  odometerkm: '0',
  fuelchargepct: '100',
  vehiclestatus: 'Available',
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
  sunroof: 0,
  applecarplay: 0,
  reversecamera: 0,
  cruisecontrol: 0,
  keylessentry: 0,
  gpsnavigation: 0,
  fastcharging: 0,
};
