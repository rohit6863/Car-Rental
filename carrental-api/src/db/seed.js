'use strict';
require('dotenv').config();
const mysql = require('mysql2/promise');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { hashPassword } = require('../utils/crypto');

function generateRandomPassword(prefix = 'Wander') {
  return `${prefix}!${crypto.randomBytes(6).toString('hex')}A1`;
}

async function seed() {
  const dbName = (process.env.DB_NAME || 'carrental_test').trim();
  const isAllowedDb = dbName === 'carrental_test' || dbName.endsWith('_test') || process.env.NODE_ENV === 'development';
  if (!isAllowedDb && process.env.NODE_ENV === 'production') {
    throw new Error(`Refusing to seed database "${dbName}" in production.`);
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

  // Source directory for repo-local license-clean placeholder images
  const seedAssetsDir = path.join(__dirname, '..', '..', 'seed-assets', 'vehicles');

  // Copy images helper
  const copyImage = (filename) => {
    if (!filename) return;
    const src = path.join(seedAssetsDir, filename);
    const dest = path.join(targetUploadsDir, filename);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dest);
    }
  };

  // 1. Ensure required Brands exist
  const initialBrands = ['Toyota', 'BMW', 'Lamborghini', 'Audi', 'Nissan', 'Mercedes'];
  for (const bName of initialBrands) {
    const [bRows] = await conn.execute('SELECT id FROM tblbrands WHERE BrandName = ?', [bName]);
    if (bRows.length === 0) {
      await conn.execute('INSERT INTO tblbrands (BrandName) VALUES (?)', [bName]);
    }
  }

  // Get brand IDs
  const [brands] = await conn.execute('SELECT id, BrandName FROM tblbrands');
  const brandMap = {};
  brands.forEach(b => { brandMap[b.BrandName] = b.id; });

  // 2. Define 6 sample vehicles using repo-local license-clean placeholder images
  const sampleVehicles = [
    {
      title: 'Supra',
      brand: brandMap['Toyota'] || 5,
      overview: 'The Toyota Supra is a high-performance sports car known for its sleek design, responsive handling, and powerful turbocharged engine. Ideal for enthusiasts who crave speed and style.',
      price: 30000,
      fuel: 'Petrol',
      year: 2020,
      seats: 2,
      img1: 'toyota-fortuner-1.png',
      img2: 'toyota-fortuner-2.png',
      img3: 'toyota-fortuner-3.png',
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
      img1: 'bmw-5-series-1.png',
      img2: 'bmw-5-series-2.png',
      img3: 'bmw-5-series-3.png',
      img4: '',
      img5: '',
      vehicle_status: 'Available',
    },
    {
      title: 'Urus',
      brand: brandMap['Lamborghini'] || lamboId,
      overview: 'The Lamborghini Urus is the world first Super Sport Utility Vehicle, fusing the soul of a super sports car with the practical functionality of an SUV.',
      price: 25000,
      fuel: 'Petrol',
      year: 2024,
      seats: 4,
      img1: 'mercedes-c-class-1.png',
      img2: 'mercedes-c-class-2.png',
      img3: 'mercedes-c-class-3.png',
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
      img1: 'audi-a4-1.png',
      img2: 'audi-a4-2.png',
      img3: 'audi-a4-3.png',
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
      img1: 'toyota-fortuner-1.png',
      img2: 'toyota-fortuner-2.png',
      img3: 'toyota-fortuner-3.png',
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
      img1: 'honda-city-1.png',
      img2: 'honda-city-2.png',
      img3: 'honda-city-3.png',
      img4: '',
      img5: '',
      vehicle_status: 'Available',
    },
  ];

  for (const v of sampleVehicles) {
    // Copy images from repo-local seed assets
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
          CentralLocking, CrashSensor, LeatherSeats, vehicle_status
        ) VALUES (
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?, ?,
          1, 1, 1, 1,
          1, 1, 1, 1, 1,
          1, 1, 1, ?
        )
      `, [
        v.title, v.brand, v.overview, v.price, v.fuel,
        v.year, v.seats, v.img1, v.img2, v.img3, v.img4, v.img5,
        v.vehicle_status
      ]);
      console.log(`  + Seeded vehicle: ${v.title}`);
    } else {
      await conn.execute(`
        UPDATE tblvehicles SET
          Vimage1 = ?, Vimage2 = ?, Vimage3 = ?, Vimage4 = ?, Vimage5 = ?,
          PricePerDay = ?, FuelType = ?, ModelYear = ?, SeatingCapacity = ?
        WHERE id = ?
      `, [v.img1, v.img2, v.img3, v.img4, v.img5, v.price, v.fuel, v.year, v.seats, existing[0].id]);
      console.log(`  ~ Updated vehicle images & specs: ${v.title}`);
    }
  }

  // 3. Seed test customer (configurable via env, generated dynamically if missing)
  const customerEmail = process.env.SEED_CUSTOMER_EMAIL || 'customer@example.com';
  const customerPassword = process.env.SEED_CUSTOMER_PASSWORD || generateRandomPassword('Customer');
  const customerHash = await hashPassword(customerPassword);

  const [existingUser] = await conn.execute('SELECT id FROM tblusers WHERE EmailId = ?', [customerEmail]);
  if (existingUser.length === 0) {
    await conn.execute(`
      INSERT INTO tblusers (FullName, EmailId, ContactNo, Password, password_hash, Address, City, Country, auth_provider, email_verified)
      VALUES ('Test Customer', ?, '9999900000', '', ?, '123 Test Street', 'Pune', 'India', 'local', 0)
    `, [customerEmail, customerHash]);
    console.log(`  + Seeded test customer: ${customerEmail}`);
  } else {
    await conn.execute('UPDATE tblusers SET password_hash = ? WHERE EmailId = ?', [customerHash, customerEmail]);
    console.log(`  - Updated test customer password hash: ${customerEmail}`);
  }

  // 4. Seed test admin (configurable via env, generated dynamically if missing)
  const adminUsername = process.env.SEED_ADMIN_USERNAME || 'admin';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'AdminPassword123!';
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

  // 5. Ensure contact info exists with support@example.com and safe placeholder phone
  const supportEmail = process.env.SEED_SUPPORT_EMAIL || 'support@example.com';
  const supportPhone = process.env.SEED_SUPPORT_PHONE || '+91 99999 00000';

  const [contactRows] = await conn.execute('SELECT id FROM tblcontactusinfo LIMIT 1');
  if (contactRows.length === 0) {
    await conn.execute(`
      INSERT INTO tblcontactusinfo (Address, EmailId, ContactNo)
      VALUES ('100 Business Park, Suite 400, Pune, Maharashtra, India', ?, ?)
    `, [supportEmail, supportPhone]);
  } else {
    await conn.execute(`
      UPDATE tblcontactusinfo SET EmailId = ?, ContactNo = ? WHERE id = ?
    `, [supportEmail, supportPhone, contactRows[0].id]);
  }

  // 6. Ensure default CMS pages exist with clean demonstration copy
  const cmsPages = [
    {
      name: 'About Us',
      type: 'aboutus',
      detail: '<p>Welcome to <strong>WanderWheels</strong>, an educational demonstration vehicle rental web application engineered with modern React frontends and a secure Node.js/Express REST API backend.</p><p><strong>Notice:</strong> This web portal is strictly a software demonstration and testing platform. No real-world vehicles are available for booking or rental, and no commercial transactions are processed through this portal.</p><h4>Project Highlights</h4><ul><li>Full-featured customer vehicle catalog, search, and date-range availability calculation.</li><li>Role-based access control with Argon2id password hashing and CSRF protection.</li><li>Simulated mock payment gateway integration for test booking workflows.</li><li>Comprehensive administration portal for fleet management, booking approvals, and customer communication.</li></ul><p>Whether exploring code architecture or trying out test bookings, WanderWheels showcases a modern, robust, and clean development pattern.</p>',
    },
    {
      name: 'FAQs',
      type: 'faqs',
      detail: '<p>Below are frequently asked questions regarding the WanderWheels demonstration platform.</p><h4>Is this a real vehicle rental service?</h4><p>No. WanderWheels is an educational software showcase and test environment. All vehicles, bookings, invoices, and payments displayed are entirely simulated.</p><h4>Can I book a real car on this website?</h4><p>No real vehicles can be reserved, rented, or collected through this website. Any booking created in the system is stored only as a test database record.</p><h4>Are real credit cards or bank accounts charged?</h4><p>No. WanderWheels runs in simulated test mode. The payment interface is an interactive mock gateway for evaluation purposes. Never enter real financial or banking credentials.</p><h4>How do I log in or test administrative features?</h4><p>You can register a test customer account or use the seed credentials generated during database initialization. The admin dashboard is accessible at the dedicated admin portal URL.</p>',
    },
    {
      name: 'Privacy Policy',
      type: 'privacy',
      detail: '<p><strong>Demonstration Privacy Notice</strong></p><p>This privacy notice explains how test data is handled within the WanderWheels demonstration system.</p><h4>Data Collection and Scope</h4><p>WanderWheels is a demonstration application. Any names, email addresses, phone numbers, or passwords entered into registration or contact forms are stored locally in the development test database solely for verifying software features (such as user authentication, profile editing, and email simulation).</p><h4>No Commercial Use or Sharing</h4><p>We do not sell, license, rent, or distribute any user information submitted to this demonstration application. Do not submit sensitive real-world personal information or production passwords.</p><h4>Account Security</h4><p>Passwords are hashed using industry-standard Argon2id cryptographic hashing before storage, and session authentication utilizes httpOnly security cookies. However, because this is an active demonstration sandbox, databases may be purged or reset periodically.</p><p><em>Disclaimer: This statement describes test environment data handling practices and does not constitute formal legal counsel.</em></p>',
    },
    {
      name: 'Terms and Conditions',
      type: 'terms',
      detail: '<p><strong>Demonstration Terms of Use</strong></p><p>Please read these terms carefully before exploring or testing the WanderWheels application. By accessing or using this portal, you acknowledge and agree that:</p><ol><li><strong>Educational Demonstration Only:</strong> WanderWheels is created and maintained solely for educational, portfolio, and technical demonstration purposes. It does not provide commercial vehicle rental services.</li><li><strong>Simulated Transactions:</strong> Any booking, cancellation, fee, invoice, or receipt created within this application is purely simulated and holds no legal, financial, or contractual validity.</li><li><strong>No Warranties or Liability:</strong> The software is provided "as is" without warranties of any kind. The authors and contributors bear no liability for misuse or assumptions of commercial availability.</li><li><strong>Test Data:</strong> All sample data, user profiles, vehicle records, and mock reviews may be reset, altered, or deleted at any time during development or testing cycles.</li></ol><p><em>Disclaimer: This document is provided for demonstrative software purposes only and does not constitute formal legal advice.</em></p>',
    },
  ];

  for (const page of cmsPages) {
    const [p] = await conn.execute('SELECT id FROM tblpages WHERE type = ?', [page.type]);
    if (p.length === 0) {
      await conn.execute('INSERT INTO tblpages (PageName, type, detail) VALUES (?, ?, ?)', [page.name, page.type, page.detail]);
    } else {
      await conn.execute('UPDATE tblpages SET PageName = ?, detail = ? WHERE id = ?', [page.name, page.detail, p[0].id]);
    }
  }

  console.log('\n============================================================');
  console.log('SEED COMPLETED SUCCESSFULLY (LOCAL DEVELOPMENT CREDENTIALS):');
  console.log(`Customer: Email="${customerEmail}", Password="${customerPassword}"`);
  console.log(`Admin:    Username="${adminUsername}", Password="${adminPassword}"`);
  console.log(`Support:  Email="${supportEmail}", Phone="${supportPhone}"`);
  console.log('============================================================\n');

  await conn.end();
}

seed().catch(err => {
  console.error('[SEED ERROR]', err);
  process.exit(1);
});
