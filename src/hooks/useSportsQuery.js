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

      if (filters.locations?.length > 0) {
        const placeholders = filters.locations.map(() => '?').join(',');
        sql += ` AND location_name IN (${placeholders})`;
        params.push(...filters.locations);
        console.log('Location filter applied:', filters.locations);

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