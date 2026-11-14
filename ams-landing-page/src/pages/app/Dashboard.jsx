import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { formatTimeIST } from '../../utils/timeUtils';
import '../../styles/ams-theme.css';

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState({});
  const [showWelcome, setShowWelcome] = useState(true);

  const fetchDashboardData = async () => {
    try {
      setError('');
      const res = await api.getTodayAttendance();
      setData(res);
    } catch (err) {
      setError(err.message || 'Failed to fetch dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleForceCheckout = async (studentName) => {
    if (!window.confirm(`Force checkout for ${studentName} now?`)) return;

    setActionLoading((prev) => ({ ...prev, [studentName]: true }));
    try {
      await api.forceCheckout(studentName);
      await fetchDashboardData();
    } catch (err) {
      alert(err.message || 'Failed to force checkout.');
    } finally {
      setActionLoading((prev) => ({ ...prev, [studentName]: false }));
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px 0', color: '#A0A0A0' }}>
        <p>Loading attendance data...</p>
      </div>
    );
  }

  const summary = data?.summary || { total_enrolled: 0, present_today: 0, absent_today: 0, completed_today: 0 };
  const roster = data?.roster || [];

  return (
    <div>
      {/* Welcome Message Banner from admin_panel.html */}
      {showWelcome && (
        <div className="ams-welcome-message">
          <span>👋 Welcome back, <strong>{user?.username}</strong>! Live attendance tracking is active for <strong>{user?.company_name}</strong>.</span>
          <button
            onClick={() => setShowWelcome(false)}
            style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#155724' }}
          >
            ×
          </button>
        </div>
      )}

      {/* Dashboard Header from admin_panel.html */}
      <div className="ams-dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Admin Dashboard</h1>
          <p>Today's Date: <strong>{data?.date}</strong> (Indian Standard Time)</p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={fetchDashboardData} className="ams-btn">
            ↻ Refresh Roster
          </button>
          <Link to="/app/kiosk" className="ams-btn ams-btn-success">
            📷 Launch Attendance Kiosk
          </Link>
          <Link to="/app/enroll" className="ams-btn ams-btn-primary">
            + Add User
          </Link>
        </div>
      </div>

      {error && (
        <div className="ams-error-message">
          {error}
        </div>
      )}

      {/* Stats Cards from admin_panel.html */}
      <div className="ams-stats">
        <div className="ams-stat-card">
          <span className="icon">👥</span>
          <h3>{summary.total_enrolled}</h3>
          <p>Total Enrolled Users</p>
        </div>

        <div className="ams-stat-card">
          <span className="icon" style={{ color: '#28A745' }}>✓</span>
          <h3 style={{ color: '#28A745' }}>{summary.present_today}</h3>
          <p>Present Today</p>
        </div>

        <div className="ams-stat-card">
          <span className="icon" style={{ color: '#FFC107' }}>⚠</span>
          <h3 style={{ color: '#FFC107' }}>{summary.absent_today}</h3>
          <p>Absent Today</p>
        </div>

        <div className="ams-stat-card">
          <span className="icon" style={{ color: '#17A2B8' }}>🕒</span>
          <h3 style={{ color: '#17A2B8' }}>{summary.completed_today}</h3>
          <p>Shifts Completed</p>
        </div>
      </div>

      {/* Today's Table in Card from admin_panel.html */}
      <div className="ams-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>Today's Live Attendance Records</h2>
          <span style={{ color: '#A0A0A0', fontSize: '0.9rem' }}>{roster.length} registered users</span>
        </div>

        {roster.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#A0A0A0' }}>
            <p>No users enrolled for this company yet.</p>
            <Link to="/app/enroll" className="ams-btn ams-btn-primary" style={{ marginTop: '10px' }}>
              Add First User →
            </Link>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="ams-table">
              <thead>
                <tr>
                  <th>User Name</th>
                  <th>Check-In Time</th>
                  <th>Check-Out Time</th>
                  <th>Worked Hours</th>
                  <th>Status</th>
                  <th>Day Status</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {roster.map((student) => (
                  <tr key={student.name}>
                    <td style={{ fontWeight: '600' }}>{student.name}</td>
                    <td>{formatTimeIST(student.checkin)}</td>
                    <td>{formatTimeIST(student.checkout)}</td>
                    <td style={{ color: student.hours && student.hours !== '0' ? '#28A745' : '#A0A0A0' }}>
                      {student.hours && student.hours !== '0' ? `${student.hours} hrs` : '—'}
                    </td>
                    <td>
                      <span style={{
                        padding: '3px 8px',
                        borderRadius: '4px',
                        fontSize: '0.85rem',
                        fontWeight: 'bold',
                        backgroundColor: student.status === 'Present' ? '#28A745' : '#6C757D',
                        color: '#fff'
                      }}>
                        {student.status}
                      </span>
                    </td>
                    <td>
                      <span style={{
                        padding: '3px 8px',
                        borderRadius: '4px',
                        fontSize: '0.85rem',
                        backgroundColor: student.day_status === 'Half Day' ? '#DC3545' : student.checkin ? '#28A745' : '#6C757D',
                        color: '#fff'
                      }}>
                        {student.day_status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {student.allow_checkout ? (
                        <button
                          onClick={() => handleForceCheckout(student.name)}
                          disabled={actionLoading[student.name]}
                          className="ams-btn ams-btn-danger"
                          style={{ padding: '5px 10px', fontSize: '0.85rem' }}
                        >
                          {actionLoading[student.name] ? 'Processing...' : 'Force Checkout'}
                        </button>
                      ) : student.checkout ? (
                        <span style={{ color: '#28A745', fontSize: '0.9rem' }}>✓ Shift Completed</span>
                      ) : (
                        <span style={{ color: '#A0A0A0', fontSize: '0.85rem' }}>Not checked in</span>
                      )}
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
