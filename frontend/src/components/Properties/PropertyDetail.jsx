/**
 * Detailed property view page.
 */
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { propertiesAPI, favoritesAPI } from '../../services/api';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const PropertyDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isFavorited, setIsFavorited] = useState(false);

  const [analysis, setAnalysis] = useState(null);
  const [analysisLoading, setAnalysisLoading] = useState(true);
  const [analysisUpdating, setAnalysisUpdating] = useState(false);
  const [downPaymentPct, setDownPaymentPct] = useState(0.2);
  const [vacancyRate, setVacancyRate] = useState(0.05);
  const [interestRate, setInterestRate] = useState(0.06);
  const debounceRef = useRef(null);
  const lastPropertyIdRef = useRef(null);
  const reportRef = useRef(null);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
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

    loadProperty();
  }, [id]);

  const isInitialLoad = useRef(true);

  useEffect(() => {
    if (!property || !property.estimated_rent) {
      setAnalysis(null);
      setAnalysisLoading(false);
      setAnalysisUpdating(false);
      return;
    }

    if (lastPropertyIdRef.current !== property.id) {
      lastPropertyIdRef.current = property.id;
      isInitialLoad.current = true;
    }

    const loadAnalysis = async () => {
      const isFirstLoad = isInitialLoad.current;
      if (isFirstLoad) {
        setAnalysisLoading(true);
      } else {
        setAnalysisUpdating(true);
      }

      try {
        const response = await propertiesAPI.getAnalysis(property.id, {
          down_payment_pct: downPaymentPct,
          vacancy_rate: vacancyRate,
          interest_rate_annual: interestRate,
        });
        setAnalysis(response.data);
      } catch (err) {
        console.error('Failed to load investment analysis:', err);
        setAnalysis(null);
      } finally {
        setAnalysisLoading(false);
        setAnalysisUpdating(false);
        isInitialLoad.current = false;
      }
    };

    if (isInitialLoad.current) {
      loadAnalysis();
    } else {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(loadAnalysis, 400);
      return () => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
      };
    }
  }, [property, downPaymentPct, vacancyRate, interestRate]);

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

  const handleExportPDF = async () => {
    if (!reportRef.current) return;
    setIsExporting(true);
    try {
      const canvas = await html2canvas(reportRef.current, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4',
      });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      let heightLeft = pdfHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pdf.internal.pageSize.getHeight();

      while (heightLeft >= 0) {
        position = heightLeft - pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
        heightLeft -= pdf.internal.pageSize.getHeight();
      }

      pdf.save(`RentIQ_Analysis_${property.address.replace(/[\W_]+/g, '_')}.pdf`);
    } catch (error) {
      console.error('Error exporting PDF:', error);
    } finally {
      setIsExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
        <div className="text-xl text-gray-600 dark:text-gray-400">Loading...</div>
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
        <div className="text-center">
          <p className="text-xl text-red-600 dark:text-red-400">{error || 'Property not found'}</p>
          <button onClick={() => navigate('/properties')} className="btn-primary mt-4">
            Back to Properties
          </button>
        </div>
      </div>
    );
  }

  const getScoreColor = (score) => {
    if (score >= 80) return 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300';
    if (score >= 60) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300';
    return 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300';
  };

  const streetViewUrl = property?.id
    ? `http://localhost:8000/api/properties/${property.id}/streetview.jpg`
    : '';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 transition-colors duration-300">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <button
          onClick={() => navigate('/properties')}
          className="mb-6 text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 flex items-center"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Properties
        </button>

        <div className="card" ref={reportRef}>
          {/* Property Image */}
          <div className="mb-6 overflow-hidden rounded-xl">
            <img
              src={streetViewUrl}
              alt={property.address}
              className="h-64 w-full object-cover"
              loading="lazy"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                const fallback = e.currentTarget.nextSibling;
                if (fallback) fallback.style.display = 'flex';
              }}
            />
            <div
              className="h-64 w-full items-center justify-center bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
              style={{ display: 'none' }}
            >
              No Street View available
            </div>
          </div>

          {/* Header */}
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{property.address}</h1>
              <p className="text-lg text-gray-600 dark:text-gray-400">
                {property.city}, {property.state} {property.zip_code}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleExportPDF}
                disabled={isExporting}
                className={`btn-secondary flex items-center gap-2 ${isExporting ? 'opacity-50 cursor-not-allowed' : ''}`}
                title="Export to PDF"
              >
                {isExporting ? (
                  <span className="inline-block w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></span>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                )}
                {isExporting ? 'Exporting...' : 'Export'}
              </button>

              <button
                onClick={handleFavoriteClick}
                className="p-3 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                title={isFavorited ? 'Remove from Favorites' : 'Add to Favorites'}
              >
                <svg
                  className={`w-8 h-8 ${isFavorited ? 'fill-red-500 text-red-500' : 'fill-none text-gray-400 dark:text-gray-500'}`}
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
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-primary-50 dark:bg-primary-900/20 p-4 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Price</p>
              <p className="text-3xl font-bold text-primary-600 dark:text-primary-400">
                ${parseFloat(property.price).toLocaleString()}
              </p>
            </div>

            <div className={`p-4 rounded-lg ${getScoreColor(property.profitability_score)}`}>
              <p className="text-sm mb-1">Profitability Score</p>
              <p className="text-3xl font-bold">{property.profitability_score.toFixed(1)}</p>
            </div>

            {property.estimated_rent && (
              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Est. Monthly Rent</p>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                  ${parseFloat(property.estimated_rent).toLocaleString()}
                </p>
              </div>
            )}
          </div>

          {/* Property Details */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Property Details</h2>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Square Footage</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">{property.size_sqft.toLocaleString()} sqft</p>
              </div>

              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Bedrooms</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">{property.bedrooms}</p>
              </div>

              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Bathrooms</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">{property.bathrooms}</p>
              </div>

              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Property Type</p>
                <p className="text-lg font-semibold capitalize text-gray-900 dark:text-white">{property.property_type.replace('_', ' ')}</p>
              </div>

              {property.year_built && (
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Year Built</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">{property.year_built}</p>
                </div>
              )}

              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Price/sqft</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  ${(parseFloat(property.price) / property.size_sqft).toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          {/* Investment Analysis */}
          {property.estimated_rent && (
            <div className="border-t border-gray-200 dark:border-gray-700 mt-6 pt-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Investment Analysis</h2>

              {analysisLoading && (
                <div className="text-sm text-gray-500 dark:text-gray-400 mb-4">Loading investment metrics…</div>
              )}

              {analysisUpdating && (
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1">
                  <span className="inline-block w-3 h-3 border-2 border-gray-400 dark:border-gray-500 border-t-transparent rounded-full animate-spin" />
                  Updating…
                </div>
              )}

              {analysis && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <SummaryCard label="Cap Rate" value={analysis.metrics.cap_rate} format="percent" />
                    <SummaryCard label="Cash-on-Cash ROI" value={analysis.metrics.cash_on_cash_roi} format="percent" />
                    <SummaryCard
                      label={`${analysis.metrics.assumptions.analysis_horizon_years}-Year ROI`}
                      value={analysis.metrics.total_roi_horizon}
                      format="percent"
                    />
                    <SummaryCard label="Deal Score" value={analysis.metrics.deal_score} format="score" />
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg mb-6">
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Annual Cash Flow Breakdown</h3>
                    <table className="w-full text-sm">
                      <tbody>
                        <CashRow label="Gross Rent" value={analysis.metrics.cash_flow.gross_rent_annual} />
                        <CashRow label="Vacancy Loss" value={analysis.metrics.cash_flow.vacancy_loss_annual} negative />
                        <CashRow
                          label="Effective Gross Income"
                          value={analysis.metrics.cash_flow.effective_gross_income_annual}
                          strong
                        />
                        <CashRow
                          label="Operating Expenses"
                          value={analysis.metrics.cash_flow.operating_expenses_annual}
                          negative
                        />
                        <CashRow
                          label="Net Operating Income (NOI)"
                          value={analysis.metrics.cash_flow.noi_annual}
                          strong
                        />
                        <CashRow
                          label="Debt Service"
                          value={analysis.metrics.cash_flow.debt_service_annual}
                          negative
                        />
                        <CashRow
                          label="Annual Cash Flow"
                          value={analysis.metrics.cash_flow.cash_flow_annual}
                          strong
                          highlight
                        />
                      </tbody>
                    </table>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg mb-6">
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Gross Rent Breakdown</h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={[
                              { name: 'Operating Expenses', value: parseFloat(analysis.metrics.cash_flow.operating_expenses_annual) || 0, color: '#f59e0b' },
                              { name: 'Debt Service', value: parseFloat(analysis.metrics.cash_flow.debt_service_annual) || 0, color: '#ef4444' },
                              { name: 'Vacancy Loss', value: parseFloat(analysis.metrics.cash_flow.vacancy_loss_annual) || 0, color: '#6b7280' },
                              { name: 'Net Cash Flow', value: Math.max(0, parseFloat(analysis.metrics.cash_flow.cash_flow_annual) || 0), color: '#10b981' }
                            ].filter(item => item.value > 0)}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={2}
                            dataKey="value"
                            stroke="transparent"
                          >
                            {
                              [
                                { name: 'Operating Expenses', value: parseFloat(analysis.metrics.cash_flow.operating_expenses_annual) || 0, color: '#f59e0b' },
                                { name: 'Debt Service', value: parseFloat(analysis.metrics.cash_flow.debt_service_annual) || 0, color: '#ef4444' },
                                { name: 'Vacancy Loss', value: parseFloat(analysis.metrics.cash_flow.vacancy_loss_annual) || 0, color: '#6b7280' },
                                { name: 'Net Cash Flow', value: Math.max(0, parseFloat(analysis.metrics.cash_flow.cash_flow_annual) || 0), color: '#10b981' }
                              ].filter(item => item.value > 0).map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))
                            }
                          </Pie>
                          <RechartsTooltip formatter={(value) => `$${value.toLocaleString()}`} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Scenario Controls</h3>
                      <SliderControl
                        label="Down Payment %"
                        value={downPaymentPct}
                        min={0.1}
                        max={0.5}
                        step={0.05}
                        onChange={setDownPaymentPct}
                      />
                      <SliderControl
                        label="Vacancy Rate %"
                        value={vacancyRate}
                        min={0}
                        max={0.15}
                        step={0.01}
                        onChange={setVacancyRate}
                      />
                      <SliderControl
                        label="Interest Rate %"
                        value={interestRate}
                        min={0.03}
                        max={0.09}
                        step={0.005}
                        onChange={setInterestRate}
                      />
                    </div>

                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Key Assumptions</h3>
                      <ul className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
                        <li>
                          <span className="text-gray-500 dark:text-gray-400">Down payment: </span>
                          {(parseFloat(analysis.metrics.assumptions.down_payment_pct) * 100).toFixed(1)}%
                        </li>
                        <li>
                          <span className="text-gray-500 dark:text-gray-400">Interest rate: </span>
                          {(parseFloat(analysis.metrics.assumptions.interest_rate_annual) * 100).toFixed(2)}%
                        </li>
                        <li>
                          <span className="text-gray-500 dark:text-gray-400">Vacancy rate: </span>
                          {(parseFloat(analysis.metrics.assumptions.vacancy_rate) * 100).toFixed(1)}%
                        </li>
                        <li>
                          <span className="text-gray-500 dark:text-gray-400">Appreciation: </span>
                          {(parseFloat(analysis.metrics.assumptions.appreciation_rate_annual) * 100).toFixed(1)}%
                        </li>
                        <li>
                          <span className="text-gray-500 dark:text-gray-400">Analysis horizon: </span>
                          {analysis.metrics.assumptions.analysis_horizon_years} years
                        </li>
                      </ul>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
                        These are estimates for informational purposes only. Actual performance depends on
                        maintenance, market conditions, vacancy, and financing terms.
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PropertyDetail;

const SummaryCard = ({ label, value, format }) => {
  if (value == null) return null;

  let display = value;
  if (format === 'percent') {
    display = `${(value * 100).toFixed(1)}%`;
  } else if (format === 'score') {
    display = `${value.toFixed(0)}/100`;
  }

  return (
    <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
      <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">{label}</p>
      <p className="text-xl font-semibold text-gray-900 dark:text-white">{display}</p>
    </div>
  );
};

const CashRow = ({ label, value, negative, strong, highlight }) => {
  const num = parseFloat(value);
  const formatted = isNaN(num)
    ? '—'
    : `$${num.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

  return (
    <tr className={highlight ? 'bg-green-50 dark:bg-green-900/20 font-semibold text-gray-900 dark:text-white' : ''}>
      <td className="py-1 pr-4 text-gray-600 dark:text-gray-400">{label}</td>
      <td
        className={`py-1 text-right ${negative ? 'text-red-600 dark:text-red-400' : strong ? 'text-gray-900 dark:text-white font-semibold' : 'text-gray-800 dark:text-gray-300'
          }`}
      >
        {negative ? '-' : ''}
        {formatted}
      </td>
    </tr>
  );
};

const SliderControl = ({ label, value, min, max, step, onChange }) => (
  <div className="mb-3">
    <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
      <span>{label}</span>
      <span>{(value * 100).toFixed(1)}%</span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="w-full accent-primary-600 dark:accent-primary-500"
    />
  </div>
);
