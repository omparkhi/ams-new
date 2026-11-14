import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { formatTimeIST } from '../../utils/timeUtils';
import '../../styles/ams-theme.css';

export default function AttendanceHistory() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [filterName, setFilterName] = useState('');
  const [filterDate, setFilterDate] = useState('');

  const now = new Date();
  const [exportMonth, setExportMonth] = useState(now.getMonth() + 1);
  const [exportYear, setExportYear] = useState(now.getFullYear());

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterName) params.name = filterName;
      if (filterDate) params.date = filterDate;
      const res = await api.getAttendanceHistory(params);
      setRecords(res.records || []);
    } catch (err) {
      console.error("Failed to load history:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleExport = async () => {
    setDownloading(true);
    try {
      await api.downloadExcel(exportMonth, exportYear);
    } catch (err) {
      alert(err.message || 'Failed to download Excel report.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div>
      <div className="ams-dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Attendance History & Reports</h1>
          <p>Filter records and download company attendance workbooks</p>
        </div>

        {/* Download Excel Box */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <select
            value={exportMonth}
            onChange={(e) => setExportMonth(Number(e.target.value))}
            className="ams-input"
            style={{ width: 'auto', padding: '8px 12px' }}
          >
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {new Date(2000, i, 1).toLocaleString('default', { month: 'long' })}
              </option>
            ))}
          </select>

          <input
            type="number"
            value={exportYear}
            onChange={(e) => setExportYear(Number(e.target.value))}
            className="ams-input"
            style={{ width: '80px', padding: '8px 10px' }}
          />

          <button
            onClick={handleExport}
            disabled={downloading}
            className="ams-btn ams-btn-download"
          >
            {downloading ? 'Generating...' : '📥 Download Excel'}
          </button>
        </div>
      </div>

      {/* Filter Card */}
      <div className="ams-card" style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '200px' }}>
          <input
            type="text"
            placeholder="Search by user name..."
            value={filterName}
            onChange={(e) => setFilterName(e.target.value)}
            className="ams-input"
          />
        </div>

        <div style={{ width: '180px' }}>
          <input
            type="text"
            placeholder="Date (DD/MM/YYYY)"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="ams-input"
          />
        </div>

        <button onClick={fetchHistory} className="ams-btn ams-btn-primary">
          Filter
        </button>

        <button
          onClick={() => {
            setFilterName('');
            setFilterDate('');
            setTimeout(fetchHistory, 0);
          }}
          className="ams-btn"
        >
          Reset
        </button>
      </div>

      {/* History Table */}
      <div className="ams-card">
        <h2>Attendance Records</h2>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#A0A0A0' }}>
            Loading records...
          </div>
        ) : records.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#A0A0A0' }}>
            No records found.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="ams-table">
              <thead>
                <tr>
                  <th>User Name</th>
                  <th>Date</th>
                  <th>Check-In</th>
                  <th>Check-Out</th>
                  <th>Logged Hours</th>
                  <th>Status</th>
                  <th>Day Status</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r, idx) => (
                  <tr key={idx}>
                    <td style={{ fontWeight: 'bold' }}>{r.name}</td>
                    <td>{r.date}</td>
                    <td>{formatTimeIST(r.checkin)}</td>
                    <td>{formatTimeIST(r.checkout)}</td>
                    <td style={{ color: r.hours ? '#28A745' : '#A0A0A0' }}>
                      {r.hours ? `${r.hours} hrs` : '—'}
                    </td>
                    <td>{r.status}</td>
                    <td>
                      <span style={{
                        padding: '3px 8px',
                        borderRadius: '4px',
                        fontSize: '0.85rem',
                        backgroundColor: r.day_status === 'Half Day' ? '#DC3545' : r.checkin ? '#28A745' : '#6C757D',
                        color: '#fff'
                      }}>
                        {r.day_status || (r.checkin ? 'Present' : 'Absent')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
