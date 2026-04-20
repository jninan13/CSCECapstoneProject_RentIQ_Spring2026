import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { propertiesAPI } from '../../services/api';
import PropertyCard from './PropertyCard';
import SearchFilters from './SearchFilters';
import HeroSearch from './HeroSearch';

const PropertyList = () => {
  const PAGE_SIZE = 20;
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sortOption, setSortOption] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialPage = parseInt(searchParams.get('page') || '1', 10);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [activeFilters, setActiveFilters] = useState({});
  const [hasSearched, setHasSearched] = useState(false);
  const [compareList, setCompareList] = useState(
    () => location.state?.compareList || []
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const pageFromUrl = parseInt(params.get('page') || '1', 10);

    if (token) {
      localStorage.setItem('token', token);
      window.history.replaceState({}, document.title, `/properties?page=${pageFromUrl}`);
    }

    setCurrentPage(pageFromUrl);
    setActiveFilters({});
    setHasSearched(true);
    fetchProperties({}, pageFromUrl);
  }, []);

  const fetchProperties = async (filters, page = 1, selectedSort = sortOption) => {
    setLoading(true);
    setError('');
    try {
      const params = { skip: (page - 1) * PAGE_SIZE, limit: PAGE_SIZE, ...filters };
      if (selectedSort === 'priceLowHigh') { params.sort_by = 'price'; params.sort_order = 'asc'; }
      else if (selectedSort === 'priceHighLow') { params.sort_by = 'price'; params.sort_order = 'desc'; }
      else if (selectedSort === 'scoreLowHigh') { params.sort_by = 'profitability_score'; params.sort_order = 'asc'; }
      else if (selectedSort === 'scoreHighLow') { params.sort_by = 'profitability_score'; params.sort_order = 'desc'; }
      else if (selectedSort === 'sqftLowHigh') { params.sort_by = 'size_sqft'; params.sort_order = 'asc'; }
      else if (selectedSort === 'sqftHighLow') { params.sort_by = 'size_sqft'; params.sort_order = 'desc'; }

      const response = await propertiesAPI.search(params);
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
    setSearchParams({ page: '1' });
    setActiveFilters(filters);
    setHasSearched(true);
    await fetchProperties(filters, 1);
  };

  const handlePageChange = async (nextPage) => {
    if (nextPage < 1 || loading) return;

    setCurrentPage(nextPage);
    setSearchParams({ page: nextPage.toString() });
    await fetchProperties(activeFilters, nextPage);
    window.scrollTo(0, 0);
  };

  const handleCompareToggle = (property) => {
    const exists = compareList.some((p) => p.id === property.id);
    if (exists) { setCompareList(compareList.filter((p) => p.id !== property.id)); return; }
    if (compareList.length < 3) { setCompareList([...compareList, property]); }
    else { alert('You can compare up to 3 properties.'); }
  };

  const handleSortChange = async (nextSort) => {
    setSortOption(nextSort);
    setCurrentPage(1);
    setSearchParams({ page: '1' });
    await fetchProperties(activeFilters, 1, nextSort);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero / compact search */}
      <HeroSearch onSearch={handleSearch} compact={hasSearched && properties.length > 0} />

      {/* Filter toolbar */}
      {hasSearched && <SearchFilters onSearch={handleSearch} />}

      {/* Compare bar */}
      {compareList.length > 0 && (
        <div className="bg-blue-50 border-b border-blue-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between">
            <span className="text-sm text-blue-800 font-medium">
              {compareList.length} propert{compareList.length === 1 ? 'y' : 'ies'} selected
            </span>
            <div className="flex gap-2">
              <button onClick={() => navigate('/properties/compare', { state: { compareList } })} className="btn-primary text-xs px-4 py-1.5">
                Compare Now
              </button>
              <button onClick={() => setCompareList([])} className="btn-secondary text-xs px-3 py-1.5">
                Clear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>
        )}

        {loading ? (
          <div className="text-center py-20 text-gray-400">Loading properties...</div>
        ) : !hasSearched || properties.length === 0 ? (
          hasSearched && (
            <div className="text-center py-20">
              <p className="text-xl font-semibold text-gray-500">No properties found</p>
              <p className="text-gray-400 mt-1">Try adjusting your filters</p>
            </div>
          )
        ) : (
          <>
            {/* Sort + count header */}
            <div className="flex items-center justify-between mb-5">
              <p className="text-sm text-gray-500">{properties.length} properties</p>
              <select
                value={sortOption}
                onChange={(e) => handleSortChange(e.target.value)}
                className="input-field w-52 text-xs py-2"
              >
                <option value="">Sort By</option>
                <option value="priceLowHigh">Price: Low to High</option>
                <option value="priceHighLow">Price: High to Low</option>
                <option value="scoreHighLow">Score: High to Low</option>
                <option value="scoreLowHigh">Score: Low to High</option>
                <option value="sqftHighLow">Sqft: High to Low</option>
                <option value="sqftLowHigh">Sqft: Low to High</option>
              </select>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {properties.map((property) => (
                <PropertyCard
                  key={property.id}
                  property={property}
                  currentPage={currentPage}
                  onFavoriteChange={() => fetchProperties(activeFilters, currentPage)}
                  onCompareToggle={handleCompareToggle}
                  isCompared={compareList.some((p) => p.id === property.id)}
                />
              ))}
            </div>

            {/* Pagination */}
            <div className="mt-8 flex items-center justify-between">
              <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1 || loading}
                className="btn-secondary disabled:opacity-40 text-sm px-4 py-2">
                Previous
              </button>
              <span className="text-sm text-gray-500">Page {currentPage}</span>
              <button onClick={() => handlePageChange(currentPage + 1)} disabled={properties.length < PAGE_SIZE || loading}
                className="btn-secondary disabled:opacity-40 text-sm px-4 py-2">
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
