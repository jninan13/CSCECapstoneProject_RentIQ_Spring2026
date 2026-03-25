/**
 * Property list page with search and filters.
 */
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { propertiesAPI } from '../../services/api';
import PropertyCard from './PropertyCard';
import SearchFilters from './SearchFilters';

const PropertyList = () => {
  const PAGE_SIZE = 21;
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sortOption, setSortOption] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [activeFilters, setActiveFilters] = useState({});
  const navigate = useNavigate();
  const location = useLocation();
  const [compareList, setCompareList] = useState(
    () => location.state?.compareList || []
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");

    if (token) {
      localStorage.setItem("token", token);
      window.history.replaceState({}, document.title, "/properties");
    }

    handleSearch({});
  }, []);

  const fetchProperties = async (filters, page = 1, selectedSort = sortOption) => {
    setLoading(true);
    setError('');

    try {
      const params = {
        skip: (page - 1) * PAGE_SIZE,
        limit: PAGE_SIZE,
        ...filters,
      };

      if (selectedSort === 'priceLowHigh') {
        params.sort_by = 'price';
        params.sort_order = 'asc';
      } else if (selectedSort === 'priceHighLow') {
        params.sort_by = 'price';
        params.sort_order = 'desc';
      } else if (selectedSort === 'scoreLowHigh') {
        params.sort_by = 'profitability_score';
        params.sort_order = 'asc';
      } else if (selectedSort === 'scoreHighLow') {
        params.sort_by = 'profitability_score';
        params.sort_order = 'desc';
      } else if (selectedSort === 'sqftLowHigh') {
        params.sort_by = 'size_sqft';
        params.sort_order = 'asc';
      } else if (selectedSort === 'sqftHighLow') {
        params.sort_by = 'size_sqft';
        params.sort_order = 'desc';
      }

      const response = await propertiesAPI.search({
        ...params,
      });
      setProperties(response.data);
    } catch (err) {
      setError('Failed to load properties. Please try again.');
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (filters) => {
    setCurrentPage(1);
    setActiveFilters(filters);
    await fetchProperties(filters, 1);
  };

  const handlePageChange = async (nextPage) => {
    if (nextPage < 1 || loading) return;
    setCurrentPage(nextPage);
    await fetchProperties(activeFilters, nextPage);
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

  const handleSortChange = async (nextSort) => {
    setSortOption(nextSort);
    setCurrentPage(1);
    await fetchProperties(activeFilters, 1, nextSort);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
          Find Your Investment Property
        </h1>

        <SearchFilters onSearch={handleSearch} />

        {compareList.length > 0 && (
          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg flex justify-between items-center">
            <div className="text-sm text-blue-900 dark:text-blue-200">
              {compareList.length} propert{compareList.length === 1 ? 'y' : 'ies'} selected for comparison
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/properties/compare', { state: { compareList } })}
                className="btn-primary"
              >
                Compare Now
              </button>
              <button
                onClick={() => setCompareList([])}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
            </div>
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
                  Showing {properties.length} properties
                </div>

                <div>
                  <select
                    value={sortOption}
                    onChange={(e) => handleSortChange(e.target.value)}
                    className="input-field w-56 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  >
                    <option value="">Sort By</option>
                    <option value="priceLowHigh">Price (Low to High)</option>
                    <option value="priceHighLow">Price (High to Low)</option>
                    <option value="scoreLowHigh">Profitability Score (Low to High)</option>
                    <option value="scoreHighLow">Profitability Score</option>
                    <option value="sqftLowHigh">Square Footage (Low to High)</option>
                    <option value="sqftHighLow">Square Footage</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {properties.map((property) => (
                <PropertyCard
                  key={property.id}
                  property={property}
                  onFavoriteChange={() => handleSearch({})}
                  onCompareToggle={handleCompareToggle}
                  isCompared={compareList.some((p) => p.id === property.id)}
                />
              ))}
            </div>

            <div className="mt-8 flex items-center justify-between">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1 || loading}
                className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>

              <span className="text-sm text-gray-600 dark:text-gray-400">
                Page {currentPage}
              </span>

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={properties.length < PAGE_SIZE || loading}
                className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PropertyList;
