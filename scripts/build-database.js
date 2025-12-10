import initSqlJs from 'sql.js';
import fs from 'fs';
import fetch from 'node-fetch';

const DROPIN_CSV_URL = 'https://ckan0.cf.opendata.inter.prod-toronto.ca/dataset/1a5be46a-4039-48cd-a2d2-8e702abf9516/resource/90f7fffe-658b-4a79-bce3-a91c1b5886de/download/drop-in.csv';
const LOCATIONS_CSV_URL = 'https://ckan0.cf.opendata.inter.prod-toronto.ca/dataset/1a5be46a-4039-48cd-a2d2-8e702abf9516/resource/f4db24c4-1270-40e3-9c2d-44d7daf4f872/download/locations.csv';
const OUTPUT_PATH = './public/sports.db';

async function buildDatabase() {
  console.log('🏗️  Building sports database...');

  // Initialize SQL.js
  const SQL = await initSqlJs();
  const db = new SQL.Database();

  // Download CSVs
  console.log('📥 Downloading CSVs...');
  const [dropinCSV, locationsCSV] = await Promise.all([
    fetch(DROPIN_CSV_URL).then(r => r.text()),
    fetch(LOCATIONS_CSV_URL).then(r => r.text())
  ]);

  // Parse CSVs
  console.log('📊 Parsing data...');
  const dropinRecords = parseCSV(dropinCSV);
  const locationRecords = parseCSV(locationsCSV);

  // Filter to next 30 days only (reduce data size)
  const today = new Date().toISOString().split('T')[0];
  const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];

  const filteredDropin = dropinRecords.filter(record => {
    const firstDate = record['First Date'];
    return (
      // record['Section'] === 'Sports - Drop-In' &&
      firstDate >= today &&
      firstDate <= thirtyDaysFromNow
    );
  });

  console.log(`✂️  Filtered from ${dropinRecords.length} to ${filteredDropin.length} records`);

  // Create tables
  console.log('🗄️  Creating database schema...');
  createTables(db);

  // Insert data
  console.log('💾 Inserting data...');
  insertDropinRecords(db, filteredDropin);
  insertLocationRecords(db, locationRecords);

  // Create indexes
  console.log('🔍 Creating indexes...');
  createIndexes(db);

  // Create view
  createSportsView(db);

  // Export database to file
  console.log('💿 Exporting database...');
  
  // Create public directory if it doesn't exist
  if (!fs.existsSync('./public')) {
    fs.mkdirSync('./public');
  }
  
  const binaryData = db.export();
  fs.writeFileSync(OUTPUT_PATH, binaryData);

  // Get stats
  const stats = db.exec('SELECT COUNT(*) as count FROM sports_schedule')[0].values[0][0];
  const size = fs.statSync(OUTPUT_PATH).size;

  console.log(`✅ Database built successfully!`);
  console.log(`   Records: ${stats}`);
  console.log(`   Size: ${(size / 1024).toFixed(2)} KB`);
  console.log(`   Location: ${OUTPUT_PATH}`);

  db.close();
}

function createTables(db) {
  db.run(`
    CREATE TABLE dropin (
      id INTEGER PRIMARY KEY,
      location_id INTEGER NOT NULL,
      course_id INTEGER NOT NULL,
      course_title TEXT NOT NULL,
      section TEXT,
      age_min INTEGER,
      age_max INTEGER,
      date_range TEXT,
      start_hour INTEGER,
      start_minute INTEGER,
      end_hour INTEGER,
      end_minute INTEGER,
      first_date TEXT,
      last_date TEXT,
      day_of_week TEXT
    )
  `);

  db.run(`
    CREATE TABLE locations (
      location_id INTEGER PRIMARY KEY,
      location_name TEXT NOT NULL,
      location_type TEXT,
      accessibility TEXT,
      intersection TEXT,
      ttc_info TEXT,
      district TEXT,
      street_no TEXT,
      street_name TEXT,
      street_type TEXT,
      street_direction TEXT,
      postal_code TEXT
    )
  `);
}

// function createSportsView(db) {
//   db.run(`
//     CREATE VIEW sports_schedule AS
//     SELECT 
//       d.course_id,
//       d.course_title as sport,
//       l.location_name,
//       l.district,
//       TRIM(
//         COALESCE(l.street_no || ' ', '') || 
//         COALESCE(l.street_name || ' ', '') || 
//         COALESCE(l.street_type || ' ', '') || 
//         COALESCE(l.street_direction, '')
//       ) as address,
//       l.intersection,
//       l.accessibility,
//       l.ttc_info,
//       d.day_of_week as day,
//       printf('%02d:%02d', d.start_hour, d.start_minute) || ' - ' ||
//         printf('%02d:%02d', d.end_hour, d.end_minute) as time,
//       d.start_hour,
//       d.first_date as date,
//       CASE 
//       WHEN d.age_min IS NULL AND d.age_max IS NULL
//       THEN 'All Ages'
//       WHEN d.age_min = 0 AND (d.age_max IS NULL OR d.age_max = 0)
//       THEN 'All Ages'
//       WHEN d.age_max IS NULL OR d.age_max = 0
//       THEN CAST(d.age_min / 12 AS TEXT) || '+'
//       ELSE CAST(d.age_min / 12 AS TEXT) || '-' || 
//           CAST(d.age_max / 12 AS TEXT)
//     END as age_range
//     FROM dropin d
//     LEFT JOIN locations l ON d.location_id = l.location_id
//     ORDER BY d.first_date, d.start_hour
//   `);
// }

function createSportsView(db) {
  db.run(`
    CREATE VIEW sports_schedule AS
    SELECT 
      d.course_id,
      d.course_title as sport,
      l.location_name,
      l.district,
      TRIM(
        COALESCE(l.street_no || ' ', '') || 
        COALESCE(l.street_name || ' ', '') || 
        COALESCE(l.street_type || ' ', '') || 
        COALESCE(l.street_direction, '')
      ) as address,
      l.intersection,
      l.accessibility,
      l.ttc_info,
      d.day_of_week as day,
      printf('%02d:%02d', d.start_hour, d.start_minute) || ' - ' ||
        printf('%02d:%02d', d.end_hour, d.end_minute) as time,
      d.start_hour,
      d.first_date as date,
      CASE 
        WHEN d.age_min IS NULL AND d.age_max IS NULL
        THEN 'All'
        WHEN d.age_min = 0 AND (d.age_max IS NULL OR d.age_max = 0)
        THEN 'All'
        WHEN d.age_max IS NULL OR d.age_max = 0
        THEN CAST(d.age_min AS TEXT) || '+'
        ELSE CAST(d.age_min AS TEXT) || '-' || 
             CAST(d.age_max AS TEXT)
      END as age_range
    FROM dropin d
    LEFT JOIN locations l ON d.location_id = l.location_id
    ORDER BY d.first_date, d.start_hour
  `);
}

function createIndexes(db) {
  db.run('CREATE INDEX idx_sport ON dropin(course_title)');
  db.run('CREATE INDEX idx_day ON dropin(day_of_week)');
  db.run('CREATE INDEX idx_date ON dropin(first_date)');
  db.run('CREATE INDEX idx_district ON locations(district)');
}

function insertDropinRecords(db, records) {
  const stmt = db.prepare(`
    INSERT INTO dropin VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  records.forEach((record, index) => {
    stmt.run([
      index,
      parseInt(record['Location ID']) || 0,
      parseInt(record['Course_ID']) || 0,
      record['Course Title'] || '',
      record['Section'] || '',
      parseAge(record['Age Min']),
      parseAge(record['Age Max']),
      record['Date Range'] || '',
      parseInt(record['Start Hour']) || 0,
      parseInt(record['Start Minute']) || 0,
      parseInt(record['End Hour']) || 0,
      parseInt(record['End Min']) || 0,
      record['First Date'] || '',
      record['Last Date'] || '',
      record['DayOftheWeek'] || ''
    ]);
  });

  stmt.free();
}

// function insertLocationRecords(db, records) {
//   const stmt = db.prepare(`
//     INSERT INTO locations VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
//   `);

//   const insertedIds = new Set();

//   records.forEach(record => {
//     const locationId = parseInt(record['Location ID']);
//     if (!locationId || insertedIds.has(locationId)) return;

//     stmt.run([
//       locationId,
//       record['Location Name'] || '',
//       record['Location Type'] || '',
//       record['Accessibility'] || '',
//       record['Intersection'] || '',
//       record['TTC Information'] || '',
//       record['District'] || '',
//       record['Street No'] || '',
//       record['Street Name'] || '',
//       record['Street Type'] || '',
//       record['Street Direction'] || '',
//       record['Postal Code'] || ''
//     ]);

//     insertedIds.add(locationId);
//   });

//   stmt.free();
// }

function insertLocationRecords(db, records) {
  const stmt = db.prepare(`
    INSERT INTO locations VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertedIds = new Set();

  // Helper function to clean values - convert "None" to empty string
  const cleanValue = (value) => {
    if (!value || value === 'None' || value.trim() === '') return '';
    return value;
  };

  records.forEach(record => {
    const locationId = parseInt(record['Location ID']);
    if (!locationId || insertedIds.has(locationId)) return;

    stmt.run([
      locationId,
      cleanValue(record['Location Name']),
      cleanValue(record['Location Type']),
      cleanValue(record['Accessibility']),
      cleanValue(record['Intersection']),
      cleanValue(record['TTC Information']),
      cleanValue(record['District']),
      cleanValue(record['Street No']),
      cleanValue(record['Street Name']),
      cleanValue(record['Street Type']),
      cleanValue(record['Street Direction']),
      cleanValue(record['Postal Code'])
    ]);

    insertedIds.add(locationId);
  });

  stmt.free();
}

// function parseAge(ageString) {
//   if (!ageString || ageString === 'None' || ageString === '') return null;
//   return parseInt(ageString) || null;
// }

function parseAge(ageString) {
  if (!ageString || ageString === 'None' || ageString === '') return null;
  const parsed = parseInt(ageString);
  // Use isNaN check instead of || null to preserve 0 as a valid age
  return isNaN(parsed) ? null : parsed;
}

function parseCSV(csvText) {
  const lines = csvText.split('\n').filter(line => line.trim());
  const headers = parseCSVLine(lines[0]).map(h => h.trim());
  
  return lines.slice(1).map(line => {
    const values = parseCSVLine(line);
    const obj = {};
    headers.forEach((header, i) => {
      obj[header] = values[i]?.trim() || '';
    });
    return obj;
  });
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current);
  return result;
}

buildDatabase().catch(console.error);
