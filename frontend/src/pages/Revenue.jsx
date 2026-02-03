import React, { useEffect, useState, useCallback } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useBranch } from '../context/BranchContext';
import { revenueAPI } from '../utils/api';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import jsPDF from 'jspdf';
import QRCode from 'qrcode';

// Import autoTable plugin
if (typeof window !== 'undefined') {
  require('jspdf-autotable');
}

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const Revenue = () => {
  const { t } = useLanguage();
  const { selectedBranch, getBranchFilter } = useBranch();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    subject: 'All',
    paymentMethod: 'All'
  });
  const [subjects, setSubjects] = useState([]);
  const [revenueBySubject, setRevenueBySubject] = useState({});
  const [yearlyRevenue, setYearlyRevenue] = useState({});

  // Helper function to generate chart data for stacked bar charts
  const generateChartData = (dataByPeriod, periodFormatter) => {
    // Get all unique subjects across all periods
    const allSubjects = new Set();
    Object.values(dataByPeriod).forEach(periodData => {
      Object.keys(periodData).forEach(subject => allSubjects.add(subject));
    });
    
    const subjects = Array.from(allSubjects);
    const periods = Object.keys(dataByPeriod);
    
    // Color palette for subjects
    const colors = [
      { bg: 'rgba(59, 130, 246, 0.7)', border: 'rgba(59, 130, 246, 1)' }, // Blue
      { bg: 'rgba(16, 185, 129, 0.7)', border: 'rgba(16, 185, 129, 1)' }, // Green
      { bg: 'rgba(249, 115, 22, 0.7)', border: 'rgba(249, 115, 22, 1)' }, // Orange
      { bg: 'rgba(168, 85, 247, 0.7)', border: 'rgba(168, 85, 247, 1)' }, // Purple
      { bg: 'rgba(236, 72, 153, 0.7)', border: 'rgba(236, 72, 153, 1)' }, // Pink
      { bg: 'rgba(234, 179, 8, 0.7)', border: 'rgba(234, 179, 8, 1)' }, // Yellow
    ];
    
    return {
      labels: periods.map(periodFormatter),
      datasets: subjects.map((subject, index) => ({
        label: subject,
        data: periods.map(period => dataByPeriod[period][subject] || 0),
        backgroundColor: colors[index % colors.length].bg,
        borderColor: colors[index % colors.length].border,
        borderWidth: 1,
      }))
    };
  };

  const fetchRevenue = useCallback(async () => {
    try {
      setLoading(true);
      const branchFilter = getBranchFilter();
      const params = { ...branchFilter };
      
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
      if (filters.subject && filters.subject !== 'All') params.subject = filters.subject;
      if (filters.paymentMethod && filters.paymentMethod !== 'All') params.paymentMethod = filters.paymentMethod;
      
      const [revenueRes, statsRes] = await Promise.all([
        revenueAPI.getRevenue(params),
        revenueAPI.getStats(branchFilter)
      ]);
      
      setStats({ ...revenueRes.data.data, ...statsRes.data.data });
      
      // Extract unique subjects for filter dropdown
      const uniqueSubjects = [...new Set(revenueRes.data.data.payments.map(p => p.subject))];
      setSubjects(uniqueSubjects);
      
      // Process revenue by subject
      const bySubject = {};
      const yearly = {};
      
      revenueRes.data.data.payments.forEach(payment => {
        const subject = payment.subject;
        const yearKey = new Date(payment.paymentDate).getFullYear().toString();
        
        // Revenue by subject (total)
        bySubject[subject] = (bySubject[subject] || 0) + payment.amount;
        
        // Yearly by subject
        if (!yearly[yearKey]) yearly[yearKey] = {};
        yearly[yearKey][subject] = (yearly[yearKey][subject] || 0) + payment.amount;
      });
      
      setRevenueBySubject(bySubject);
      setYearlyRevenue(yearly);
    } catch (error) {
      console.error('Error fetching revenue:', error);
    } finally {
      setLoading(false);
    }
  }, [filters, getBranchFilter]);

  useEffect(() => {
    fetchRevenue();
  }, [fetchRevenue, selectedBranch]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const resetFilters = () => {
    setFilters({
      startDate: '',
      endDate: '',
      subject: 'All',
      paymentMethod: 'All'
    });
  };

  const exportToPDF = async () => {
    if (!stats) {
      alert(t('revenue.noData'));
      return;
    }
    
    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      let currentY = 20;
      
      // Generate unique report ID
      const reportId = `REV-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
      const timestamp = new Date().toLocaleString();
      
      // Add title
      doc.setFontSize(20);
      doc.text(t('revenue.reportTitle'), 105, currentY, { align: 'center' });
      currentY += 15;
      
      // Add filter information
      doc.setFontSize(12);
      const filterText = [];
      if (filters.startDate) filterText.push(`${t('revenue.from')}: ${filters.startDate}`);
      if (filters.endDate) filterText.push(`${t('revenue.to')}: ${filters.endDate}`);
      if (filters.subject && filters.subject !== 'All') filterText.push(`${t('revenue.subject')}: ${filters.subject}`);
      if (filters.paymentMethod && filters.paymentMethod !== 'All') filterText.push(`${t('revenue.paymentMethod')}: ${filters.paymentMethod}`);
      
      doc.text(filterText.join(', ') || t('revenue.allTime'), 105, currentY, { align: 'center' });
      currentY += 15;
      
      // Add authenticity section with QR code
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(t('revenue.authenticity'), 20, currentY);
      currentY += 6;
      
      // Generate QR code
      const qrData = `ReportID: ${reportId}\nDate: ${timestamp}\nRevenue: $${stats?.totalRevenue?.toLocaleString() || 0}`;
      const qrImage = await QRCode.toDataURL(qrData, {
        width: 150,
        margin: 2,
        color: { dark: '#000000', light: '#FFFFFF' }
      });
      
      // Add QR code to PDF (50x50mm)
      doc.addImage(qrImage, 'PNG', 20, currentY, 40, 40);
      
      // Add verification info next to QR code
      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0);
      doc.text(`${t('revenue.reportId')}: ${reportId}`, 65, currentY + 5);
      doc.text(`${t('revenue.generated')}: ${timestamp}`, 65, currentY + 12);
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(t('revenue.scanVerify'), 65, currentY + 35);
      
      currentY += 50;
      
      // Add summary statistics
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text(t('revenue.summary'), 20, currentY);
      currentY += 10;
      
      doc.setFontSize(12);
      doc.text(`${t('revenue.totalRevenue')}: $${stats?.totalRevenue?.toLocaleString() || 0}`, 20, currentY);
      currentY += 8;
      doc.text(`${t('common.totalTransactions')}: ${stats?.totalTransactions || 0}`, 20, currentY);
      currentY += 15;
      
      // Add revenue by subject table
      if (stats?.revenueBySubject && Object.keys(stats.revenueBySubject).length > 0) {
        const subjectRows = Object.entries(stats.revenueBySubject).map(([subject, amount]) => [
          subject,
          `$${amount.toLocaleString()}`
        ]);
        
        try {
          doc.autoTable({
            startY: currentY,
            head: [[t('revenue.subject'), t('revenue.title')]],
            body: subjectRows,
            theme: 'grid',
            margin: { top: 10, right: 10, bottom: 10, left: 10 }
          });
          currentY = doc.lastAutoTable.finalY + 10;
        } catch (e) {
          console.error('Error creating subject table:', e);
        }
      }
      
      // Add revenue by payment type table
      if (stats?.revenueByType && Object.keys(stats.revenueByType).length > 0) {
        const typeRows = Object.entries(stats.revenueByType).map(([type, amount]) => [
          type,
          `$${amount.toLocaleString()}`
        ]);
        
        try {
          doc.autoTable({
            startY: currentY,
            head: [[t('revenue.paymentMethod'), t('revenue.title')]],
            body: typeRows,
            theme: 'grid',
            margin: { top: 10, right: 10, bottom: 10, left: 10 }
          });
        } catch (e) {
          console.error('Error creating type table:', e);
        }
      }
      
      // Save the PDF
      doc.save(`revenue-report-${reportId}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert(t('common.error'));
    }
  };

  return (
    <div className="revenue-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1>{t('revenue.management')}</h1>
        <button className="btn btn-primary" onClick={exportToPDF} disabled={loading}>
          {t('revenue.exportPDF')}
        </button>
      </div>
      
      {/* Filters */}
      <div className="card" style={{ marginBottom: '30px' }}>
        <div className="card-header">
          <h3 style={{ fontSize: '1.1rem', margin: '0' }}>{t('revenue.filters')}</h3>
        </div>
        <div className="card-body" style={{ padding: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', alignItems: 'end' }}>
            <div>
              <label style={{ fontSize: '14px', fontWeight: '500', marginBottom: '6px', display: 'block' }}>{t('revenue.startDate')}</label>
              <input
                type="date"
                name="startDate"
                className="form-control"
                value={filters.startDate}
                onChange={handleFilterChange}
                style={{ padding: '8px 12px', fontSize: '14px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '14px', fontWeight: '500', marginBottom: '6px', display: 'block' }}>{t('revenue.endDate')}</label>
              <input
                type="date"
                name="endDate"
                className="form-control"
                value={filters.endDate}
                onChange={handleFilterChange}
                style={{ padding: '8px 12px', fontSize: '14px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '14px', fontWeight: '500', marginBottom: '6px', display: 'block' }}>{t('revenue.subject')}</label>
              <select
                name="subject"
                className="form-control"
                value={filters.subject}
                onChange={handleFilterChange}
                style={{ padding: '8px 12px', fontSize: '14px' }}
              >
                <option value="All">{t('revenue.allSubjects')}</option>
                {subjects.map(subject => (
                  <option key={subject} value={subject}>{subject}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '14px', fontWeight: '500', marginBottom: '6px', display: 'block' }}>{t('revenue.paymentMethod')}</label>
              <select
                name="paymentMethod"
                className="form-control"
                value={filters.paymentMethod}
                onChange={handleFilterChange}
                style={{ padding: '8px 12px', fontSize: '14px' }}
              >
                <option value="All">{t('revenue.allMethods')}</option>
                <option value="cash">{t('common.cash')}</option>
                <option value="card">{t('common.card')}</option>
                <option value="bank-transfer">{t('common.bankTransfer')}</option>
                <option value="online">{t('common.online')}</option>
              </select>
            </div>
            <div>
              <button className="btn btn-secondary btn-sm" onClick={resetFilters} style={{ width: '100%', height: '38px' }}>
                {t('common.reset')}
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {loading ? (
        <div className="loading">{t('revenue.loading')}</div>
      ) : (
        <>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-value">${stats?.totalRevenue?.toLocaleString() || 0}</div>
              <div className="stat-label">{t('revenue.totalRevenue')}</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">${stats?.totalPaid?.toLocaleString() || 0}</div>
              <div className="stat-label">{t('common.totalPaid')}</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">${stats?.totalPending?.toLocaleString() || 0}</div>
              <div className="stat-label">{t('common.totalPending')}</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats?.totalTransactions || 0}</div>
              <div className="stat-label">{t('common.totalTransactions')}</div>
            </div>
          </div>

          {/* Charts - Revenue by Subject and Yearly Revenue */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '30px', marginBottom: '30px' }}>
            {/* Revenue by Subject Chart */}
            <div className="card">
              <div className="card-header">
                <h3 style={{ fontSize: '1.1rem', margin: '0' }}>{t('revenue.bySubject')}</h3>
              </div>
              <div className="card-body">
                {Object.keys(revenueBySubject).length > 0 ? (
                  <Bar
                    data={{
                      labels: Object.keys(revenueBySubject),
                      datasets: [{
                        label: t('revenue.totalRevenue') + ' ($)',
                        data: Object.values(revenueBySubject),
                        backgroundColor: [
                          'rgba(59, 130, 246, 0.7)',
                          'rgba(16, 185, 129, 0.7)',
                          'rgba(249, 115, 22, 0.7)',
                          'rgba(168, 85, 247, 0.7)',
                          'rgba(236, 72, 153, 0.7)',
                          'rgba(234, 179, 8, 0.7)',
                        ],
                        borderColor: [
                          'rgba(59, 130, 246, 1)',
                          'rgba(16, 185, 129, 1)',
                          'rgba(249, 115, 22, 1)',
                          'rgba(168, 85, 247, 1)',
                          'rgba(236, 72, 153, 1)',
                          'rgba(234, 179, 8, 1)',
                        ],
                        borderWidth: 1,
                      }]
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: true,
                      aspectRatio: 2.5,
                      plugins: {
                        legend: {
                          display: false
                        },
                        tooltip: {
                          callbacks: {
                            label: function(context) {
                              return t('revenue.title') + ': $' + context.parsed.y.toLocaleString();
                            }
                          }
                        }
                      },
                      scales: {
                        x: {
                          grid: { display: false }
                        },
                        y: {
                          beginAtZero: true,
                          ticks: {
                            callback: function(value) {
                              return '$' + value.toLocaleString();
                            }
                          }
                        }
                      }
                    }}
                  />
                ) : (
                  <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '50px 0' }}>{t('revenue.noSubjectData')}</p>
                )}
              </div>
            </div>

            {/* Yearly Revenue Chart */}
            <div className="card">
              <div className="card-header">
                <h3 style={{ fontSize: '1.1rem', margin: '0' }}>{t('revenue.yearlyRevenue')}</h3>
              </div>
              <div className="card-body">
                {Object.keys(yearlyRevenue).length > 0 ? (
                  <Bar
                    data={generateChartData(
                      Object.fromEntries(
                        Object.entries(yearlyRevenue).sort((a, b) => a[0] - b[0])
                      ),
                      (year) => year
                    )}
                    options={{
                      responsive: true,
                      maintainAspectRatio: true,
                      aspectRatio: 2.5,
                      plugins: {
                        legend: {
                          position: 'top',
                          labels: {
                            font: { size: 12 },
                            padding: 10
                          }
                        },
                        tooltip: {
                          callbacks: {
                            label: function(context) {
                              return context.dataset.label + ': $' + context.parsed.y.toLocaleString();
                            }
                          }
                        }
                      },
                      scales: {
                        x: {
                          stacked: true,
                          grid: { display: false }
                        },
                        y: {
                          stacked: true,
                          beginAtZero: true,
                          ticks: {
                            callback: function(value) {
                              return '$' + value.toLocaleString();
                            }
                          }
                        }
                      }
                    }}
                  />
                ) : (
                  <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '50px 0' }}>{t('revenue.noYearlyData')}</p>
                )}
              </div>
            </div>
          </div>

          {/* Revenue Details */}
          <div className="card">
            <div className="card-header">
              <h3 style={{ fontSize: '1.1rem', margin: '0' }}>{t('revenue.breakdown')}</h3>
            </div>
            <div className="card-body">
              {/* Revenue by Subject */}
              <div>
                <h4 style={{ fontSize: '1rem', marginBottom: '15px', color: 'var(--text-primary)' }}>{t('revenue.bySubject')}</h4>
                {stats?.revenueBySubject && Object.entries(stats.revenueBySubject).map(([subject, amount]) => (
                  <div key={subject} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>{subject}</span>
                    <strong style={{ color: 'var(--text-primary)' }}>${amount.toLocaleString()}</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Revenue;