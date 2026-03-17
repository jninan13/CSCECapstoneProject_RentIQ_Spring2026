/**
 * Property list page with search and filters.
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { propertiesAPI } from '../../services/api';
import PropertyCard from './PropertyCard';
import SearchFilters from './SearchFilters';

const PropertyList = () => {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sortOption, setSortOption] = useState('');
  const [compareList, setCompareList] = useState([]);

  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");

    if (token) {
      localStorage.setItem("token", token);
      window.history.replaceState({}, document.title, "/properties");
    }

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


  const handleCompareToggle = (property) => {
    const alreadySelected = compareList.some((p) => p.id === property.id);

    if (alreadySelected) {
      setCompareList(compareList.filter((p) => p.id !== property.id));
      return;
    }

    if (compareList.length < 3) {
      setCompareList([...compareList, property]);
    } else {
      alert('You can compare up to 3 properties.');
    }
  };

  const sortedProperties = [...properties].sort((a, b) => {
    if (sortOption === 'priceLowHigh') {
      return parseFloat(a.price) - parseFloat(b.price);
    }

    if (sortOption === 'priceHighLow') {
      return parseFloat(b.price) - parseFloat(a.price);
    }

    if (sortOption === 'scoreHighLow') {
      return b.profitability_score - a.profitability_score;
    }

    if (sortOption === 'sqftHighLow') {
      return b.size_sqft - a.size_sqft;
    }

    return 0;
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
          Find Your Investment Property
        </h1>

        <SearchFilters onSearch={handleSearch} />

        {compareList.length > 0 && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg flex justify-between items-center">
            <div className="text-sm text-blue-900">
              {compareList.length} propert{compareList.length === 1 ? 'y' : 'ies'} selected for comparison
            </div>

            <button
              onClick={() => navigate('/properties/compare', { state: { compareList } })}
              className="btn-primary"
            >
              Compare Now
            </button>
          </div>
        )}

        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <div className="text-xl text-gray-600 dark:text-gray-400">Loading properties...</div>
          </div>
        ) : properties.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-xl text-gray-600 dark:text-gray-400">No properties found</p>
            <p className="text-gray-500 dark:text-gray-500 mt-2">Try adjusting your filters</p>
          </div>
        ) : (
          <>
            <div className="mb-4 text-gray-600 dark:text-gray-400">
              <div className="flex justify-between items-center mb-6">
                <div className="text-gray-600 dark:text-gray-400">
                  Found {properties.length} properties
                </div>

                <div>
                  <select
                    value={sortOption}
                    onChange={(e) => setSortOption(e.target.value)}
                    className="input-field w-56 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  >
                    <option value="">Sort By</option>
                    <option value="priceLowHigh">Price (Low to High)</option>
                    <option value="priceHighLow">Price (High to Low)</option>
                    <option value="scoreHighLow">Profitability Score</option>
                    <option value="sqftHighLow">Square Footage</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sortedProperties.map((property) => (
                <PropertyCard
                  key={property.id}
                  property={property}
                  onFavoriteChange={() => handleSearch({})}
                  onCompareToggle={handleCompareToggle}
                  isCompared={compareList.some((p) => p.id === property.id)}
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
