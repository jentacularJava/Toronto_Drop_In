# Toronto Drop-In Sports Aggregator - Complete Implementation

## Project Structure
```
toronto-drop-in/
├── .github/workflows/build-deploy.yml
├── scripts/build-database.js
├── src/
│   ├── components/
│   │   ├── FilterPanel.jsx
│   │   ├── SportsTable.jsx
│   │   ├── LoadingScreen.jsx
│   │   └── ErrorScreen.jsx
│   ├── hooks/
│   │   ├── useSportsDatabase.js
│   │   └── useSportsQuery.js
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
└── postcss.config.js
```

---

## **package.json**
```json
{
  "name": "toronto-drop-in",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build:db": "node scripts/build-database.js",
    "build": "npm run build:db && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "sql.js": "^1.8.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.2.0",
    "autoprefixer": "^10.4.16",
    "node-fetch": "^3.3.2",
    "postcss": "^8.4.32",
    "tailwindcss": "^3.4.0",
    "vite": "^5.0.8"
  }
}
```

---

## **vite.config.js**
```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/toronto-drop-in/', // Update with your GitHub repo name
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        manualChunks: {
          'sql.js': ['sql.js']
        }
      }
    }
  }
})
```

---

## **tailwind.config.js**
```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

---

## **postcss.config.js**
```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

---

## **index.html**
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="Find drop-in sports activities across Toronto with easy filtering by sport, location, date, and time." />
    <title>Toronto Drop-In Sports Schedule</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

---

## **scripts/build-database.js**
```javascript
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
      record['Section'] === 'Sports - Drop-In' &&
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
      age_min_months INTEGER,
      age_max_months INTEGER,
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
        WHEN d.age_max_months IS NULL OR d.age_max_months = 0
        THEN CAST(d.age_min_months / 12 AS TEXT) || '+'
        ELSE CAST(d.age_min_months / 12 AS TEXT) || '-' || 
             CAST(d.age_max_months / 12 AS TEXT)
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

function insertLocationRecords(db, records) {
  const stmt = db.prepare(`
    INSERT INTO locations VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertedIds = new Set();

  records.forEach(record => {
    const locationId = parseInt(record['Location ID']);
    if (!locationId || insertedIds.has(locationId)) return;

    stmt.run([
      locationId,
      record['Location Name'] || '',
      record['Location Type'] || '',
      record['Accessibility'] || '',
      record['Intersection'] || '',
      record['TTC Information'] || '',
      record['District'] || '',
      record['Street No'] || '',
      record['Street Name'] || '',
      record['Street Type'] || '',
      record['Street Direction'] || '',
      record['Postal Code'] || ''
    ]);

    insertedIds.add(locationId);
  });

  stmt.free();
}

function parseAge(ageString) {
  if (!ageString || ageString === 'None' || ageString === '') return null;
  return parseInt(ageString) || null;
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
```

---

## **.github/workflows/build-deploy.yml**
```yaml
name: Build and Deploy

on:
  schedule:
    - cron: '0 14 * * *'  # 9 AM EST (2 PM UTC) daily
  push:
    branches: [main]
  workflow_dispatch:  # Allow manual trigger

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build database
        run: node scripts/build-database.js

      - name: Build React app
        run: npm run build

      - name: Setup Pages
        uses: actions/configure-pages@v4

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: './dist'

      - name: Deploy to GitHub Pages
        uses: actions/deploy-pages@v4
```

---

## **src/hooks/useSportsDatabase.js**
```javascript
import { useState, useEffect } from 'react';
import initSqlJs from 'sql.js';

export function useSportsDatabase() {
  const [db, setDb] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterOptions, setFilterOptions] = useState(null);

  useEffect(() => {
    async function loadDatabase() {
      try {
        console.log('Loading sports database...');

        // Initialize SQL.js
        const SQL = await initSqlJs({
          locateFile: file => `https://sql.js.org/dist/${file}`
        });

        // Load pre-built database
        const response = await fetch('/toronto-drop-in/sports.db');
        if (!response.ok) {
          throw new Error('Failed to load database');
        }

        const buffer = await response.arrayBuffer();
        const database = new SQL.Database(new Uint8Array(buffer));

        // Get filter options
        const sports = database
          .exec('SELECT DISTINCT sport FROM sports_schedule ORDER BY sport')[0]
          ?.values.flat() || [];

        const districts = database
          .exec(`
            SELECT DISTINCT district 
            FROM sports_schedule 
            WHERE district IS NOT NULL AND district != '' 
            ORDER BY district
          `)[0]?.values.flat() || [];

        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

        setDb(database);
        setFilterOptions({ sports, districts, days });
        console.log('✅ Database loaded successfully');
      } catch (err) {
        console.error('Database loading error:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }

    loadDatabase();
  }, []);

  return { db, isLoading, error, filterOptions };
}
```

---

## **src/hooks/useSportsQuery.js**
```javascript
import { useState, useEffect } from 'react';

export function useSportsQuery(db, filters) {
  const [results, setResults] = useState([]);

  useEffect(() => {
    if (!db || !filters.startDate || !filters.endDate) {
      setResults([]);
      return;
    }

    try {
      let sql = 'SELECT * FROM sports_schedule WHERE date >= ? AND date <= ?';
      const params = [filters.startDate, filters.endDate];

      // Add optional filters
      if (filters.sports?.length > 0) {
        const placeholders = filters.sports.map(() => '?').join(',');
        sql += ` AND sport IN (${placeholders})`;
        params.push(...filters.sports);
      }

      if (filters.days?.length > 0) {
        const placeholders = filters.days.map(() => '?').join(',');
        sql += ` AND day IN (${placeholders})`;
        params.push(...filters.days);
      }

      if (filters.districts?.length > 0) {
        const placeholders = filters.districts.map(() => '?').join(',');
        sql += ` AND district IN (${placeholders})`;
        params.push(...filters.districts);
      }

      if (filters.timeOfDay) {
        switch (filters.timeOfDay) {
          case 'morning':
            sql += ' AND start_hour >= 6 AND start_hour < 12';
            break;
          case 'afternoon':
            sql += ' AND start_hour >= 12 AND start_hour < 17';
            break;
          case 'evening':
            sql += ' AND start_hour >= 17 AND start_hour < 22';
            break;
        }
      }

      if (filters.searchText) {
        sql += ' AND (sport LIKE ? OR location_name LIKE ? OR address LIKE ?)';
        const searchPattern = `%${filters.searchText}%`;
        params.push(searchPattern, searchPattern, searchPattern);
      }

      const stmt = db.prepare(sql);
      stmt.bind(params);

      const data = [];
      while (stmt.step()) {
        data.push(stmt.getAsObject());
      }
      stmt.free();

      setResults(data);
    } catch (err) {
      console.error('Query error:', err);
      setResults([]);
    }
  }, [db, filters]);

  return results;
}
```

---

## **src/App.jsx**
```javascript
import { useState, useMemo } from 'react';
import { useSportsDatabase } from './hooks/useSportsDatabase';
import { useSportsQuery } from './hooks/useSportsQuery';
import FilterPanel from './components/FilterPanel';
import SportsTable from './components/SportsTable';
import LoadingScreen from './components/LoadingScreen';
import ErrorScreen from './components/ErrorScreen';

function App() {
  const { db, isLoading, error, filterOptions } = useSportsDatabase();

  // Calculate default date range: today + 7 days
  const defaultStartDate = new Date().toISOString().split('T')[0];
  const defaultEndDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];

  const [filters, setFilters] = useState({
    startDate: defaultStartDate,
    endDate: defaultEndDate,
    sports: [],
    days: [],
    districts: [],
    timeOfDay: null,
    searchText: ''
  });

  const results = useSportsQuery(db, filters);

  const handleFilterChange = (filterType, value) => {
    setFilters(prev => {
      const updated = { ...prev, [filterType]: value };

      // Validate date range (max 7 days)
      if (filterType === 'startDate' || filterType === 'endDate') {
        const start = new Date(updated.startDate);
        const end = new Date(updated.endDate);
        const diffDays = (end - start) / (1000 * 60 * 60 * 24);

        if (diffDays > 7) {
          // Adjust end date to be 7 days after start
          if (filterType === 'startDate') {
            const newEnd = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
            updated.endDate = newEnd.toISOString().split('T')[0];
          } else {
            const newStart = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
            updated.startDate = newStart.toISOString().split('T')[0];
          }
        }

        // Ensure start <= end
        if (start > end) {
          if (filterType === 'startDate') {
            updated.endDate = updated.startDate;
          } else {
            updated.startDate = updated.endDate;
          }
        }
      }

      return updated;
    });
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (error) {
    return <ErrorScreen error={error} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Toronto Drop-In Sports Schedule
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Find drop-in sports activities across Toronto
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <FilterPanel
          filters={filters}
          filterOptions={filterOptions}
          onFilterChange={handleFilterChange}
        />

        <div className="mt-6">
          <SportsTable results={results} />
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <p className="text-sm text-gray-600 text-center">
            Data from{' '}
            <a
              href="https://open.toronto.ca"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800"
            >
              Toronto Open Data
            </a>
            . Updated daily at 8:00 AM.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
```

---

## **src/components/FilterPanel.jsx**
```javascript
import { useState, useMemo } from 'react';

export default function FilterPanel({ filters, filterOptions, onFilterChange }) {
  const [isExpanded, setIsExpanded] = useState(true);

  // Calculate max selectable end date (start + 7 days)
  const maxEndDate = useMemo(() => {
    if (!filters.startDate) return '';
    const start = new Date(filters.startDate);
    const max = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
    return max.toISOString().split('T')[0];
  }, [filters.startDate]);

  // Calculate min selectable start date (end - 7 days)
  const minStartDate = useMemo(() => {
    if (!filters.endDate) return '';
    const end = new Date(filters.endDate);
    const min = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
    return min.toISOString().split('T')[0];
  }, [filters.endDate]);

  const daysDifference = useMemo(() => {
    if (!filters.startDate || !filters.endDate) return 0;
    const start = new Date(filters.startDate);
    const end = new Date(filters.endDate);
    return Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1;
  }, [filters.startDate, filters.endDate]);

  return (
    <div className="bg-white rounded-lg shadow p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-sm text-blue-600 hover:text-blue-800 lg:hidden"
        >
          {isExpanded ? 'Hide' : 'Show'}
        </button>
      </div>

      {/* Filter Grid */}
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 ${!isExpanded ? 'hidden lg:grid' : ''}`}>
        {/* Date Range (MANDATORY) */}
        <div className="lg:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Date Range <span className="text-red-500">*</span>
            <span className="text-xs text-gray-500 ml-1">
              (max 7 days, {daysDifference} day{daysDifference !== 1 ? 's' : ''} selected)
            </span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="date"
              value={filters.startDate}
              min={minStartDate || undefined}
              onChange={(e) => onFilterChange('startDate', e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              required
            />
            <input
              type="date"
              value={filters.endDate}
              max={maxEndDate || undefined}
              onChange={(e) => onFilterChange('endDate', e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              required
            />
          </div>
        </div>

        {/* Sport Multi-Select */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Sport
          </label>
          <MultiSelect
            options={filterOptions.sports}
            selected={filters.sports}
            onChange={(values) => onFilterChange('sports', values)}
            placeholder="All sports"
          />
        </div>

        {/* Day Multi-Select */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Day of Week
          </label>
          <MultiSelect
            options={filterOptions.days}
            selected={filters.days}
            onChange={(values) => onFilterChange('days', values)}
            placeholder="All days"
          />
        </div>

        {/* District Multi-Select */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            District
          </label>
          <MultiSelect
            options={filterOptions.districts}
            selected={filters.districts}
            onChange={(values) => onFilterChange('districts', values)}
            placeholder="All districts"
          />
        </div>

        {/* Time of Day */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Time of Day
          </label>
          <select
            value={filters.timeOfDay || ''}
            onChange={(e) => onFilterChange('timeOfDay', e.target.value || null)}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          >
            <option value="">Any time</option>
            <option value="morning">Morning (6am-12pm)</option>
            <option value="afternoon">Afternoon (12pm-5pm)</option>
            <option value="evening">Evening (5pm-10pm)</option>
          </select>
        </div>

        {/* Search */}
        <div className="lg:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Search
          </label>
          <input
            type="text"
            value={filters.searchText}
            onChange={(e) => onFilterChange('searchText', e.target.value)}
            placeholder="Search sports, locations, or addresses..."
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
        </div>
      </div>

      {/* Clear Filters */}
      <div className={`mt-4 ${!isExpanded ? 'hidden lg:block' : ''}`}>
        <button
          onClick={() => {
            const today = new Date().toISOString().split('T')[0];
            const weekLater = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
              .toISOString()
              .split('T')[0];
            
            onFilterChange('startDate', today);
            onFilterChange('endDate', weekLater);
            onFilterChange('sports', []);
            onFilterChange('days', []);
            onFilterChange('districts', []);
            onFilterChange('timeOfDay', null);
            onFilterChange('searchText', '');
          }}
          className="text-sm text-gray-600 hover:text-gray-900"
        >
          Clear all filters
        </button>
      </div>
    </div>
  );
}

// Simple multi-select component
function MultiSelect({ options, selected, onChange, placeholder }) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleOption = (option) => {
    if (selected.includes(option)) {
      onChange(selected.filter(item => item !== option));
    } else {
      onChange([...selected, option]);
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative w-full bg-white border border-gray-300 rounded-md shadow-sm pl-3 pr-10 py-2 text-left cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
      >
        <span className="block truncate">
          {selected.length === 0
            ? placeholder
            : `${selected.length} selected`}
        </span>
        <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
          <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 3a1 1 0 01.707.293l3 3a1 1 0 01-1.414 1.414L10 5.414 7.707 7.707a1 1 0 01-1.414-1.414l3-3A1 1 0 0110 3zm-3.707 9.293a1 1 0 011.414 0L10 14.586l2.293-2.293a1 1 0 011.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </span>
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute z-20 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
            {options.map((option) => (
              <div
                key={option}
                onClick={() => toggleOption(option)}
                className="cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-blue-50"
              >
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selected.includes(option)}
                    onChange={() => {}}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-3 block truncate">{option}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
```

---

## **src/components/SportsTable.jsx**
```javascript
import { useState, useMemo } from 'react';

export default function SportsTable({ results }) {
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'asc' });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  // Sort results
  const sortedResults = useMemo(() => {
    return [...results].sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];
      
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [results, sortConfig]);

  // Paginate results
  const paginatedResults = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedResults.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedResults, currentPage]);

  const totalPages = Math.ceil(sortedResults.length / itemsPerPage);

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
    setCurrentPage(1);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  if (results.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-12 text-center">
        <svg
          className="mx-auto h-12 w-12 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
          />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900">No activities found</h3>
        <p className="mt-1 text-sm text-gray-500">
          Try adjusting your filters or select a different date range.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Results Count */}
      <div className="px-6 py-4 border-b border-gray-200">
        <p className="text-sm text-gray-700">
          Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
          <span className="font-medium">
            {Math.min(currentPage * itemsPerPage, results.length)}
          </span>{' '}
          of <span className="font-medium">{results.length}</span> activities
        </p>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <SortableHeader label="Sport" sortKey="sport" sortConfig={sortConfig} onSort={handleSort} />
              <SortableHeader label="Location" sortKey="location_name" sortConfig={sortConfig} onSort={handleSort} />
              <SortableHeader label="District" sortKey="district" sortConfig={sortConfig} onSort={handleSort} />
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Address
              </th>
              <SortableHeader label="Day" sortKey="day" sortConfig={sortConfig} onSort={handleSort} />
              <SortableHeader label="Time" sortKey="start_hour" sortConfig={sortConfig} onSort={handleSort} />
              <SortableHeader label="Date" sortKey="date" sortConfig={sortConfig} onSort={handleSort} />
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Age Range
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedResults.map((row, index) => (
              <tr key={`${row.course_id}-${index}`} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {row.sport}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {row.location_name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {row.district}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {row.address}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {row.day}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {row.time}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatDate(row.date)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {row.age_range} yrs
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="text-sm text-gray-700">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

function SortableHeader({ label, sortKey, sortConfig, onSort }) {
  const isSorted = sortConfig.key === sortKey;
  
  return (
    <th
      onClick={() => onSort(sortKey)}
      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
    >
      <div className="flex items-center space-x-1">
        <span>{label}</span>
        {isSorted && (
          <span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
        )}
      </div>
    </th>
  );
}
```

---

## **src/components/LoadingScreen.jsx**
```javascript
export default function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Loading Toronto Sports Schedules
        </h2>
        <p className="text-gray-600">
          Please wait while we load the database...
        </p>
      </div>
    </div>
  );
}
```

---

## **src/components/ErrorScreen.jsx**
```javascript
export default function ErrorScreen({ error }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8 text-center">
        <svg
          className="mx-auto h-16 w-16 text-red-500 mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Error Loading Database
        </h2>
        <p className="text-gray-600 mb-6">
          {error || 'An unexpected error occurred while loading the sports schedule database.'}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Retry
        </button>
      </div>
    </div>
  );
}
```

---

## **src/main.jsx**
```javascript
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

---

## **src/index.css**
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

---

## **.gitignore**
```
# Logs
logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*
lerna-debug.log*

node_modules
dist
dist-ssr
*.local

# Editor directories and files
.vscode/*
!.vscode/extensions.json
.idea
.DS_Store
*.suo
*.ntvs*
*.njsproj
*.sln
*.sw?

# Database file (will be regenerated at build time)
public/sports.db
```

---

## **Setup Instructions**

1. **Create the project directory:**
   ```bash
   mkdir toronto-drop-in
   cd toronto-drop-in
   ```

2. **Create all the files** with the code above

3. **Install dependencies:**
   ```bash
   npm install
   ```

4. **Build the database:**
   ```bash
   npm run build:db
   ```

5. **Run development server:**
   ```bash
   npm run dev
   ```

6. **Build for production:**
   ```bash
   npm run build
   ```

7. **Deploy to GitHub Pages:**
   - Create a GitHub repository named `toronto-drop-in`
   - Update `vite.config.js` base URL to match your repo name
   - Push code to GitHub
   - Enable GitHub Pages in repo settings (deploy from GitHub Actions)
   - GitHub Actions will automatically build and deploy

The app will:
- ✅ Load a pre-built SQLite database (~500 KB)
- ✅ Require date range selection (max 7 days)
- ✅ Filter by sport, day, district, time, and search
- ✅ Sort and paginate results (50 per page)
- ✅ Rebuild daily at 9 AM EST via GitHub Actions
- ✅ Use Tailwind CSS for sleek, responsive design