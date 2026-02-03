/**
 * Property card component for displaying property summary.
 * Shows key metrics and favorite button.
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { favoritesAPI } from '../../services/api';

const PropertyCard = ({ property, onFavoriteChange }) => {
  const [isFavorited, setIsFavorited] = useState(property.is_favorited);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleFavoriteClick = async (e) => {
    e.stopPropagation();
    setLoading(true);

    try {
      if (isFavorited) {
        // Find favorite ID (would need to be passed or fetched)
        // For simplicity, this assumes we can remove by property_id
        // In production, track favorite_id separately
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
    if (score >= 80) return 'text-green-600 bg-green-100';
    if (score >= 60) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  return (
    <div
      className="card hover:shadow-lg transition-shadow cursor-pointer"
      onClick={() => navigate(`/properties/${property.id}`)}
    >
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900">{property.address}</h3>
          <p className="text-sm text-gray-600">
            {property.city}, {property.state} {property.zip_code}
          </p>
        </div>
        
        <button
          onClick={handleFavoriteClick}
          disabled={loading}
          className="ml-4 p-2 rounded-full hover:bg-gray-100 transition-colors"
        >
          <svg
            className={`w-6 h-6 ${isFavorited ? 'fill-red-500 text-red-500' : 'fill-none text-gray-400'}`}
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
            />
          </svg>
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-2xl font-bold text-primary-600">
            ${parseFloat(property.price).toLocaleString()}
          </p>
          <p className="text-sm text-gray-600">Price</p>
        </div>
        
        <div>
          <p className={`text-2xl font-bold px-3 py-1 rounded-lg inline-block ${getScoreColor(property.profitability_score)}`}>
            {property.profitability_score.toFixed(1)}
          </p>
          <p className="text-sm text-gray-600">Score</p>
        </div>
      </div>

      <div className="flex space-x-6 text-sm text-gray-700">
        <div className="flex items-center">
          <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          {property.size_sqft.toLocaleString()} sqft
        </div>
        
        <div className="flex items-center">
          <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
          {property.bedrooms} bed
        </div>
        
        <div className="flex items-center">
          <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
          </svg>
          {property.bathrooms} bath
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200">
        <p className="text-sm text-gray-600">
          <span className="font-medium">{property.property_type}</span>
          {property.year_built && ` • Built ${property.year_built}`}
        </p>
        {property.estimated_rent && (
          <p className="text-sm text-gray-600 mt-1">
            Est. Rent: ${parseFloat(property.estimated_rent).toLocaleString()}/mo
          </p>
        )}
      </div>
    </div>
  );
};

export default PropertyCard;
