import { useState, useMemo } from 'react';

export default function FilterPanel({ filters, filterOptions, onFilterChange }) {
  const [isExpanded, setIsExpanded] = useState(true);

    // Safeguard against undefined filterOptions
    if (!filterOptions) {
        return null;
    }

    // Debug logging
    console.log('FilterPanel - filterOptions:', filterOptions);
    console.log('FilterPanel - filters.locations:', filters.locations);


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

        {/* Location Multi-Select */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Location
          </label>
          <MultiSelect
            options={filterOptions.locations}
            selected={filters.locations}
            onChange={(values) => onFilterChange('locations', values)}
            placeholder="All locations"
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
            // onFilterChange('districts', []);
            onFilterChange('locations', []);
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