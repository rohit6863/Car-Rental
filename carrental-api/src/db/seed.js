'use strict';
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const { hashPassword } = require('../utils/crypto');

async function seed() {
  const dbName = process.env.DB_NAME || '';
  if (dbName !== 'carrental_test') {
    console.error(`[SEED ERROR] Refusing to run seed: DB_NAME must be 'carrental_test', currently '${dbName}'`);
    process.exit(1);
  }

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: dbName,
    multipleStatements: true,
  });

  console.log(`[SEED] Connected to ${dbName}. Seeding sample data...`);

  // Ensure uploads directory exists
  const targetUploadsDir = path.join(__dirname, '..', '..', 'uploads', 'vehicles');
  if (!fs.existsSync(targetUploadsDir)) {
    fs.mkdirSync(targetUploadsDir, { recursive: true });
  }

  // Source directory for legacy images
  const legacyImgDir = path.resolve('C:\\xampp\\htdocs\\carrental\\admin\\img\\vehicleimages');

  // Copy images helper
  const copyImage = (filename) => {
    if (!filename) return;
    const src = path.join(legacyImgDir, filename);
    const dest = path.join(targetUploadsDir, filename);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dest);
    }
  };

  // 1. Ensure Brand 'Lamborghini' exists
  const [lambo] = await conn.execute("SELECT id FROM tblbrands WHERE BrandName = 'Lamborghini'");
  let lamboId;
  if (lambo.length === 0) {
    const [res] = await conn.execute("INSERT INTO tblbrands (BrandName) VALUES ('Lamborghini')");
    lamboId = res.insertId;
  } else {
    lamboId = lambo[0].id;
  }

  // Get brand IDs
  const [brands] = await conn.execute('SELECT id, BrandName FROM tblbrands');
  const brandMap = {};
  brands.forEach(b => { brandMap[b.BrandName] = b.id; });

  // 2. Define 6 sample vehicles using actual legacy image filenames
  const sampleVehicles = [
    {
      title: 'Supra',
      brand: brandMap['Toyota'] || 5,
      overview: 'The Toyota Supra is a high-performance sports car known for its sleek design, responsive handling, and powerful turbocharged engine. Ideal for enthusiasts who crave speed and style.',
      price: 30000,
      fuel: 'Petrol',
      year: 2020,
      seats: 2,
      img1: 'OIP (1).jpeg',
      img2: 'OIP (2).jpeg',
      img3: 'OIP (3).jpeg',
      img4: '',
      img5: '',
      vehicle_status: 'Available',
    },
    {
      title: '5 Series',
      brand: brandMap['BMW'] || 2,
      overview: 'The BMW 5 Series is a premium executive sedan that blends luxury, comfort, and dynamic performance seamlessly. Designed for business and leisure travel.',
      price: 10000,
      fuel: 'Petrol',
      year: 2022,
      seats: 5,
      img1: 'OIP (4).jpeg',
      img2: 'OIP (5).jpeg',
      img3: 'OIP (6).jpeg',
      img4: '',
      img5: '',
      vehicle_status: 'Available',
    },
    {
      title: 'Urus',
      brand: brandMap['Lamborghini'] || lamboId,
      overview: 'The Lamborghini Urus is the worlds first Super Sport Utility Vehicle, fusing the soul of a super sports car with the practical functionality of an SUV.',
      price: 25000,
      fuel: 'Petrol',
      year: 2024,
      seats: 4,
      img1: 'OIP (7).jpeg',
      img2: 'OIP (8).jpeg',
      img3: 'OIP (9).jpeg',
      img4: '',
      img5: '',
      vehicle_status: 'Available',
    },
    {
      title: 'R8',
      brand: brandMap['Audi'] || 3,
      overview: 'The Audi R8 is a breathtaking supercar that blends iconic design with motorsport performance, featuring a roaring V10 engine and Quattro all-wheel drive.',
      price: 8000,
      fuel: 'Petrol',
      year: 2018,
      seats: 2,
      img1: 'download (1).jpeg',
      img2: 'download (2).jpeg',
      img3: 'download (3).jpeg',
      img4: '',
      img5: '',
      vehicle_status: 'Available',
    },
    {
      title: 'Land Cruiser',
      brand: brandMap['Toyota'] || 5,
      overview: 'The Toyota Land Cruiser is a legendary full-size SUV known for its rugged off-road capability, peerless reliability, and refined interior luxury.',
      price: 11000,
      fuel: 'Petrol',
      year: 2020,
      seats: 5,
      img1: 'th (1).jpeg',
      img2: 'th (2).jpeg',
      img3: 'th.jpeg',
      img4: '',
      img5: '',
      vehicle_status: 'Available',
    },
    {
      title: 'GTR',
      brand: brandMap['Nissan'] || 4,
      overview: 'The Nissan GT-R is a legendary high-performance sports car that combines cutting-edge twin-turbo power with precision all-wheel drive technology.',
      price: 22000,
      fuel: 'Diesel',
      year: 2017,
      seats: 2,
      img1: 'featured-img-1.jpg',
      img2: 'featured-img-3.jpg',
      img3: 'featured-img-3.jpg',
      img4: '',
      img5: '',
      vehicle_status: 'Available',
    },
  ];

  for (const v of sampleVehicles) {
    // Copy images
    [v.img1, v.img2, v.img3, v.img4, v.img5].forEach(copyImage);

    // Check if vehicle title exists
    const [existing] = await conn.execute(
      'SELECT id FROM tblvehicles WHERE VehiclesTitle = ? AND VehiclesBrand = ?',
      [v.title, v.brand]
    );

    if (existing.length === 0) {
      await conn.execute(`
        INSERT INTO tblvehicles (
          VehiclesTitle, VehiclesBrand, VehiclesOverview, PricePerDay, FuelType,
          ModelYear, SeatingCapacity, Vimage1, Vimage2, Vimage3, Vimage4, Vimage5,
          AirConditioner, PowerDoorLocks, AntiLockBrakingSystem, BrakeAssist,
          PowerSteering, DriverAirbag, PassengerAirbag, PowerWindows, CDPlayer,
          CentralLocking, CrashSensor, LeatherSeats, Status, vehicle_status
        ) VALUES (
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?, ?,
          1, 1, 1, 1,
          1, 1, 1, 1, 1,
          1, 1, 1, 1, ?
        )
      `, [
        v.title, v.brand, v.overview, v.price, v.fuel,
        v.year, v.seats, v.img1, v.img2, v.img3, v.img4, v.img5,
        v.vehicle_status
      ]);
      console.log(`  + Seeded vehicle: ${v.title}`);
    } else {
      await conn.execute(`
        UPDATE tblvehicles SET Vimage1 = ?, Vimage2 = ?, Vimage3 = ?, Vimage4 = ?, Vimage5 = ?, PricePerDay = ?, FuelType = ?, ModelYear = ?, SeatingCapacity = ?
        WHERE id = ?
      `, [v.img1, v.img2, v.img3, v.img4, v.img5, v.price, v.fuel, v.year, v.seats, existing[0].id]);
      console.log(`  ~ Updated vehicle images & specs: ${v.title}`);
    }
  }

  // 3. Seed test customer
  const customerEmail = 'test@example.com';
  const customerPassword = 'Password123!';
  const customerHash = await hashPassword(customerPassword);

  const [existingUser] = await conn.execute('SELECT id FROM tblusers WHERE EmailId = ?', [customerEmail]);
  if (existingUser.length === 0) {
    await conn.execute(`
      INSERT INTO tblusers (FullName, EmailId, ContactNo, Password, password_hash, Address, City, Country, auth_provider)
      VALUES ('Test Customer', ?, '9876543210', '', ?, '123 Test Street', 'Pune', 'India', 'local')
    `, [customerEmail, customerHash]);
    console.log(`  + Seeded test customer: ${customerEmail}`);
  } else {
    await conn.execute('UPDATE tblusers SET password_hash = ? WHERE EmailId = ?', [customerHash, customerEmail]);
    console.log(`  - Updated test customer password hash: ${customerEmail}`);
  }

  // 4. Seed test admin
  const adminUsername = 'admin';
  const adminPassword = 'AdminPassword123!';
  const adminHash = await hashPassword(adminPassword);

  const [existingAdmin] = await conn.execute('SELECT id FROM admin WHERE UserName = ?', [adminUsername]);
  if (existingAdmin.length === 0) {
    await conn.execute(`
      INSERT INTO admin (UserName, Password, password_hash, must_change_password)
      VALUES (?, '', ?, 0)
    `, [adminUsername, adminHash]);
    console.log(`  + Seeded test admin: ${adminUsername}`);
  } else {
    await conn.execute('UPDATE admin SET password_hash = ?, must_change_password = 0 WHERE UserName = ?', [adminHash, adminUsername]);
    console.log(`  - Updated test admin password hash: ${adminUsername}`);
  }

  // 5. Ensure contact info exists
  const [contactRows] = await conn.execute('SELECT id FROM tblcontactusinfo LIMIT 1');
  if (contactRows.length === 0) {
    await conn.execute(`
      INSERT INTO tblcontactusinfo (Address, EmailId, ContactNo)
      VALUES ('Hadapsar, Pune, Maharashtra, India', 'Wheelsechiles@gmail.com', '+91-9876543210')
    `);
  }

  // 6. Ensure default CMS pages exist
  const cmsPages = [
    { name: 'About Us', type: 'aboutus', detail: 'At WanderWheels, we believe every adventure deserves the perfect ride. Whether you are exploring a new city, embarking on a road trip, or just need a reliable set of wheels, we have got you covered.' },
    { name: 'FAQs', type: 'faqs', detail: 'Find answers to frequently asked questions about booking, cancellations, insurance, and vehicle pick-up.' },
    { name: 'Privacy Policy', type: 'privacy', detail: 'Your privacy is of utmost importance to us. We protect your personal information and transaction data.' },
    { name: 'Terms and Conditions', type: 'terms', detail: 'Please read our terms and conditions carefully before booking any vehicle with WanderWheels.' },
  ];

  for (const page of cmsPages) {
    const [p] = await conn.execute('SELECT id FROM tblpages WHERE type = ?', [page.type]);
    if (p.length === 0) {
      await conn.execute('INSERT INTO tblpages (PageName, type, detail) VALUES (?, ?, ?)', [page.name, page.type, page.detail]);
    }
  }

  console.log('\n============================================================');
  console.log('SEED COMPLETED SUCCESSFULLY (LOCAL DEVELOPMENT CREDENTIALS):');
  console.log(`Customer: Email="${customerEmail}", Password="${customerPassword}"`);
  console.log(`Admin:    Username="${adminUsername}", Password="${adminPassword}"`);
  console.log('============================================================\n');

  await conn.end();
}

seed().catch(err => {
  console.error('[SEED ERROR]', err);
  process.exit(1);
});
