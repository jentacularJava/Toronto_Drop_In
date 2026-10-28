import { useState, useEffect } from 'react';
import initSqlJs from 'sql.js';
import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url';

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
        const SQL = await initSqlJs({ locateFile: () => wasmUrl });

        // Load pre-built database
        const response = await fetch('/Toronto_Drop_In/sports.db');
        if (!response.ok) {
          throw new Error('Failed to load database');
        }

        const buffer = await response.arrayBuffer();
        const database = new SQL.Database(new Uint8Array(buffer));

        // Get filter options
        const sports = database
          .exec('SELECT DISTINCT sport FROM sports_schedule ORDER BY sport')[0]
          ?.values.flat() || [];

        const locations = database
          .exec(`
            SELECT DISTINCT location_name 
            FROM sports_schedule 
            WHERE location_name IS NOT NULL AND location_name != '' 
            ORDER BY location_name
          `)[0]?.values.flat() || [];

        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

        setDb(database);
        setFilterOptions({ sports, locations, days });
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