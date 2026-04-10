import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getStreetViewUrl } from '../../services/api';
import jsPDF from 'jspdf';

const PropertyCompare = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const compareList = location.state?.compareList || [];
  const [isExporting, setIsExporting] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (exportMenuRef.current && !exportMenuRef.current.contains(e.target)) setShowExportMenu(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (compareList.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-3">Compare Properties</h1>
          <p className="text-gray-500 mb-6">No properties selected for comparison.</p>
          <button onClick={() => navigate('/properties')} className="btn-primary">Browse Properties</button>
        </div>
      </div>
    );
  }

  const fc = (v) => v != null ? `$${parseFloat(v).toLocaleString()}` : '—';
  const fp = (v) => v != null ? `${(v * 100).toFixed(1)}%` : '—';

  const metrics = [
    { label: 'Price', key: 'price', fmt: (p) => fc(p.price), best: 'low' },
    { label: 'Score', key: 'profitability_score', fmt: (p) => p.profitability_score?.toFixed(1) || '—', best: 'high' },
    { label: 'Est. Rent', key: 'estimated_rent', fmt: (p) => p.estimated_rent ? `${fc(p.estimated_rent)}/mo` : '—', best: 'high' },
    { label: 'Cap Rate', key: 'cap_rate', fmt: (p) => fp(p.cap_rate), best: 'high' },
    { label: 'Cash-on-Cash', key: 'cash_on_cash_roi', fmt: (p) => fp(p.cash_on_cash_roi), best: 'high' },
    { label: 'Deal Score', key: 'deal_score', fmt: (p) => p.deal_score != null ? `${p.deal_score.toFixed(0)}/100` : '—', best: 'high' },
    { label: 'Sqft', key: 'size_sqft', fmt: (p) => p.size_sqft ? Math.round(p.size_sqft * 10.7639).toLocaleString() : '—', best: 'high' },
    { label: 'Beds', key: 'bedrooms', fmt: (p) => String(p.bedrooms ?? '—') },
    { label: 'Baths', key: 'bathrooms', fmt: (p) => String(p.bathrooms ?? '—') },
    { label: 'Type', key: 'property_type', fmt: (p) => p.property_type?.replace('_', ' ') || '—' },
    { label: 'Year Built', key: 'year_built', fmt: (p) => String(p.year_built ?? '—') },
  ];

  const getBestIdx = (metric) => {
    if (!metric.best) return -1;
    let bestIdx = -1, bestVal = metric.best === 'high' ? -Infinity : Infinity;
    compareList.forEach((p, i) => {
      const v = parseFloat(p[metric.key]);
      if (isNaN(v)) return;
      if (metric.best === 'high' && v > bestVal) { bestVal = v; bestIdx = i; }
      if (metric.best === 'low' && v < bestVal) { bestVal = v; bestIdx = i; }
    });
    return bestIdx;
  };

  const metricRows = metrics.map((m) => ({
    label: m.label, values: compareList.map((p) => m.fmt(p)),
  }));

  const handleExportPDF = () => {
    setIsExporting(true);
    try {
      const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
      const pw = pdf.internal.pageSize.getWidth(), ph = pdf.internal.pageSize.getHeight(), mg = 15, cw = pw - mg * 2;
      let y = mg;
      const br = (n) => { if (y + n > ph - mg) { pdf.addPage(); y = mg; } };
      pdf.setFont('helvetica','bold');pdf.setFontSize(18);pdf.text('RentIQ',mg,y);pdf.setFontSize(9);pdf.setFont('helvetica','normal');pdf.text('Comparison Report',pw-mg,y,{align:'right'});y+=4;pdf.setDrawColor(0);pdf.setLineWidth(0.5);pdf.line(mg,y,pw-mg,y);y+=8;
      const lw=cw*0.3,dw=(cw-lw)/compareList.length,rh=7;
      pdf.setFillColor(230,230,230);pdf.rect(mg,y,cw,rh,'F');pdf.setFont('helvetica','bold');pdf.setFontSize(8);pdf.text('Metric',mg+2,y+5);
      compareList.forEach((p,i)=>{const x=mg+lw+i*dw;pdf.text(p.address.length>22?p.address.substring(0,22)+'…':p.address,x+2,y+5);});y+=rh;
      metricRows.forEach((row,ri)=>{br(rh);if(ri%2===0){pdf.setFillColor(245,245,245);pdf.rect(mg,y,cw,rh,'F');}pdf.setFont('helvetica','normal');pdf.setFontSize(8);pdf.text(row.label,mg+2,y+5);row.values.forEach((v,i)=>{pdf.text(String(v),mg+lw+i*dw+2,y+5);});y+=rh;});y+=10;
      br(15);pdf.setFont('helvetica','italic');pdf.setFontSize(7);pdf.text('Disclaimer: For informational purposes only.',mg,y);
      pdf.save(`RentIQ_Compare_${new Date().toISOString().slice(0,10)}.pdf`);
    } catch(e){console.error(e);} finally{setIsExporting(false);}
  };

  const handleExportCSV = () => {
    setIsExporting(true);
    try {
      const h=['Metric',...compareList.map(p=>p.address)];
      const rows=metricRows.map(r=>[r.label,...r.values]);
      const csv=[h,...rows].map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
      const b=new Blob([csv],{type:'text/csv;charset=utf-8;'});const u=URL.createObjectURL(b);const a=document.createElement('a');a.href=u;a.download=`RentIQ_Compare_${new Date().toISOString().slice(0,10)}.csv`;document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(u);
    } catch(e){console.error(e);} finally{setIsExporting(false);}
  };

  const handleExport = (t) => { setShowExportMenu(false); t==='pdf'?handleExportPDF():handleExportCSV(); };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/properties', { state: { compareList } })} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
              Back
            </button>
            <h1 className="text-xl font-bold text-gray-900">Compare Properties</h1>
          </div>
          <div className="flex gap-2" ref={exportMenuRef}>
            <button onClick={() => handleExport('pdf')} disabled={isExporting} className="btn-secondary text-xs px-3 py-2 disabled:opacity-50">PDF</button>
            <button onClick={() => handleExport('csv')} disabled={isExporting} className="btn-secondary text-xs px-3 py-2 disabled:opacity-50">CSV</button>
          </div>
        </div>

        {/* Visual card columns */}
        <div className={`grid gap-4 mb-8 ${compareList.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
          {compareList.map((p) => (
            <div key={p.id} className="card cursor-pointer" onClick={() => navigate(`/properties/${p.id}`)}>
              <div className="aspect-[4/3] bg-gray-100">
                <img src={getStreetViewUrl(p.id)} alt={p.address} className="w-full h-full object-cover" loading="lazy"
                  onError={(e) => { e.target.style.display = 'none'; }} />
              </div>
              <div className="p-4">
                <p className="font-bold text-gray-900 text-lg">{fc(p.price)}</p>
                <p className="text-sm text-gray-500 mt-0.5 truncate">{p.address}</p>
                <p className="text-xs text-gray-400">{p.city}, {p.state}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Metrics table */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Metric</th>
                {compareList.map((p) => (
                  <th key={p.id} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide truncate max-w-[200px]">{p.address}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {metrics.map((m, mi) => {
                const best = getBestIdx(m);
                return (
                  <tr key={m.label} className={mi % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                    <td className="px-4 py-2.5 text-gray-600 font-medium">{m.label}</td>
                    {compareList.map((p, pi) => (
                      <td key={p.id} className={`px-4 py-2.5 ${pi === best ? 'text-green-600 font-semibold' : 'text-gray-700'}`}>
                        {m.fmt(p)}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PropertyCompare;
