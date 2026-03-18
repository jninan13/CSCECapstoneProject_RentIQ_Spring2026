import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const PropertyCompare = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const compareList = location.state?.compareList || [];

  if (compareList.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 transition-colors duration-300">
        <div className="max-w-5xl mx-auto px-4">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Compare Properties</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">No properties selected for comparison.</p>
          <button onClick={() => navigate('/properties')} className="btn-primary">
            Back to Properties
          </button>
        </div>
      </div>
    );
  }

  const formatCurrency = (value) =>
    value != null ? `$${parseFloat(value).toLocaleString()}` : '—';

  const formatPercent = (value) =>
    value != null ? `${(value * 100).toFixed(1)}%` : '—';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <button
          onClick={() => navigate('/properties')}
          className="mb-6 text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 flex items-center"
        >
          ← Back to Properties
        </button>

        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Compare Properties</h1>

        <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-xl shadow dark:shadow-gray-950/30">
          <table className="min-w-full border-collapse">
            <thead>
              <tr>
                <th className="p-4 border-b border-gray-200 dark:border-gray-700 text-left bg-gray-50 dark:bg-gray-800/80 text-gray-700 dark:text-gray-300">Metric</th>
                {compareList.map((property) => (
                  <th key={property.id} className="p-4 border-b border-gray-200 dark:border-gray-700 text-left bg-gray-50 dark:bg-gray-800/80 min-w-[250px]">
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">{property.address}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {property.city}, {property.state}
                      </p>
                      <button
                        onClick={() => navigate(`/properties/${property.id}`)}
                        className="mt-2 text-sm text-primary-600 dark:text-primary-400 hover:underline"
                      >
                        View Details
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              <CompareRow label="Price" values={compareList.map((p) => formatCurrency(p.price))} />
              <CompareRow label="Profitability Score" values={compareList.map((p) => p.profitability_score?.toFixed(1) || '—')} />
              <CompareRow label="Estimated Rent" values={compareList.map((p) => p.estimated_rent ? `${formatCurrency(p.estimated_rent)}/mo` : '—')} />
              <CompareRow label="Cap Rate" values={compareList.map((p) => formatPercent(p.cap_rate))} />
              <CompareRow label="Cash-on-Cash ROI" values={compareList.map((p) => formatPercent(p.cash_on_cash_roi))} />
              <CompareRow label="Deal Score" values={compareList.map((p) => p.deal_score != null ? `${p.deal_score.toFixed(0)}/100` : '—')} />
              <CompareRow label="Square Footage" values={compareList.map((p) => p.size_sqft ? `${p.size_sqft.toLocaleString()} sqft` : '—')} />
              <CompareRow label="Bedrooms" values={compareList.map((p) => p.bedrooms ?? '—')} />
              <CompareRow label="Bathrooms" values={compareList.map((p) => p.bathrooms ?? '—')} />
              <CompareRow label="Property Type" values={compareList.map((p) => p.property_type ? p.property_type.replace('_', ' ') : '—')} />
              <CompareRow label="Year Built" values={compareList.map((p) => p.year_built ?? '—')} />
              <CompareRow
                label="Price / Sqft"
                values={compareList.map((p) =>
                  p.price && p.size_sqft ? `$${(parseFloat(p.price) / p.size_sqft).toFixed(2)}` : '—'
                )}
              />
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const CompareRow = ({ label, values }) => (
  <tr>
    <td className="p-4 border-b border-gray-200 dark:border-gray-700 font-medium text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/80">{label}</td>
    {values.map((value, index) => (
      <td key={index} className="p-4 border-b border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100">
        {value}
      </td>
    ))}
  </tr>
);

export default PropertyCompare;