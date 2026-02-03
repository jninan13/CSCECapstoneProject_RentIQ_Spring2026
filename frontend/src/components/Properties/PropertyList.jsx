/**
 * Property list page with search and filters.
 */
import React, { useState, useEffect } from 'react';
import { propertiesAPI } from '../../services/api';
import PropertyCard from './PropertyCard';
import SearchFilters from './SearchFilters';

const PropertyList = () => {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Load properties on mount
    handleSearch({});
  }, []);

  const handleSearch = async (filters) => {
    setLoading(true);
    setError('');

    try {
      const response = await propertiesAPI.search(filters);
      setProperties(response.data);
    } catch (err) {
      setError('Failed to load properties. Please try again.');
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Find Your Investment Property
        </h1>

        <SearchFilters onSearch={handleSearch} />

        {error && (
          <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <div className="text-xl text-gray-600">Loading properties...</div>
          </div>
        ) : properties.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-xl text-gray-600">No properties found</p>
            <p className="text-gray-500 mt-2">Try adjusting your filters</p>
          </div>
        ) : (
          <>
            <div className="mb-4 text-gray-600">
              Found {properties.length} properties
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {properties.map((property) => (
                <PropertyCard
                  key={property.id}
                  property={property}
                  onFavoriteChange={() => handleSearch({})}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PropertyList;
