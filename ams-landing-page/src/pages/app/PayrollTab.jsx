import React, { useState, useEffect } from 'react';
import api from '../../services/api';

export default function PayrollTab({ user, companyInfo }) {
  const [subTab, setSubTab] = useState('preview'); // 'preview', 'runs', 'structures'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Selected period state
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [workingDays, setWorkingDays] = useState(22);

  // Payroll Data
  const [previewData, setPreviewData] = useState(null);
  const [historicalRuns, setHistoricalRuns] = useState([]);
  const [salaryStructures, setSalaryStructures] = useState([]);
  const [currency, setCurrency] = useState('₹');

  // Modals
  const [selectedPayslip, setSelectedPayslip] = useState(null);
  const [editEmployeeModal, setEditEmployeeModal] = useState(null);
  const [processingRun, setProcessingRun] = useState(false);
  const [exportingCsv, setExportingCsv] = useState(false);

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');

  // Load Initial Preview & Structures
  const fetchPreview = async (m = selectedMonth, y = selectedYear, wd = workingDays) => {
    setLoading(true);
    setError('');
    try {
      const res = await api.previewPayroll(m, y, wd);
      if (res && res.data) {
        setPreviewData(res.data);
        if (res.data.currency) setCurrency(res.data.currency);
        if (res.data.working_days) setWorkingDays(res.data.working_days);
      }
    } catch (err) {
      console.error("Error previewing payroll:", err);
      setError("Failed to compute payroll preview. Please ensure attendance records are available.");
    } finally {
      setLoading(false);
    }
  };

  const fetchHistoricalRuns = async () => {
    try {
      const res = await api.getPayrollRuns();
      if (res && res.runs) {
        setHistoricalRuns(res.runs);
      }
    } catch (err) {
      console.error("Error fetching payroll runs:", err);
    }
  };

  const fetchSalaryStructures = async () => {
    try {
      const res = await api.getSalaryStructures();
      if (res && res.salary_structures) {
        setSalaryStructures(res.salary_structures);
      }
    } catch (err) {
      console.error("Error fetching salary structures:", err);
    }
  };

  useEffect(() => {
    fetchPreview();
    fetchHistoricalRuns();
    fetchSalaryStructures();
  }, []);

  // Handle Commit Run
  const handleCommitRun = async () => {
    if (!window.confirm(`Are you sure you want to execute and lock the payroll for ${previewData?.month_name || selectedMonth} ${selectedYear}? This will generate official payslips for ${previewData?.summary?.total_employees || 0} employees.`)) {
      return;
    }
    setProcessingRun(true);
    setError('');
    setSuccessMsg('');
    try {
      const res = await api.runPayroll(selectedMonth, selectedYear, workingDays);
      setSuccessMsg(`Monthly payroll successfully processed and locked for ${previewData?.month_name || selectedMonth} ${selectedYear}!`);
      fetchHistoricalRuns();
      fetchPreview();
    } catch (err) {
      setError(err.message || 'Failed to execute payroll run.');
    } finally {
      setProcessingRun(false);
    }
  };

  // Handle Bank CSV Download
  const handleDownloadCsv = async () => {
    setExportingCsv(true);
    try {
      await api.downloadBankCsv(selectedMonth, selectedYear);
    } catch (err) {
      alert("Failed to export bank CSV: " + (err.message || "Unknown error"));
    } finally {
      setExportingCsv(false);
    }
  };

  // Handle Save Salary Structure
  const handleSaveSalaryStructure = async (e) => {
    e.preventDefault();
    if (!editEmployeeModal) return;
    try {
      await api.updateSalaryStructure(editEmployeeModal);
      setSuccessMsg(`Salary structure updated for ${editEmployeeModal.user_name}`);
      setEditEmployeeModal(null);
      fetchSalaryStructures();
      fetchPreview();
    } catch (err) {
      alert("Failed to save salary structure: " + err.message);
    }
  };

  // Status Badge Helper
  const getStatusBadge = (status) => {
    if (status === 'Paid') return { bg: '#DCFCE7', text: '#15803D', label: 'Disbursed' };
    if (status === 'Approved') return { bg: '#E0E7FF', text: '#4338CA', label: 'Approved' };
    return { bg: '#FEF3C7', text: '#B45309', label: 'Processed' };
  };

  // Filtered preview employees
  const filteredEmployees = (previewData?.employees || []).filter(emp =>
    emp.user_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const months = [
    { num: 1, name: 'January' }, { num: 2, name: 'February' },
    { num: 3, name: 'March' }, { num: 4, name: 'April' },
    { num: 5, name: 'May' }, { num: 6, name: 'June' },
    { num: 7, name: 'July' }, { num: 8, name: 'August' },
    { num: 9, name: 'September' }, { num: 10, name: 'October' },
    { num: 11, name: 'November' }, { num: 12, name: 'December' }
  ];

  return (
    <div className="payroll-container" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Alert Messages */}
      {error && (
        <div style={{
          backgroundColor: '#FEE2E2',
          border: '1px solid #F87171',
          color: '#B91C1C',
          padding: '12px 18px',
          borderRadius: '10px',
          fontSize: '0.9rem',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div style={{
          backgroundColor: '#DCFCE7',
          border: '1px solid #86EFAC',
          color: '#15803D',
          padding: '12px 18px',
          borderRadius: '10px',
          fontSize: '0.9rem',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <span>✓</span>
          <span>{successMsg}</span>
        </div>
      )}

      {/* TOP KPI STATS CARDS */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
        gap: '16px'
      }}>
        {/* Card 1: Total Net Disbursement */}
        <div className="modern-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Total Net Payout
            </span>
            <span style={{
              background: 'rgba(91, 80, 229, 0.1)',
              color: '#5B50E5',
              padding: '4px 10px',
              borderRadius: '20px',
              fontSize: '0.75rem',
              fontWeight: 700
            }}>
              {previewData?.month_name || 'Current'}
            </span>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-heading)', letterSpacing: '-0.5px' }}>
            {currency} {previewData?.summary?.total_net_payable?.toLocaleString() || '0'}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#16A34A', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 500 }}>
            <span>✓</span> Ready for bank bulk transfer
          </div>
        </div>

        {/* Card 2: Biometric LOP Savings */}
        <div className="modern-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Attendance LOP Deductions
            </span>
            <span style={{
              background: 'rgba(239, 68, 68, 0.1)',
              color: '#DC2626',
              padding: '4px 10px',
              borderRadius: '20px',
              fontSize: '0.75rem',
              fontWeight: 700
            }}>
              Unexcused Absences
            </span>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#DC2626', letterSpacing: '-0.5px' }}>
            {currency} {previewData?.summary?.total_lop_deductions?.toLocaleString() || '0'}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '6px' }}>
            Saved via biometric check-in tracking
          </div>
        </div>

        {/* Card 3: Statutory Withholdings (PF & Tax) */}
        <div className="modern-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Statutory Deductions
            </span>
            <span style={{
              background: 'rgba(245, 158, 11, 0.1)',
              color: '#D97706',
              padding: '4px 10px',
              borderRadius: '20px',
              fontSize: '0.75rem',
              fontWeight: 700
            }}>
              PF + Tax
            </span>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-heading)', letterSpacing: '-0.5px' }}>
            {currency} {previewData?.summary?.total_statutory_deductions?.toLocaleString() || '0'}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '6px' }}>
            Auto-calculated compliance deductions
          </div>
        </div>

        {/* Card 4: Enrolled Employees & Status */}
        <div className="modern-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Enrolled Employees
            </span>
            <span style={{
              background: 'rgba(34, 197, 94, 0.1)',
              color: '#16A34A',
              padding: '4px 10px',
              borderRadius: '20px',
              fontSize: '0.75rem',
              fontWeight: 700
            }}>
              100% Synced
            </span>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-heading)', letterSpacing: '-0.5px' }}>
            {previewData?.summary?.total_employees || 0} Members
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '6px' }}>
            Avg Net Pay: {currency} {previewData?.summary?.average_net_pay?.toLocaleString() || '0'}
          </div>
        </div>
      </div>

      {/* SUB-TABS NAVIGATION & PAYROLL CONTROLS */}
      <div className="modern-card" style={{ padding: '16px 20px' }}>
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '16px'
        }}>
          {/* Internal Tabs */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setSubTab('preview')}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                fontWeight: 600,
                fontSize: '0.9rem',
                cursor: 'pointer',
                backgroundColor: subTab === 'preview' ? 'var(--primary)' : 'transparent',
                color: subTab === 'preview' ? '#FFFFFF' : 'var(--text-muted)',
                transition: 'all 0.2s'
              }}
            >
              ⚡ 1-Click Biometric Run &amp; Preview
            </button>
            <button
              onClick={() => { setSubTab('runs'); fetchHistoricalRuns(); }}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                fontWeight: 600,
                fontSize: '0.9rem',
                cursor: 'pointer',
                backgroundColor: subTab === 'runs' ? 'var(--primary)' : 'transparent',
                color: subTab === 'runs' ? '#FFFFFF' : 'var(--text-muted)',
                transition: 'all 0.2s'
              }}
            >
              📑 Historical Runs &amp; Payslips
            </button>
            <button
              onClick={() => { setSubTab('structures'); fetchSalaryStructures(); }}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                fontWeight: 600,
                fontSize: '0.9rem',
                cursor: 'pointer',
                backgroundColor: subTab === 'structures' ? 'var(--primary)' : 'transparent',
                color: subTab === 'structures' ? '#FFFFFF' : 'var(--text-muted)',
                transition: 'all 0.2s'
              }}
            >
              ⚙️ Compensation Structures
            </button>
          </div>

          {/* Period Selectors & Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <select
              value={selectedMonth}
              onChange={(e) => {
                const m = parseInt(e.target.value);
                setSelectedMonth(m);
                fetchPreview(m, selectedYear, workingDays);
              }}
              style={{
                padding: '7px 12px',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                fontSize: '0.85rem',
                background: '#FFFFFF',
                color: 'var(--text-heading)',
                fontWeight: 600
              }}
            >
              {months.map(m => (
                <option key={m.num} value={m.num}>{m.name}</option>
              ))}
            </select>

            <select
              value={selectedYear}
              onChange={(e) => {
                const y = parseInt(e.target.value);
                setSelectedYear(y);
                fetchPreview(selectedMonth, y, workingDays);
              }}
              style={{
                padding: '7px 12px',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                fontSize: '0.85rem',
                background: '#FFFFFF',
                color: 'var(--text-heading)',
                fontWeight: 600
              }}
            >
              <option value={2025}>2025</option>
              <option value={2026}>2026</option>
              <option value={2027}>2027</option>
            </select>

            <button
              onClick={handleDownloadCsv}
              disabled={exportingCsv}
              className="btn-outline"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', fontSize: '0.85rem' }}
              title="Download bank bulk payment CSV"
            >
              <span>📥</span>
              <span>{exportingCsv ? 'Exporting...' : 'Bank Transfer CSV'}</span>
            </button>

            {subTab === 'preview' && (
              <button
                onClick={handleCommitRun}
                disabled={processingRun || loading}
                className="btn-primary"
                style={{
                  background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 16px',
                  fontSize: '0.85rem'
                }}
              >
                <span>🔒</span>
                <span>{processingRun ? 'Locking Run...' : 'Lock & Execute Run'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* =========================================================================
          VIEW 1: BIOMETRIC PREVIEW & RECONCILIATION TABLE
          ========================================================================= */}
      {subTab === 'preview' && (
        <div className="modern-card" style={{ padding: '0px', overflow: 'hidden' }}>
          {/* Card Header & Search */}
          <div style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: 'var(--text-heading)' }}>
                Biometric Attendance &amp; Payroll Reconciliation
              </h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Computed in real-time for {previewData?.month_name} {selectedYear} ({workingDays} standard working days)
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input
                type="text"
                placeholder="Search employee..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  padding: '7px 14px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  fontSize: '0.85rem',
                  width: '200px'
                }}
              />
              <button
                onClick={() => fetchPreview()}
                className="btn-outline"
                style={{ padding: '7px 12px', fontSize: '0.85rem' }}
                title="Recalculate with latest biometric check-ins"
              >
                🔄 Refresh
              </button>
            </div>
          </div>

          {/* Responsive Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '14px 20px', fontWeight: 600 }}>Employee</th>
                  <th style={{ padding: '14px 16px', fontWeight: 600 }}>Attendance (Days)</th>
                  <th style={{ padding: '14px 16px', fontWeight: 600 }}>Gross Base</th>
                  <th style={{ padding: '14px 16px', fontWeight: 600 }}>Overtime</th>
                  <th style={{ padding: '14px 16px', fontWeight: 600, color: '#DC2626' }}>LOP Deduction</th>
                  <th style={{ padding: '14px 16px', fontWeight: 600 }}>PF &amp; Tax</th>
                  <th style={{ padding: '14px 20px', fontWeight: 700, color: '#16A34A' }}>Net Payable</th>
                  <th style={{ padding: '14px 20px', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                      Calculating biometric payroll from attendance logs...
                    </td>
                  </tr>
                ) : filteredEmployees.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                      No employees found matching query.
                    </td>
                  </tr>
                ) : (
                  filteredEmployees.map((emp) => (
                    <tr
                      key={emp.user_name}
                      style={{
                        borderBottom: '1px solid var(--border-color)',
                        transition: 'background 0.15s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F8FAFC'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      {/* Employee Name & Profile */}
                      <td style={{ padding: '14px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '10px',
                            background: 'linear-gradient(135deg, #7268EA 0%, #8D85F0 100%)',
                            color: '#FFFFFF',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '0.85rem'
                          }}>
                            {emp.user_name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--text-heading)' }}>{emp.user_name}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{emp.payment_mode} • {emp.bank_name}</div>
                          </div>
                        </div>
                      </td>

                      {/* Attendance Summary */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{ fontWeight: 600, color: '#16A34A' }}>
                            {emp.present_days} Present {emp.half_days > 0 ? `(${emp.half_days} Half)` : ''}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: emp.lop_days > 0 ? '#DC2626' : 'var(--text-muted)' }}>
                            {emp.lop_days > 0 ? `${emp.lop_days}d LOP` : `${emp.paid_leave_days}d Paid Leave`}
                          </span>
                        </div>
                      </td>

                      {/* Gross Base */}
                      <td style={{ padding: '14px 16px', fontWeight: 500, color: 'var(--text-heading)' }}>
                        {currency} {emp.base_salary?.toLocaleString()}
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>+{currency}{emp.allowances} allow</div>
                      </td>

                      {/* Overtime */}
                      <td style={{ padding: '14px 16px', color: emp.overtime_pay > 0 ? '#5B50E5' : 'var(--text-muted)', fontWeight: 500 }}>
                        {emp.overtime_pay > 0 ? (
                          <>
                            +{currency}{emp.overtime_pay}
                            <div style={{ fontSize: '0.72rem', color: '#5B50E5' }}>{emp.overtime_hours} hrs</div>
                          </>
                        ) : '—'}
                      </td>

                      {/* LOP Deduction */}
                      <td style={{ padding: '14px 16px', color: emp.lop_deduction > 0 ? '#DC2626' : 'var(--text-muted)', fontWeight: 600 }}>
                        {emp.lop_deduction > 0 ? `-${currency}${emp.lop_deduction?.toLocaleString()}` : '₹0.00'}
                      </td>

                      {/* PF & Tax */}
                      <td style={{ padding: '14px 16px', color: 'var(--text-muted)' }}>
                        <div style={{ fontSize: '0.75rem' }}>PF: {currency}{emp.pf_deduction}</div>
                        <div style={{ fontSize: '0.75rem' }}>TDS: {currency}{emp.tax_deduction}</div>
                      </td>

                      {/* Net Payable */}
                      <td style={{ padding: '14px 20px', fontWeight: 800, fontSize: '1rem', color: '#16A34A' }}>
                        {currency} {emp.net_pay?.toLocaleString()}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '8px' }}>
                          <button
                            onClick={() => setSelectedPayslip(emp)}
                            className="btn-outline"
                            style={{ padding: '5px 10px', fontSize: '0.78rem' }}
                          >
                            👁️ Payslip
                          </button>
                          <button
                            onClick={() => setEditEmployeeModal(emp)}
                            className="btn-outline"
                            style={{ padding: '5px 10px', fontSize: '0.78rem' }}
                          >
                            ✏️ Edit
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================================
          VIEW 2: HISTORICAL PAYROLL RUNS
          ========================================================================= */}
      {subTab === 'runs' && (
        <div className="modern-card" style={{ padding: '0px', overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: 'var(--text-heading)' }}>
              Historical Monthly Payroll Executions
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Complete ledger of all committed monthly payroll runs and disbursement records
            </p>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '14px 20px', fontWeight: 600 }}>Period</th>
                  <th style={{ padding: '14px 16px', fontWeight: 600 }}>Employees</th>
                  <th style={{ padding: '14px 16px', fontWeight: 600 }}>Gross Total</th>
                  <th style={{ padding: '14px 16px', fontWeight: 600 }}>Deductions</th>
                  <th style={{ padding: '14px 20px', fontWeight: 700, color: '#16A34A' }}>Net Disbursed</th>
                  <th style={{ padding: '14px 16px', fontWeight: 600 }}>Status</th>
                  <th style={{ padding: '14px 20px', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {historicalRuns.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                      No payroll runs locked yet. Use the "1-Click Biometric Run" tab to execute your first payroll.
                    </td>
                  </tr>
                ) : (
                  historicalRuns.map((run) => {
                    const badge = getStatusBadge(run.status);
                    return (
                      <tr key={run.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '14px 20px', fontWeight: 700, color: 'var(--text-heading)' }}>
                          {run.month_name} {run.year}
                          <div style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--text-muted)' }}>
                            Run #{run.id} • Processed by {run.processed_by || 'Admin'}
                          </div>
                        </td>
                        <td style={{ padding: '14px 16px' }}>{run.total_employees} Employees</td>
                        <td style={{ padding: '14px 16px' }}>{currency} {run.total_gross?.toLocaleString()}</td>
                        <td style={{ padding: '14px 16px', color: '#DC2626' }}>-{currency} {run.total_deductions?.toLocaleString()}</td>
                        <td style={{ padding: '14px 20px', fontWeight: 800, color: '#16A34A' }}>
                          {currency} {run.total_net?.toLocaleString()}
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <span style={{
                            backgroundColor: badge.bg,
                            color: badge.text,
                            padding: '4px 12px',
                            borderRadius: '16px',
                            fontSize: '0.75rem',
                            fontWeight: 700
                          }}>
                            {badge.label}
                          </span>
                        </td>
                        <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                          <button
                            onClick={() => {
                              api.getPayrollRun(run.id).then(res => {
                                if (res?.run?.payslips?.length) {
                                  setSelectedPayslip(res.run.payslips[0]);
                                }
                              });
                            }}
                            className="btn-outline"
                            style={{ padding: '5px 12px', fontSize: '0.78rem' }}
                          >
                            View Payslips
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================================
          VIEW 3: COMPENSATION STRUCTURES TABLE
          ========================================================================= */}
      {subTab === 'structures' && (
        <div className="modern-card" style={{ padding: '0px', overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: 'var(--text-heading)' }}>
                Employee Compensation Packages
              </h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Manage base salary, allowances, PF rates, TDS taxes, and bank disbursement accounts
              </p>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '14px 20px', fontWeight: 600 }}>Employee</th>
                  <th style={{ padding: '14px 16px', fontWeight: 600 }}>Base Salary</th>
                  <th style={{ padding: '14px 16px', fontWeight: 600 }}>HRA</th>
                  <th style={{ padding: '14px 16px', fontWeight: 600 }}>Allowances</th>
                  <th style={{ padding: '14px 16px', fontWeight: 700, color: 'var(--text-heading)' }}>Gross Package</th>
                  <th style={{ padding: '14px 16px', fontWeight: 600 }}>PF &amp; Tax</th>
                  <th style={{ padding: '14px 16px', fontWeight: 600 }}>Bank Account</th>
                  <th style={{ padding: '14px 20px', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {salaryStructures.map((struct) => (
                  <tr key={struct.user_name} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--text-heading)' }}>
                      {struct.user_name}
                    </td>
                    <td style={{ padding: '14px 16px' }}>{currency} {struct.base_salary?.toLocaleString()}</td>
                    <td style={{ padding: '14px 16px' }}>{currency} {struct.hra?.toLocaleString()}</td>
                    <td style={{ padding: '14px 16px' }}>{currency} {(struct.conveyance_allowance + struct.special_allowance)?.toLocaleString()}</td>
                    <td style={{ padding: '14px 16px', fontWeight: 700, color: 'var(--text-heading)' }}>
                      {currency} {struct.gross_salary?.toLocaleString()}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        PF: {struct.pf_enabled ? `${struct.pf_rate}%` : 'Off'} • Tax: {struct.tax_rate}%
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {struct.bank_name} ({struct.account_number})
                    </td>
                    <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                      <button
                        onClick={() => setEditEmployeeModal(struct)}
                        className="btn-outline"
                        style={{ padding: '5px 12px', fontSize: '0.78rem' }}
                      >
                        ✏️ Edit Package
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 1: INTERACTIVE PRINTABLE PAYSLIP
          ========================================================================= */}
      {selectedPayslip && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            maxWidth: '680px',
            width: '100%',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            maxHeight: '90vh'
          }}>
            {/* Modal Top Actions Bar (Hidden during print) */}
            <div className="no-print" style={{
              padding: '16px 24px',
              background: '#F8FAFC',
              borderBottom: '1px solid #E2E8F0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span style={{ fontWeight: 700, color: 'var(--text-heading)' }}>Official Salary Payslip</span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => window.print()}
                  className="btn-primary"
                  style={{ padding: '6px 14px', fontSize: '0.85rem' }}
                >
                  🖨️ Print / Save PDF
                </button>
                <button
                  onClick={() => setSelectedPayslip(null)}
                  className="btn-outline"
                  style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                >
                  ✕ Close
                </button>
              </div>
            </div>

            {/* Print-Ready Payslip Body */}
            <div id="printable-payslip" style={{ padding: '36px', overflowY: 'auto' }}>
              {/* Header: Attendify Brand Logo + Company Info */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #0F172A', paddingBottom: '20px', marginBottom: '24px' }}>
                <div>
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    background: 'linear-gradient(135deg, #0F172A 0%, #1E1B4B 100%)',
                    padding: '6px 14px',
                    borderRadius: '8px',
                    marginBottom: '10px'
                  }}>
                    <img src="/attendify-logo.png" alt="Attendify" style={{ height: '24px', width: 'auto' }} />
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0F172A' }}>
                    {companyInfo?.company_name || user?.company_name || 'Attendify Organization'}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#64748B', maxWidth: '300px' }}>
                    {companyInfo?.address || 'Global Technology Campus, Whitefield, Bengaluru'}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#5B50E5' }}>SALARY PAYSLIP</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0F172A' }}>
                    {previewData?.month_name || 'Month'} {selectedYear}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '4px' }}>
                    Generated via Face Biometrics
                  </div>
                </div>
              </div>

              {/* Employee & Attendance Overview Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', background: '#F8FAFC', padding: '16px', borderRadius: '10px', marginBottom: '24px', fontSize: '0.85rem' }}>
                <div>
                  <div><strong style={{ color: '#64748B' }}>Employee Name:</strong> <span style={{ color: '#0F172A', fontWeight: 600 }}>{selectedPayslip.user_name}</span></div>
                  <div style={{ marginTop: '4px' }}><strong style={{ color: '#64748B' }}>Designation:</strong> <span style={{ color: '#0F172A' }}>Member / Engineer</span></div>
                  <div style={{ marginTop: '4px' }}><strong style={{ color: '#64748B' }}>Payment Mode:</strong> <span style={{ color: '#0F172A' }}>{selectedPayslip.payment_mode || 'Bank Transfer'}</span></div>
                </div>
                <div>
                  <div><strong style={{ color: '#64748B' }}>Working Days:</strong> <span style={{ color: '#0F172A' }}>{selectedPayslip.working_days || workingDays}</span></div>
                  <div style={{ marginTop: '4px' }}><strong style={{ color: '#64748B' }}>Present Days:</strong> <span style={{ color: '#16A34A', fontWeight: 600 }}>{selectedPayslip.present_days}</span></div>
                  <div style={{ marginTop: '4px' }}><strong style={{ color: '#64748B' }}>LOP Absent Days:</strong> <span style={{ color: '#DC2626', fontWeight: 600 }}>{selectedPayslip.lop_days}</span></div>
                </div>
              </div>

              {/* Itemized 2-Column Earnings & Deductions */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
                {/* Earnings Table */}
                <div style={{ border: '1px solid #E2E8F0', borderRadius: '8px', overflow: 'hidden' }}>
                  <div style={{ background: '#F1F5F9', padding: '10px 14px', fontWeight: 700, fontSize: '0.85rem', color: '#0F172A' }}>
                    EARNINGS
                  </div>
                  <div style={{ padding: '12px 14px', fontSize: '0.82rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Basic Pay:</span>
                      <strong>{currency} {selectedPayslip.base_salary?.toLocaleString()}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>HRA:</span>
                      <strong>{currency} {selectedPayslip.hra?.toLocaleString()}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Allowances:</span>
                      <strong>{currency} {selectedPayslip.allowances?.toLocaleString()}</strong>
                    </div>
                    {selectedPayslip.overtime_pay > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#5B50E5' }}>
                        <span>Overtime Pay:</span>
                        <strong>+{currency} {selectedPayslip.overtime_pay}</strong>
                      </div>
                    )}
                    <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '8px', marginTop: '4px', display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                      <span>Gross Earnings:</span>
                      <span>{currency} {selectedPayslip.gross_pay?.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Deductions Table */}
                <div style={{ border: '1px solid #E2E8F0', borderRadius: '8px', overflow: 'hidden' }}>
                  <div style={{ background: '#F1F5F9', padding: '10px 14px', fontWeight: 700, fontSize: '0.85rem', color: '#0F172A' }}>
                    DEDUCTIONS
                  </div>
                  <div style={{ padding: '12px 14px', fontSize: '0.82rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#DC2626' }}>
                      <span>LOP (Absence):</span>
                      <strong>-{currency} {selectedPayslip.lop_deduction?.toLocaleString()}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Provident Fund (PF):</span>
                      <strong>-{currency} {selectedPayslip.pf_deduction?.toLocaleString()}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Tax Deducted (TDS):</span>
                      <strong>-{currency} {selectedPayslip.tax_deduction?.toLocaleString()}</strong>
                    </div>
                    <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '8px', marginTop: '4px', display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                      <span>Total Deductions:</span>
                      <span style={{ color: '#DC2626' }}>-{currency} {selectedPayslip.total_deductions?.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Net Pay Grand Highlight Card */}
              <div style={{
                background: 'linear-gradient(135deg, #0F172A 0%, #1E1B4B 100%)',
                color: '#FFFFFF',
                borderRadius: '12px',
                padding: '20px 24px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <div style={{ fontSize: '0.85rem', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>
                    Net Salary Payable
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#CBD5E1', marginTop: '4px' }}>
                    Disbursed to {selectedPayslip.bank_name || 'Bank Account'} ({selectedPayslip.account_number || '•••• 4821'})
                  </div>
                </div>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#4ADE80' }}>
                  {currency} {selectedPayslip.net_pay?.toLocaleString()}
                </div>
              </div>

              {/* Signature Footer */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '36px', paddingTop: '20px', borderTop: '1px solid #E2E8F0', fontSize: '0.78rem', color: '#64748B' }}>
                <div>Authorized Signatory (HR / Finance)</div>
                <div>Computer Generated Payslip • No Signature Required</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 2: EDIT SALARY STRUCTURE
          ========================================================================= */}
      {editEmployeeModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            maxWidth: '520px',
            width: '100%',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '16px 24px',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-heading)' }}>
                Configure Package: {editEmployeeModal.user_name}
              </h3>
              <button onClick={() => setEditEmployeeModal(null)} style={{ border: 'none', background: 'transparent', fontSize: '1.1rem', cursor: 'pointer' }}>
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveSalaryStructure} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                    Base Salary ({currency})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editEmployeeModal.base_salary}
                    onChange={(e) => setEditEmployeeModal({ ...editEmployeeModal, base_salary: parseFloat(e.target.value) || 0 })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                    HRA ({currency})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editEmployeeModal.hra}
                    onChange={(e) => setEditEmployeeModal({ ...editEmployeeModal, hra: parseFloat(e.target.value) || 0 })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                    Conveyance ({currency})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editEmployeeModal.conveyance_allowance}
                    onChange={(e) => setEditEmployeeModal({ ...editEmployeeModal, conveyance_allowance: parseFloat(e.target.value) || 0 })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                    Special Allowance ({currency})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editEmployeeModal.special_allowance}
                    onChange={(e) => setEditEmployeeModal({ ...editEmployeeModal, special_allowance: parseFloat(e.target.value) || 0 })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                    PF Rate (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={editEmployeeModal.pf_rate}
                    onChange={(e) => setEditEmployeeModal({ ...editEmployeeModal, pf_rate: parseFloat(e.target.value) || 0 })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                    Tax / TDS Rate (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={editEmployeeModal.tax_rate}
                    onChange={(e) => setEditEmployeeModal({ ...editEmployeeModal, tax_rate: parseFloat(e.target.value) || 0 })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                    Bank Name
                  </label>
                  <input
                    type="text"
                    value={editEmployeeModal.bank_name || ''}
                    onChange={(e) => setEditEmployeeModal({ ...editEmployeeModal, bank_name: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                    Account Number
                  </label>
                  <input
                    type="text"
                    value={editEmployeeModal.account_number || ''}
                    onChange={(e) => setEditEmployeeModal({ ...editEmployeeModal, account_number: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setEditEmployeeModal(null)}
                  className="btn-outline"
                  style={{ padding: '8px 16px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ padding: '8px 20px' }}
                >
                  Save Compensation Package
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
