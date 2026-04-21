import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { propertiesAPI, favoritesAPI, getStreetViewUrl } from '../../services/api';
import NoteEditor from './NoteEditor';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';
import jsPDF from 'jspdf';

const PIE_COLORS = ['#3B82F6', '#F59E0B', '#94A3B8', '#10B981'];

const PropertyDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isFavorited, setIsFavorited] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [searchParams] = useSearchParams();
  const fromPage = searchParams.get('page') || '1';

  const [analysis, setAnalysis] = useState(null);
  const [analysisLoading, setAnalysisLoading] = useState(true);
  const [analysisUpdating, setAnalysisUpdating] = useState(false);
  const [downPaymentPct, setDownPaymentPct] = useState(0.2);
  const [vacancyRate, setVacancyRate] = useState(0.05);
  const [interestRate, setInterestRate] = useState(0.06);
  const debounceRef = useRef(null);
  const lastPropertyIdRef = useRef(null);
  const [isExporting, setIsExporting] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef(null);

  const [aiExplanation, setAiExplanation] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target)) setShowExportMenu(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
    (async () => {
      try {
        const response = await propertiesAPI.getById(id);
        setProperty(response.data);
        setIsFavorited(response.data.is_favorited);
      } catch (err) {
        setError('Failed to load property details');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const isInitialLoad = useRef(true);
  useEffect(() => {
    if (!property || !property.estimated_rent) { setAnalysis(null); setAnalysisLoading(false); setAnalysisUpdating(false); return; }
    if (lastPropertyIdRef.current !== property.id) { lastPropertyIdRef.current = property.id; isInitialLoad.current = true; }
    const load = async () => {
      if (isInitialLoad.current) setAnalysisLoading(true); else setAnalysisUpdating(true);
      try {
        const r = await propertiesAPI.getAnalysis(property.id, { down_payment_pct: downPaymentPct, vacancy_rate: vacancyRate, interest_rate_annual: interestRate });
        setAnalysis(r.data);
      } catch { setAnalysis(null); }
      finally { setAnalysisLoading(false); setAnalysisUpdating(false); isInitialLoad.current = false; }
    };
    if (isInitialLoad.current) { load(); } else {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(load, 400);
      return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    }
  }, [property, downPaymentPct, vacancyRate, interestRate]);

  const handleFavoriteClick = async () => {
    try {
      if (isFavorited) await favoritesAPI.remove(property.id); else await favoritesAPI.add(property.id);
      setIsFavorited(!isFavorited);
    } catch (e) { console.error('Failed to update favorite:', e); }
  };

  // PDF/CSV export logic preserved from original
  const handleExportPDF = () => {
    if (!property) return; setIsExporting(true);
    try {
      const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
      const pw = pdf.internal.pageSize.getWidth(), ph = pdf.internal.pageSize.getHeight(), m = 15, cw = pw - m * 2;
      let y = m;
      const br = (n) => { if (y + n > ph - m) { pdf.addPage(); y = m; } };
      const fc = (v) => v != null ? `$${parseFloat(v).toLocaleString()}` : '—';
      const fp = (v) => v != null ? `${(v * 100).toFixed(1)}%` : '—';
      const sec = (t, rows) => { br(20); pdf.setFont('helvetica','bold'); pdf.setFontSize(12); pdf.text(t,m,y); y+=2; pdf.setLineWidth(0.3); pdf.line(m,y,pw-m,y); y+=5; rows.forEach(([k,v],i)=>{ br(6); if(i%2===0){pdf.setFillColor(245,245,245);pdf.rect(m,y-3.5,cw,6,'F');} pdf.setFont('helvetica','bold');pdf.setFontSize(9);pdf.text(`${k}:`,m+2,y);pdf.setFont('helvetica','normal');pdf.text(String(v),m+60,y);y+=6;}); y+=6; };
      pdf.setFont('helvetica','bold');pdf.setFontSize(18);pdf.text('RentIQ',m,y);pdf.setFontSize(9);pdf.setFont('helvetica','normal');pdf.text('Property Analysis Report',pw-m,y,{align:'right'});y+=4;pdf.setDrawColor(0);pdf.setLineWidth(0.5);pdf.line(m,y,pw-m,y);y+=6;
      pdf.text(`Report generated: ${new Date().toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'})}`,m,y);y+=8;
      pdf.setFont('helvetica','bold');pdf.setFontSize(14);pdf.text(property.address,m,y);y+=5;pdf.setFont('helvetica','normal');pdf.setFontSize(10);pdf.text(`${property.city}, ${property.state} ${property.zip_code||''}`,m,y);y+=8;
      sec('Key Metrics',[['Price',fc(property.price)],['Profitability Score',property.profitability_score?.toFixed(1)||'—'],['Est. Monthly Rent',property.estimated_rent?`${fc(property.estimated_rent)}/mo`:'—']]);
      sec('Property Details',[['Sqft',property.size_sqft?`${Math.round(property.size_sqft * 10.7639).toLocaleString()} sqft`:'—'],['Bedrooms',String(property.bedrooms??'—')],['Bathrooms',String(property.bathrooms??'—')],['Type',property.property_type?property.property_type.replace('_',' '):'—'],['Year Built',String(property.year_built??'—')]]);
      if(analysis){sec('Investment Analysis',[['Cap Rate',fp(analysis.metrics.cap_rate)],['Cash-on-Cash ROI',fp(analysis.metrics.cash_on_cash_roi)],[`${analysis.metrics.assumptions.analysis_horizon_years}-Year ROI`,fp(analysis.metrics.total_roi_horizon)]]);}
      br(15);pdf.setDrawColor(0);pdf.setLineWidth(0.3);pdf.line(m,y,pw-m,y);y+=5;pdf.setFont('helvetica','italic');pdf.setFontSize(7);pdf.text('Disclaimer: For informational purposes only.',m,y);
      pdf.save(`RentIQ_${property.address.replace(/[\W_]+/g,'_')}.pdf`);
    } catch(e){console.error(e);} finally{setIsExporting(false);}
  };
  const handleExportCSV = () => {
    if(!property)return;setIsExporting(true);
    try{
      const fc=(v)=>v!=null?`$${parseFloat(v).toLocaleString()}`:'—';const fp=(v)=>v!=null?`${(v*100).toFixed(1)}%`:'—';
      const rows=[['Field','Value'],['Address',property.address],['City',property.city],['Price',fc(property.price)],['Score',property.profitability_score?.toFixed(1)||'—'],['Sqft',property.size_sqft?Math.round(property.size_sqft*10.7639).toLocaleString():'—'],['Beds',String(property.bedrooms??'—')],['Baths',String(property.bathrooms??'—')]];
      if(analysis){rows.push(['',''],['Cap Rate',fp(analysis.metrics.cap_rate)],['Cash-on-Cash',fp(analysis.metrics.cash_on_cash_roi)]);}
      const csv=rows.map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
      const b=new Blob([csv],{type:'text/csv;charset=utf-8;'});const u=URL.createObjectURL(b);const a=document.createElement('a');a.href=u;a.download=`RentIQ_${property.address.replace(/[\W_]+/g,'_')}.csv`;document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(u);
    }catch(e){console.error(e);}finally{setIsExporting(false);}
  };
  const handleExport = (t) => { setShowExportMenu(false); t==='pdf'?handleExportPDF():handleExportCSV(); };

  const handleExplainWithAI = async () => {
    if(!property)return;setAiLoading(true);setAiError(null);setAiExplanation(null);
    try{const r=await propertiesAPI.getExplanation(property.id,{down_payment_pct:downPaymentPct,vacancy_rate:vacancyRate,interest_rate_annual:interestRate});setAiExplanation(r.data.explanation);}
    catch(e){setAiError(e.response?.data?.detail||'Failed to generate AI explanation.');}finally{setAiLoading(false);}
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-400">Loading...</p></div>;
  if (error || !property) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <p className="text-lg text-red-500">{error || 'Property not found'}</p>
        <button onClick={() => navigate('/properties')} className="btn-primary mt-4">Back to Properties</button>
      </div>
    </div>
  );

  const getScoreColor = (s) => { if(s>=80) return 'bg-green-100 text-green-700'; if(s>=60) return 'bg-amber-100 text-amber-700'; return 'bg-red-100 text-red-700'; };
  const pieData = analysis ? [
    { name: 'Operating Expenses', value: parseFloat(analysis.metrics.cash_flow.operating_expenses_annual)||0 },
    { name: 'Debt Service', value: parseFloat(analysis.metrics.cash_flow.debt_service_annual)||0 },
    { name: 'Vacancy Loss', value: parseFloat(analysis.metrics.cash_flow.vacancy_loss_annual)||0 },
    { name: 'Net Cash Flow', value: Math.max(0, parseFloat(analysis.metrics.cash_flow.cash_flow_annual)||0) }
  ].filter(i => i.value > 0) : [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Image */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <div className="relative bg-gray-200 rounded-xl overflow-hidden h-72 sm:h-96">
          {!imgError ? (
            <img src={getStreetViewUrl(property.id)} alt={property.address} className="w-full h-full object-cover" loading="lazy" onError={() => setImgError(true)} />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-300">
              <svg className="w-16 h-16" fill="none" stroke="currentColor" strokeWidth={1} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
            </div>
          )}
          <div className="absolute top-4 left-4">
            <button onClick={() => navigate(`/properties?page=${fromPage}`)} className="flex items-center gap-1.5 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-white shadow-sm transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
              Back
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* LEFT column */}
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="mb-6">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{property.address}</h1>
              <p className="text-gray-500 mt-1">{property.city}, {property.state} {property.zip_code}</p>
            </div>

            {/* Facts row */}
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-700 mb-6 pb-6 border-b border-gray-200">
              <span><strong>{property.bedrooms}</strong> beds</span>
              <span><strong>{property.bathrooms}</strong> baths</span>
              <span><strong>{property.size_sqft ? Math.round(property.size_sqft * 10.7639).toLocaleString() : '—'}</strong> sqft</span>
              <span className="capitalize">{property.property_type?.replace('_', ' ')}</span>
              {property.year_built && <span>Built {property.year_built}</span>}
            </div>

            {/* Investment Analysis */}
            {property.estimated_rent && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-gray-900">Investment Analysis</h2>
                  {analysisUpdating && <span className="inline-block w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />}
                </div>

                {analysisLoading ? (
                  <p className="text-sm text-gray-400">Loading investment metrics...</p>
                ) : analysis && (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
                      <MetricCard label="Cap Rate" value={analysis.metrics.cap_rate} />
                      <MetricCard label="Cash-on-Cash" value={analysis.metrics.cash_on_cash_roi} />
                      <MetricCard label={`${analysis.metrics.assumptions.analysis_horizon_years}Y ROI`} value={analysis.metrics.total_roi_horizon} />
                    </div>

                    {/* AI Explanation */}
                    {aiError && <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-sm text-red-600">{aiError}</div>}
                    {aiExplanation && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-sm font-semibold text-blue-800 flex items-center gap-1.5">
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" /></svg>
                            AI Analysis
                          </h3>
                          <button onClick={() => setAiExplanation(null)} className="text-blue-400 hover:text-blue-600"><svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
                        </div>
                        <div className="text-sm text-blue-900 leading-relaxed space-y-2">
                          {aiExplanation.split('\n').filter(Boolean).map((p, i) => <p key={i}>{p}</p>)}
                        </div>
                      </div>
                    )}

                    {/* Cash Flow Table */}
                    <div className="bg-white rounded-lg border border-gray-100 overflow-hidden mb-6">
                      <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
                        <h3 className="text-sm font-semibold text-gray-700">Annual Cash Flow</h3>
                      </div>
                      <table className="w-full text-sm">
                        <tbody>
                          <CashRow label="Gross Rent" value={analysis.metrics.cash_flow.gross_rent_annual} />
                          <CashRow label="Vacancy Loss" value={analysis.metrics.cash_flow.vacancy_loss_annual} negative />
                          <CashRow label="Effective Gross Income" value={analysis.metrics.cash_flow.effective_gross_income_annual} strong />
                          <CashRow label="Operating Expenses" value={analysis.metrics.cash_flow.operating_expenses_annual} negative />
                          <CashRow label="NOI" value={analysis.metrics.cash_flow.noi_annual} strong />
                          <CashRow label="Debt Service" value={analysis.metrics.cash_flow.debt_service_annual} negative />
                          <CashRow label="Annual Cash Flow" value={analysis.metrics.cash_flow.cash_flow_annual} strong highlight />
                        </tbody>
                      </table>
                    </div>

                    {/* Pie Chart */}
                    <div className="bg-white rounded-lg border border-gray-100 p-4 mb-6">
                      <h3 className="text-sm font-semibold text-gray-700 mb-3">Rent Breakdown</h3>
                      <div className="h-56">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={2} dataKey="value" stroke="transparent">
                              {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                            </Pie>
                            <RechartsTooltip formatter={(v) => `$${v.toLocaleString()}`} />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Scenario Controls */}
                    <div className="bg-white rounded-lg border border-gray-100 p-4">
                      <h3 className="text-sm font-semibold text-gray-700 mb-3">Scenario Controls</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <Slider label="Down Payment" value={downPaymentPct} min={0.1} max={0.5} step={0.05} onChange={setDownPaymentPct} />
                        <Slider label="Vacancy Rate" value={vacancyRate} min={0} max={0.15} step={0.01} onChange={setVacancyRate} />
                        <Slider label="Interest Rate" value={interestRate} min={0.03} max={0.09} step={0.005} onChange={setInterestRate} />
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Personal notes - bottom of page */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <NoteEditor propertyId={Number(id)} />
            </div>
          </div>

          {/* RIGHT sidebar */}
          <div className="lg:w-80 shrink-0">
            <div className="lg:sticky lg:top-20 space-y-4">
              {/* Price card */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <p className="text-2xl font-bold text-gray-900">${parseFloat(property.price).toLocaleString()}</p>
                {property.estimated_rent && (
                  <p className="text-sm text-gray-500 mt-1">Est. rent: ${parseFloat(property.estimated_rent).toLocaleString()}/mo</p>
                )}
                <div className={`inline-block mt-3 px-2.5 py-1 rounded-md text-xs font-bold ${getScoreColor(property.profitability_score)}`}>
                  Score: {property.profitability_score.toFixed(1)}
                </div>

                <div className="mt-4 space-y-2">
                  <button onClick={handleFavoriteClick} className={`w-full flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${isFavorited ? 'bg-red-50 text-red-600 border border-red-200' : 'btn-secondary'}`}>
                    <svg className={`w-4 h-4 ${isFavorited ? 'fill-red-500' : 'fill-none'}`} stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                    {isFavorited ? 'Saved' : 'Save'}
                  </button>

                  {analysis && (
                    <button onClick={handleExplainWithAI} disabled={aiLoading} className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-50">
                      {aiLoading ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> :
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" /></svg>}
                      {aiLoading ? 'Generating...' : 'Explain with AI'}
                    </button>
                  )}
                </div>
              </div>

              {/* Export card */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5" ref={exportMenuRef}>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Export Report</h3>
                <div className="flex gap-2">
                  <button onClick={() => handleExport('pdf')} disabled={isExporting} className="btn-secondary flex-1 text-xs px-3 py-2 disabled:opacity-50">PDF</button>
                  <button onClick={() => handleExport('csv')} disabled={isExporting} className="btn-secondary flex-1 text-xs px-3 py-2 disabled:opacity-50">CSV</button>
                </div>
              </div>

              {/* Assumptions card */}
              {analysis && (
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Assumptions</h3>
                  <ul className="space-y-1.5 text-xs text-gray-600">
                    <li className="flex justify-between"><span>Down payment</span><span className="font-medium">{(parseFloat(analysis.metrics.assumptions.down_payment_pct)*100).toFixed(1)}%</span></li>
                    <li className="flex justify-between"><span>Interest rate</span><span className="font-medium">{(parseFloat(analysis.metrics.assumptions.interest_rate_annual)*100).toFixed(2)}%</span></li>
                    <li className="flex justify-between"><span>Vacancy rate</span><span className="font-medium">{(parseFloat(analysis.metrics.assumptions.vacancy_rate)*100).toFixed(1)}%</span></li>
                    <li className="flex justify-between"><span>Appreciation</span><span className="font-medium">{(parseFloat(analysis.metrics.assumptions.appreciation_rate_annual)*100).toFixed(1)}%</span></li>
                    <li className="flex justify-between"><span>Horizon</span><span className="font-medium">{analysis.metrics.assumptions.analysis_horizon_years} years</span></li>
                  </ul>
                  <p className="text-xs text-gray-400 mt-3">Estimates for informational purposes only.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropertyDetail;

const MetricCard = ({ label, value }) => {
  if (value == null) return null;
  const d = `${(value * 100).toFixed(1)}%`;
  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <p className="text-xs text-gray-500 mb-0.5">{label}</p>
      <p className="text-lg font-bold text-gray-900">{d}</p>
    </div>
  );
};

const CashRow = ({ label, value, negative, strong, highlight }) => {
  const n = parseFloat(value);
  const f = isNaN(n) ? '—' : `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  return (
    <tr className={`${highlight ? 'bg-blue-50 font-semibold' : 'even:bg-gray-50'}`}>
      <td className="px-4 py-2 text-gray-600">{label}</td>
      <td className={`px-4 py-2 text-right ${negative ? 'text-red-500' : strong ? 'text-gray-900 font-semibold' : 'text-gray-700'}`}>
        {negative ? '-' : ''}{f}
      </td>
    </tr>
  );
};

const Slider = ({ label, value, min, max, step, onChange }) => (
  <div>
    <div className="flex justify-between text-xs text-gray-500 mb-1">
      <span>{label}</span><span className="font-medium">{(value*100).toFixed(1)}%</span>
    </div>
    <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(parseFloat(e.target.value))} className="w-full accent-blue-600" />
  </div>
);
