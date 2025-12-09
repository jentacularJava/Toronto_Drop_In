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