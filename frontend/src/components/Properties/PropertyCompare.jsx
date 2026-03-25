import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';

const PropertyCompare = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const compareList = location.state?.compareList || [];
  const [isExporting, setIsExporting] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  // Build the rows data used for both display and export
  const metricRows = [
    { label: 'Price', values: compareList.map((p) => formatCurrency(p.price)) },
    { label: 'Profitability Score', values: compareList.map((p) => p.profitability_score?.toFixed(1) || '—') },
    { label: 'Estimated Rent', values: compareList.map((p) => p.estimated_rent ? `${formatCurrency(p.estimated_rent)}/mo` : '—') },
    { label: 'Cap Rate', values: compareList.map((p) => formatPercent(p.cap_rate)) },
    { label: 'Cash-on-Cash ROI', values: compareList.map((p) => formatPercent(p.cash_on_cash_roi)) },
    { label: 'Deal Score', values: compareList.map((p) => p.deal_score != null ? `${p.deal_score.toFixed(0)}/100` : '—') },
    { label: 'Square Footage', values: compareList.map((p) => p.size_sqft ? `${p.size_sqft.toLocaleString()} sqft` : '—') },
    { label: 'Bedrooms', values: compareList.map((p) => String(p.bedrooms ?? '—')) },
    { label: 'Bathrooms', values: compareList.map((p) => String(p.bathrooms ?? '—')) },
    { label: 'Property Type', values: compareList.map((p) => p.property_type ? p.property_type.replace('_', ' ') : '—') },
    { label: 'Year Built', values: compareList.map((p) => String(p.year_built ?? '—')) },
    { label: 'Price / Sqft', values: compareList.map((p) => p.price && p.size_sqft ? `$${(parseFloat(p.price) / p.size_sqft).toFixed(2)}` : '—') },
  ];

  // ── Professional PDF Export (structured, black & white) ──
  const handleExportPDF = () => {
    setIsExporting(true);
    try {
      const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;
      const contentWidth = pageWidth - margin * 2;
      let y = margin;

      // ── Helper: check page break ──
      const checkPageBreak = (needed) => {
        if (y + needed > pageHeight - margin) {
          pdf.addPage();
          y = margin;
        }
      };

      // ── Header ──
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(18);
      pdf.text('RentIQ', margin, y);
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Property Comparison Report', pageWidth - margin, y, { align: 'right' });
      y += 4;
      pdf.setDrawColor(0);
      pdf.setLineWidth(0.5);
      pdf.line(margin, y, pageWidth - margin, y);
      y += 6;

      // ── Report date ──
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      const dateStr = new Date().toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric',
      });
      pdf.text(`Report generated: ${dateStr}`, margin, y);
      y += 4;
      pdf.text(`Properties compared: ${compareList.length}`, margin, y);
      y += 8;

      // ── Property Overview Section ──
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(12);
      pdf.text('Property Overview', margin, y);
      y += 2;
      pdf.setLineWidth(0.3);
      pdf.line(margin, y, pageWidth - margin, y);
      y += 5;

      compareList.forEach((p, idx) => {
        checkPageBreak(18);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(10);
        pdf.text(`Property ${idx + 1}: ${p.address}`, margin + 2, y);
        y += 5;
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(9);
        pdf.text(`${p.city}, ${p.state}${p.zip_code ? ' ' + p.zip_code : ''}`, margin + 2, y);
        y += 7;
      });

      y += 3;

      // ── Comparison Table ──
      checkPageBreak(20);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(12);
      pdf.text('Side-by-Side Comparison', margin, y);
      y += 2;
      pdf.setLineWidth(0.3);
      pdf.line(margin, y, pageWidth - margin, y);
      y += 5;

      // Table setup
      const colCount = compareList.length + 1; // metric label + one per property
      const labelColWidth = contentWidth * 0.30;
      const dataColWidth = (contentWidth - labelColWidth) / compareList.length;
      const rowHeight = 7;

      // Table header row
      checkPageBreak(rowHeight * 2);
      pdf.setFillColor(230, 230, 230);
      pdf.rect(margin, y, contentWidth, rowHeight, 'F');
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8);
      pdf.text('Metric', margin + 2, y + 5);
      compareList.forEach((p, idx) => {
        const x = margin + labelColWidth + idx * dataColWidth;
        const label = p.address.length > 22 ? p.address.substring(0, 22) + '…' : p.address;
        pdf.text(label, x + 2, y + 5);
      });
      y += rowHeight;

      // Draw border for header
      pdf.setDrawColor(0);
      pdf.setLineWidth(0.3);
      pdf.line(margin, y, pageWidth - margin, y);

      // Table data rows
      metricRows.forEach((row, rIdx) => {
        checkPageBreak(rowHeight);

        // Alternating row background
        if (rIdx % 2 === 0) {
          pdf.setFillColor(245, 245, 245);
          pdf.rect(margin, y, contentWidth, rowHeight, 'F');
        }

        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        pdf.text(row.label, margin + 2, y + 5);

        row.values.forEach((val, idx) => {
          const x = margin + labelColWidth + idx * dataColWidth;
          pdf.text(String(val), x + 2, y + 5);
        });

        y += rowHeight;
        pdf.setDrawColor(200);
        pdf.setLineWidth(0.1);
        pdf.line(margin, y, pageWidth - margin, y);
      });

      // Table outer border
      const tableTop = y - (metricRows.length + 1) * rowHeight;
      pdf.setDrawColor(0);
      pdf.setLineWidth(0.3);
      pdf.rect(margin, tableTop, contentWidth, y - tableTop);

      // Vertical column separators
      let colX = margin + labelColWidth;
      for (let i = 0; i < compareList.length; i++) {
        pdf.line(colX, tableTop, colX, y);
        colX += dataColWidth;
      }

      y += 10;

      // ── Individual Property Details ──
      compareList.forEach((p, idx) => {
        checkPageBreak(50);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(11);
        pdf.text(`Property ${idx + 1} — Detailed Summary`, margin, y);
        y += 2;
        pdf.setLineWidth(0.3);
        pdf.line(margin, y, pageWidth - margin, y);
        y += 5;

        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(9);

        const details = [
          ['Address', p.address],
          ['Location', `${p.city}, ${p.state}${p.zip_code ? ' ' + p.zip_code : ''}`],
          ['Price', formatCurrency(p.price)],
          ['Estimated Rent', p.estimated_rent ? `${formatCurrency(p.estimated_rent)}/mo` : '—'],
          ['Profitability Score', p.profitability_score?.toFixed(1) || '—'],
          ['Cap Rate', formatPercent(p.cap_rate)],
          ['Cash-on-Cash ROI', formatPercent(p.cash_on_cash_roi)],
          ['Deal Score', p.deal_score != null ? `${p.deal_score.toFixed(0)}/100` : '—'],
          ['Square Footage', p.size_sqft ? `${p.size_sqft.toLocaleString()} sqft` : '—'],
          ['Bedrooms', String(p.bedrooms ?? '—')],
          ['Bathrooms', String(p.bathrooms ?? '—')],
          ['Property Type', p.property_type ? p.property_type.replace('_', ' ') : '—'],
          ['Year Built', String(p.year_built ?? '—')],
          ['Price / Sqft', p.price && p.size_sqft ? `$${(parseFloat(p.price) / p.size_sqft).toFixed(2)}` : '—'],
        ];

        details.forEach(([key, val], dIdx) => {
          checkPageBreak(6);
          if (dIdx % 2 === 0) {
            pdf.setFillColor(245, 245, 245);
            pdf.rect(margin, y - 3.5, contentWidth, 6, 'F');
          }
          pdf.setFont('helvetica', 'bold');
          pdf.text(`${key}:`, margin + 2, y);
          pdf.setFont('helvetica', 'normal');
          pdf.text(String(val), margin + 55, y);
          y += 6;
        });

        y += 8;
      });

      // ── Footer / Disclaimer ──
      checkPageBreak(20);
      pdf.setDrawColor(0);
      pdf.setLineWidth(0.3);
      pdf.line(margin, y, pageWidth - margin, y);
      y += 5;
      pdf.setFont('helvetica', 'italic');
      pdf.setFontSize(7);
      pdf.text(
        'Disclaimer: This report is generated for informational purposes only. Investment performance depends on market conditions,',
        margin,
        y
      );
      y += 3.5;
      pdf.text(
        'maintenance costs, vacancy rates, financing terms, and other factors. RentIQ does not guarantee the accuracy of these estimates.',
        margin,
        y
      );
      y += 3.5;
      pdf.text(
        'Consult a qualified financial advisor before making investment decisions.',
        margin,
        y
      );

      const filename = `RentIQ_Comparison_${compareList.length}_Properties_${new Date().toISOString().slice(0, 10)}.pdf`;
      pdf.save(filename);
    } catch (error) {
      console.error('Error exporting PDF:', error);
    } finally {
      setIsExporting(false);
    }
  };

  // ── CSV Export ──
  const handleExportCSV = () => {
    setIsExporting(true);
    try {
      const headers = ['Metric', ...compareList.map((p) => p.address)];
      const rows = metricRows.map((row) => [row.label, ...row.values]);

      const csvContent = [headers, ...rows]
        .map((row) =>
          row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
        )
        .join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute(
        'download',
        `RentIQ_Comparison_${compareList.length}_Properties_${new Date().toISOString().slice(0, 10)}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting CSV:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExport = (type) => {
    setShowExportMenu(false);
    if (type === 'pdf') {
      handleExportPDF();
    } else {
      handleExportCSV();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top bar: back button + export controls */}
        <div className="flex justify-between items-center mb-6">
          <button
            onClick={() => navigate('/properties', { state: { compareList } })}
            className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 flex items-center"
          >
            ← Back to Properties
          </button>

          <div className="relative" ref={exportMenuRef}>
            <button
              id="export-button"
              onClick={() => setShowExportMenu((prev) => !prev)}
              disabled={isExporting}
              className={`btn-primary flex items-center gap-2 ${isExporting ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isExporting ? (
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              )}
              {isExporting ? 'Exporting...' : 'Export'}
              {!isExporting && (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              )}
            </button>

            {showExportMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg dark:shadow-gray-950/40 border border-gray-200 dark:border-gray-700 z-50 overflow-hidden">
                <button
                  onClick={() => handleExport('pdf')}
                  className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3 transition-colors"
                >
                  <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                  </svg>
                  Export as PDF
                </button>
                <button
                  onClick={() => handleExport('csv')}
                  className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3 transition-colors border-t border-gray-200 dark:border-gray-700"
                >
                  <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6z" clipRule="evenodd" />
                  </svg>
                  Export as CSV
                </button>
              </div>
            )}
          </div>
        </div>

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
              {metricRows.map((row) => (
                <CompareRow key={row.label} label={row.label} values={row.values} />
              ))}
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