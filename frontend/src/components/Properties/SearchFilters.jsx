import React, { useState } from 'react';

const SearchFilters = ({ onSearch }) => {
  const [showMore, setShowMore] = useState(false);
  const [filters, setFilters] = useState({
    zip_code: '', min_price: '', max_price: '', min_size: '', max_size: '',
    bedrooms: '', bedrooms_match: 'gte',
    bathrooms: '', bathrooms_match: 'gte',
    property_type: '', radius_miles: '', min_score: '',
  });

  const handleChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  // beds/baths dropdowns encode value|mode in a single option so the filter bar stays compact
  const handleBedsChange = (e) => {
    const [value, match] = e.target.value ? e.target.value.split('|') : ['', 'gte'];
    setFilters({ ...filters, bedrooms: value, bedrooms_match: match || 'gte' });
  };

  const handleBathsChange = (e) => {
    const [value, match] = e.target.value ? e.target.value.split('|') : ['', 'gte'];
    setFilters({ ...filters, bathrooms: value, bathrooms_match: match || 'gte' });
  };

  const bedsValue = filters.bedrooms ? `${filters.bedrooms}|${filters.bedrooms_match}` : '';
  const bathsValue = filters.bathrooms ? `${filters.bathrooms}|${filters.bathrooms_match}` : '';

  const getCleanedFilters = (nextFilters) => {
    const cleaned = Object.fromEntries(Object.entries(nextFilters).filter((entry) => entry[1] !== ''));
    if (!cleaned.bedrooms) delete cleaned.bedrooms_match;
    if (!cleaned.bathrooms) delete cleaned.bathrooms_match;
    return cleaned;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSearch(getCleanedFilters(filters));
  };

  const handleReset = () => {
    setFilters({
      zip_code: '', min_price: '', max_price: '', min_size: '', max_size: '',
      bedrooms: '', bedrooms_match: 'gte',
      bathrooms: '', bathrooms_match: 'gte',
      property_type: '', radius_miles: '', min_score: '',
    });
    onSearch({});
  };

  const activeCount = Object.keys(getCleanedFilters(filters)).length;

  const selectClass = 'input-field appearance-none bg-white';

  return (
    <div className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <form onSubmit={handleSubmit} className="py-3">
          {/* Primary filters row */}
          <div className="flex flex-wrap items-center gap-2">
            <input type="text" name="zip_code" value={filters.zip_code} onChange={handleChange}
              placeholder="ZIP Code" className="input-field w-28 text-xs py-2" />

            <input type="number" name="min_price" value={filters.min_price} onChange={handleChange}
              placeholder="Min Price" className="input-field w-28 text-xs py-2" />
            <input type="number" name="max_price" value={filters.max_price} onChange={handleChange}
              placeholder="Max Price" className="input-field w-28 text-xs py-2" />

            <select value={bedsValue} onChange={handleBedsChange} className={`${selectClass} w-32 text-xs py-2`}>
              <option value="">Beds</option>
              <optgroup label="At least">
                <option value="1|gte">1+ beds</option>
                <option value="2|gte">2+ beds</option>
                <option value="3|gte">3+ beds</option>
                <option value="4|gte">4+ beds</option>
                <option value="5|gte">5+ beds</option>
              </optgroup>
              <optgroup label="Exactly">
                <option value="1|exact">Exactly 1</option>
                <option value="2|exact">Exactly 2</option>
                <option value="3|exact">Exactly 3</option>
                <option value="4|exact">Exactly 4</option>
                <option value="5|exact">Exactly 5</option>
              </optgroup>
            </select>

            <select value={bathsValue} onChange={handleBathsChange} className={`${selectClass} w-32 text-xs py-2`}>
              <option value="">Baths</option>
              <optgroup label="At least">
                <option value="1|gte">1+ baths</option>
                <option value="2|gte">2+ baths</option>
                <option value="3|gte">3+ baths</option>
                <option value="4|gte">4+ baths</option>
              </optgroup>
              <optgroup label="Exactly">
                <option value="1|exact">Exactly 1</option>
                <option value="1.5|exact">Exactly 1.5</option>
                <option value="2|exact">Exactly 2</option>
                <option value="2.5|exact">Exactly 2.5</option>
                <option value="3|exact">Exactly 3</option>
                <option value="4|exact">Exactly 4</option>
              </optgroup>
            </select>

            <select name="property_type" value={filters.property_type} onChange={handleChange} className={`${selectClass} w-32 text-xs py-2`}>
              <option value="">All Types</option>
              <option value="single_family">Single Family</option>
              <option value="townhouse">Townhouse</option>
              <option value="condo">Condo</option>
              <option value="multi_family">Multi-Family</option>
            </select>

            <button
              type="button"
              onClick={() => setShowMore((p) => !p)}
              className="text-xs font-medium text-blue-600 hover:text-blue-700 px-2 py-2"
            >
              {showMore ? 'Less' : 'More'}
              {!showMore && activeCount > 0 && ` (${activeCount})`}
            </button>

            <div className="flex items-center gap-2 ml-auto">
              <button type="submit" className="btn-primary text-xs px-4 py-2">Search</button>
              <button type="button" onClick={handleReset} className="btn-secondary text-xs px-3 py-2">Reset</button>
            </div>
          </div>

          {/* Expanded filters */}
          {showMore && (
            <div className="flex flex-wrap items-center gap-2 mt-2 pt-2 border-t border-gray-100">
              <input type="number" name="min_size" value={filters.min_size} onChange={handleChange}
                placeholder="Min sqft" className="input-field w-28 text-xs py-2" />
              <input type="number" name="max_size" value={filters.max_size} onChange={handleChange}
                placeholder="Max sqft" className="input-field w-28 text-xs py-2" />
              <input type="number" name="radius_miles" value={filters.radius_miles} onChange={handleChange}
                placeholder="Radius (mi)" className="input-field w-28 text-xs py-2" min="0" max="50" />
              <input type="number" name="min_score" value={filters.min_score} onChange={handleChange}
                placeholder="Min Score" className="input-field w-28 text-xs py-2" min="0" max="100" />
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default SearchFilters;
