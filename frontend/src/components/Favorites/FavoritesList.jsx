import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { favoritesAPI } from '../../services/api';
import PropertyCard from '../Properties/PropertyCard';

const FavoritesList = () => {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [compareList, setCompareList] = useState([]);
  const navigate = useNavigate();

  const handleCompareToggle = (property) => {
    const exists = compareList.some((p) => p.id === property.id);
    if (exists) { setCompareList(compareList.filter((p) => p.id !== property.id)); return; }
    if (compareList.length < 3) { setCompareList([...compareList, property]); }
    else { alert('You can compare up to 3 properties.'); }
  };

  useEffect(() => { loadFavorites(); }, []);

  const loadFavorites = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await favoritesAPI.getAll();
      setFavorites(response.data);
    } catch (err) {
      setError('Failed to load favorites');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-400">Loading favorites...</p></div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Saved Properties</h1>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>
        )}

        {compareList.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg mb-4 px-4 py-2.5 flex items-center justify-between">
            <span className="text-sm text-blue-800 font-medium">
              {compareList.length} propert{compareList.length === 1 ? 'y' : 'ies'} selected
            </span>
            <div className="flex gap-2">
              <button onClick={() => navigate('/properties/compare', { state: { compareList } })} className="btn-primary text-xs px-4 py-1.5">Compare Now</button>
              <button onClick={() => setCompareList([])} className="btn-secondary text-xs px-3 py-1.5">Clear</button>
            </div>
          </div>
        )}

        {favorites.length === 0 ? (
          <div className="text-center py-20">
            <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            <p className="text-lg font-semibold text-gray-500 mb-1">No saved properties yet</p>
            <p className="text-sm text-gray-400 mb-4">Start exploring and save properties you're interested in.</p>
            <button onClick={() => navigate('/properties')} className="btn-primary">Browse Properties</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {favorites.map((favorite) => (
              <PropertyCard
                key={favorite.id}
                property={favorite.property}
                onFavoriteChange={loadFavorites}
                onCompareToggle={handleCompareToggle}
                isCompared={compareList.some((p) => p.id === favorite.property.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FavoritesList;
