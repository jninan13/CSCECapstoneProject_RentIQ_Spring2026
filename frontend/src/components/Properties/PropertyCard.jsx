import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { favoritesAPI, getStreetViewUrl } from '../../services/api';

const PropertyCard = ({ property, onFavoriteChange, onCompareToggle, isCompared }) => {
  const [isFavorited, setIsFavorited] = useState(property.is_favorited);
  const [imgError, setImgError] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleFavoriteClick = async (e) => {
    e.stopPropagation();
    setLoading(true);
    try {
      if (isFavorited) {
        await favoritesAPI.remove(property.id);
      } else {
        await favoritesAPI.add(property.id);
      }
      setIsFavorited(!isFavorited);
      if (onFavoriteChange) onFavoriteChange();
    } catch (error) {
      console.error('Failed to update favorite:', error);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'bg-green-100 text-green-700';
    if (score >= 60) return 'bg-amber-100 text-amber-700';
    return 'bg-red-100 text-red-700';
  };

  return (
    <div
      className="card cursor-pointer hover:shadow-md transition-shadow duration-200 group"
      onClick={() => navigate(`/properties/${property.id}`)}
    >
      {/* Image */}
      <div className="relative aspect-[4/3] bg-gray-100">
        {!imgError ? (
          <img
            src={getStreetViewUrl(property.id)}
            alt={property.address}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300">
            <svg className="w-12 h-12" fill="none" stroke="currentColor" strokeWidth={1} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </div>
        )}

        {/* Favorite heart overlay */}
        <button
          onClick={handleFavoriteClick}
          disabled={loading}
          className="absolute top-2.5 right-2.5 p-1.5 rounded-full bg-white/80 backdrop-blur-sm hover:bg-white transition-colors shadow-sm"
        >
          <svg
            className={`w-5 h-5 ${isFavorited ? 'fill-red-500 text-red-500' : 'fill-none text-gray-600'}`}
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        </button>

        {/* Score badge */}
        <div className={`absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md text-xs font-bold ${getScoreColor(property.profitability_score)}`}>
          {property.profitability_score.toFixed(0)}
        </div>
      </div>

      {/* Info */}
      <div className="p-4">
        <p className="text-lg font-bold text-gray-900">
          ${parseFloat(property.price).toLocaleString()}
        </p>
        <p className="text-sm text-gray-500 mt-0.5">
          <span className="font-medium text-gray-700">{property.bedrooms}</span> bds
          <span className="mx-1 text-gray-300">|</span>
          <span className="font-medium text-gray-700">{property.bathrooms}</span> ba
          <span className="mx-1 text-gray-300">|</span>
          <span className="font-medium text-gray-700">{property.size_sqft ? Math.round(property.size_sqft * 10.7639).toLocaleString() : '—'}</span> sqft
        </p>
        <p className="text-sm text-gray-500 mt-1 truncate">
          {property.address}, {property.city}, {property.state} {property.zip_code}
        </p>

        {/* Compare + metrics row */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
          <div className="flex gap-3 text-xs text-gray-500">
            {property.estimated_rent && (
              <span>Rent: <span className="font-medium text-gray-700">${parseFloat(property.estimated_rent).toLocaleString()}/mo</span></span>
            )}
            {property.cap_rate != null && (
              <span>Cap: <span className="font-medium text-gray-700">{(property.cap_rate * 100).toFixed(1)}%</span></span>
            )}
          </div>

          {onCompareToggle && (
            <button
              onClick={(e) => { e.stopPropagation(); onCompareToggle(property); }}
              className={`text-xs px-3 py-1 rounded-md font-medium transition-colors ${
                isCompared
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {isCompared ? 'Selected' : 'Compare'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PropertyCard;
