/**
 * Search filters component for property queries.
 * Provides inputs for all supported filter criteria.
 */
import React, { useState } from 'react';

const SearchFilters = ({ onSearch }) => {
  const [filters, setFilters] = useState({
    zip_code: '',
    min_price: '',
    max_price: '',
    min_size: '',
    max_size: '',
    bedrooms: '',
    bathrooms: '',
    property_type: '',
    radius_miles: '',
    min_score: '',
  });

  const handleChange = (e) => {
    setFilters({
      ...filters,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Remove empty values
    const cleanedFilters = Object.fromEntries(
      Object.entries(filters).filter(([_, v]) => v !== '')
    );
    
    onSearch(cleanedFilters);
  };

  const handleReset = () => {
    const resetFilters = {
      zip_code: '',
      min_price: '',
      max_price: '',
      min_size: '',
      max_size: '',
      bedrooms: '',
      bathrooms: '',
      property_type: '',
      radius_miles: '',
      min_score: '',
    };
    setFilters(resetFilters);
    onSearch({});
  };

  return (
    <div className="card mb-6">
      <h2 className="text-xl font-bold text-gray-900 mb-4">Search Filters</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Zip Code */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Zip Code
            </label>
            <input
              type="text"
              name="zip_code"
              value={filters.zip_code}
              onChange={handleChange}
              className="input-field"
              placeholder="90210"
            />
          </div>

          {/* Min Price */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Min Price
            </label>
            <input
              type="number"
              name="min_price"
              value={filters.min_price}
              onChange={handleChange}
              className="input-field"
              placeholder="200000"
            />
          </div>

          {/* Max Price */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Max Price
            </label>
            <input
              type="number"
              name="max_price"
              value={filters.max_price}
              onChange={handleChange}
              className="input-field"
              placeholder="500000"
            />
          </div>

          {/* Min Size */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Min Size (sqft)
            </label>
            <input
              type="number"
              name="min_size"
              value={filters.min_size}
              onChange={handleChange}
              className="input-field"
              placeholder="1000"
            />
          </div>

          {/* Max Size */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Max Size (sqft)
            </label>
            <input
              type="number"
              name="max_size"
              value={filters.max_size}
              onChange={handleChange}
              className="input-field"
              placeholder="3000"
            />
          </div>

          {/* Bedrooms */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Bedrooms
            </label>
            <select
              name="bedrooms"
              value={filters.bedrooms}
              onChange={handleChange}
              className="input-field"
            >
              <option value="">Any</option>
              <option value="1">1+</option>
              <option value="2">2+</option>
              <option value="3">3+</option>
              <option value="4">4+</option>
              <option value="5">5+</option>
            </select>
          </div>

          {/* Bathrooms */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Bathrooms
            </label>
            <select
              name="bathrooms"
              value={filters.bathrooms}
              onChange={handleChange}
              className="input-field"
            >
              <option value="">Any</option>
              <option value="1">1+</option>
              <option value="2">2+</option>
              <option value="3">3+</option>
              <option value="4">4+</option>
            </select>
          </div>

          {/* Property Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Property Type
            </label>
            <select
              name="property_type"
              value={filters.property_type}
              onChange={handleChange}
              className="input-field"
            >
              <option value="">All Types</option>
              <option value="single_family">Single Family</option>
              <option value="townhouse">Townhouse</option>
              <option value="condo">Condo</option>
              <option value="multi_family">Multi-Family</option>
            </select>
          </div>

          {/* Radius */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Radius (miles)
            </label>
            <input
              type="number"
              name="radius_miles"
              value={filters.radius_miles}
              onChange={handleChange}
              className="input-field"
              placeholder="10"
              min="0"
              max="50"
            />
          </div>

          {/* Min Score */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Min Score
            </label>
            <input
              type="number"
              name="min_score"
              value={filters.min_score}
              onChange={handleChange}
              className="input-field"
              placeholder="60"
              min="0"
              max="100"
            />
          </div>
        </div>

        <div className="flex space-x-4">
          <button type="submit" className="btn-primary">
            Search Properties
          </button>
          <button type="button" onClick={handleReset} className="btn-secondary">
            Reset Filters
          </button>
        </div>
      </form>
    </div>
  );
};

export default SearchFilters;
