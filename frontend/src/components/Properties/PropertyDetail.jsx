/**
 * Detailed property view page.
 */
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { propertiesAPI, favoritesAPI } from '../../services/api';

const PropertyDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isFavorited, setIsFavorited] = useState(false);

  useEffect(() => {
    loadProperty();
  }, [id]);

  const loadProperty = async () => {
    try {
      const response = await propertiesAPI.getById(id);
      setProperty(response.data);
      setIsFavorited(response.data.is_favorited);
    } catch (err) {
      setError('Failed to load property details');
      console.error('Load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFavoriteClick = async () => {
    try {
      if (isFavorited) {
        await favoritesAPI.remove(property.id);
      } else {
        await favoritesAPI.add(property.id);
      }
      setIsFavorited(!isFavorited);
    } catch (error) {
      console.error('Failed to update favorite:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-red-600">{error || 'Property not found'}</p>
          <button onClick={() => navigate('/properties')} className="btn-primary mt-4">
            Back to Properties
          </button>
        </div>
      </div>
    );
  }

  const getScoreColor = (score) => {
    if (score >= 80) return 'bg-green-100 text-green-800';
    if (score >= 60) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <button
          onClick={() => navigate('/properties')}
          className="mb-6 text-primary-600 hover:text-primary-700 flex items-center"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Properties
        </button>

        <div className="card">
          {/* Header */}
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{property.address}</h1>
              <p className="text-lg text-gray-600">
                {property.city}, {property.state} {property.zip_code}
              </p>
            </div>
            
            <button
              onClick={handleFavoriteClick}
              className="p-3 rounded-full hover:bg-gray-100 transition-colors"
            >
              <svg
                className={`w-8 h-8 ${isFavorited ? 'fill-red-500 text-red-500' : 'fill-none text-gray-400'}`}
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

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-primary-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Price</p>
              <p className="text-3xl font-bold text-primary-600">
                ${parseFloat(property.price).toLocaleString()}
              </p>
            </div>
            
            <div className={`p-4 rounded-lg ${getScoreColor(property.profitability_score)}`}>
              <p className="text-sm mb-1">Profitability Score</p>
              <p className="text-3xl font-bold">{property.profitability_score.toFixed(1)}</p>
            </div>
            
            {property.estimated_rent && (
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Est. Monthly Rent</p>
                <p className="text-3xl font-bold text-green-600">
                  ${parseFloat(property.estimated_rent).toLocaleString()}
                </p>
              </div>
            )}
          </div>

          {/* Property Details */}
          <div className="border-t border-gray-200 pt-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Property Details</h2>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-600">Square Footage</p>
                <p className="text-lg font-semibold">{property.size_sqft.toLocaleString()} sqft</p>
              </div>
              
              <div>
                <p className="text-sm text-gray-600">Bedrooms</p>
                <p className="text-lg font-semibold">{property.bedrooms}</p>
              </div>
              
              <div>
                <p className="text-sm text-gray-600">Bathrooms</p>
                <p className="text-lg font-semibold">{property.bathrooms}</p>
              </div>
              
              <div>
                <p className="text-sm text-gray-600">Property Type</p>
                <p className="text-lg font-semibold capitalize">{property.property_type.replace('_', ' ')}</p>
              </div>
              
              {property.year_built && (
                <div>
                  <p className="text-sm text-gray-600">Year Built</p>
                  <p className="text-lg font-semibold">{property.year_built}</p>
                </div>
              )}
              
              <div>
                <p className="text-sm text-gray-600">Price/sqft</p>
                <p className="text-lg font-semibold">
                  ${(parseFloat(property.price) / property.size_sqft).toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          {/* Investment Analysis */}
          {property.estimated_rent && (
            <div className="border-t border-gray-200 mt-6 pt-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Investment Analysis</h2>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Monthly Rent Estimate</p>
                    <p className="text-lg font-semibold">
                      ${parseFloat(property.estimated_rent).toLocaleString()}
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-600">Annual Income Estimate</p>
                    <p className="text-lg font-semibold">
                      ${(parseFloat(property.estimated_rent) * 12).toLocaleString()}
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-600">Price-to-Rent Ratio</p>
                    <p className="text-lg font-semibold">
                      {(parseFloat(property.price) / parseFloat(property.estimated_rent)).toFixed(1)}
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-600">Potential ROI (Year 1)</p>
                    <p className="text-lg font-semibold">
                      {((parseFloat(property.estimated_rent) * 12 / parseFloat(property.price)) * 100).toFixed(2)}%
                    </p>
                  </div>
                </div>
                
                <p className="text-xs text-gray-500 mt-4">
                  * These are estimates for informational purposes only. Actual returns may vary based on 
                  market conditions, maintenance costs, vacancy rates, and other factors.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PropertyDetail;
