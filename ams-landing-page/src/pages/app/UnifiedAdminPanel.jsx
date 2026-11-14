import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import {
  DashboardHouseIcon,
  AttendanceBadgeIcon,
  ScanViewfinderIcon,
  StudentAvatarIcon
} from '../../components/CustomNavIcons';
import '../../styles/ams-modern.css';

export default function UnifiedAdminPanel() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'attendance', 'mark-attendance', 'records'
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Data states
  const [todayData, setTodayData] = useState(null);
  const [students, setStudents] = useState([]);
  const [historyRecords, setHistoryRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all'); // 'all', 'present', 'absent'
  const [avatarErrors, setAvatarErrors] = useState({});

  // Modals
  const [modalImage, setModalImage] = useState(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showAddUserModal, setShowAddUserModal] = useState(false);

  // Settings form state
  const [companyInfo, setCompanyInfo] = useState({
    address: '',
    contact: '',
    email: '',
    check_in_time: '10:00',
    check_out_time: '18:30',
    required_hours: '7.0',
    leaves_per_month: '2'
  });

  // Mark Attendance Webcam refs & states
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [streamActive, setStreamActive] = useState(false);
  const [webcamStatus, setWebcamStatus] = useState('Align face and click capture to mark attendance');
  const [recognizedName, setRecognizedName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [webcamError, setWebcamError] = useState('');
  const [selectedKioskStudent, setSelectedKioskStudent] = useState('');

  // Add User 20-frame burst refs & states
  const enrollVideoRef = useRef(null);
  const enrollCanvasRef = useRef(null);
  const [enrollName, setEnrollName] = useState('');
  const [enrollStreamActive, setEnrollStreamActive] = useState(false);
  const [enrollCapturing, setEnrollCapturing] = useState(false);
  const [enrollProgress, setEnrollProgress] = useState(0);
  const [enrollMsg, setEnrollMsg] = useState({ text: '', isError: false });

  // Download state
  const [downloading, setDownloading] = useState(false);

  // Load Dashboard Data
  const loadDashboardData = async () => {
    try {
      const [todayRes, studentsRes, settingsRes] = await Promise.all([
        api.getTodayAttendance().catch(() => null),
        api.getStudents().catch(() => ({ students: [] })),
        api.getCompanySettings().catch(() => ({ settings: {} }))
      ]);

      if (todayRes) setTodayData(todayRes);
      if (studentsRes) setStudents(studentsRes.students || []);
      if (settingsRes?.settings) {
        const s = settingsRes.settings;
        setCompanyInfo({
          address: s['Address'] || '',
          contact: s['Contact'] || '',
          email: s['Email'] || '',
          check_in_time: (s['Check In Time'] || '10:00:00').substring(0, 5),
          check_out_time: (s['Check Out Time'] || '18:30:00').substring(0, 5),
          required_hours: String(s['Required Hours'] || '7.0'),
          leaves_per_month: String(s['Leaves Per Month'] || '2')
        });
      }
    } catch (err) {
      console.error("Error loading panel data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Handle Webcam for Mark Attendance Tab
  useEffect(() => {
    let stream = null;
    if (activeTab === 'mark-attendance') {
      navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } })
        .then((s) => {
          stream = s;
          if (videoRef.current) {
            videoRef.current.srcObject = s;
            videoRef.current.play();
            setStreamActive(true);
          }
        })
        .catch((err) => {
          setWebcamError("Error accessing camera. Please check camera permissions.");
          console.error("Webcam error:", err);
        });
    } else {
      if (videoRef.current && videoRef.current.srcObject) {
        videoRef.current.srcObject.getTracks().forEach((t) => t.stop());
        videoRef.current.srcObject = null;
        setStreamActive(false);
      }
    }

    return () => {
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
  }, [activeTab]);

  // Handle Webcam for Add User Modal
  useEffect(() => {
    let stream = null;
    if (showAddUserModal) {
      navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } })
        .then((s) => {
          stream = s;
          if (enrollVideoRef.current) {
            enrollVideoRef.current.srcObject = s;
            enrollVideoRef.current.play();
            setEnrollStreamActive(true);
          }
        })
        .catch((err) => {
          console.error("Enroll camera error:", err);
        });
    } else {
      if (enrollVideoRef.current && enrollVideoRef.current.srcObject) {
        enrollVideoRef.current.srcObject.getTracks().forEach((t) => t.stop());
        enrollVideoRef.current.srcObject = null;
        setEnrollStreamActive(false);
      }
    }

    return () => {
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
  }, [showAddUserModal]);

  // Mark Attendance Capture
  const handleCaptureAttendance = async () => {
    if (!videoRef.current || !canvasRef.current || isProcessing) return;

    setIsProcessing(true);
    setWebcamStatus("Scanning face features & matching...");
    setWebcamError('');
    setRecognizedName('');

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    canvas.getContext('2d').drawImage(video, 0, 0);
    const imageData = canvas.toDataURL('image/jpeg', 0.80);

    try {
      const result = await api.scanKiosk(imageData, selectedKioskStudent);
      setWebcamStatus(result.message || 'Action completed');
      if (result.name && result.name !== 'Unknown') {
        setRecognizedName(`✓ Recognized: ${result.name}`);
      }
      await loadDashboardData();
    } catch (err) {
      setWebcamError(err.message || 'Error processing image.');
      setWebcamStatus('Recognition failed. Try again with clear lighting.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Direct / Manual Check-In
  const handleForceCheckin = async (name) => {
    if (!window.confirm(`Check in ${name} now?`)) return;
    try {
      const res = await api.forceCheckin(name);
      alert(res.message || `Checked in ${name} successfully!`);
      await loadDashboardData();
    } catch (err) {
      alert(err.message || 'Failed to check in student.');
    }
  };

  // 20-frame Add User Capture
  const handleEnrollSubmit = async (e) => {
    e.preventDefault();
    if (!enrollName.trim()) return;

    const video = enrollVideoRef.current;
    const canvas = enrollCanvasRef.current;
    if (!video || !canvas) {
      setEnrollMsg({ text: 'Camera hardware is not ready. Please allow camera access.', isError: true });
      return;
    }

    setEnrollCapturing(true);
    setEnrollProgress(0);
    setEnrollMsg({ text: '', isError: false });

    const capturedFrames = [];
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');

    for (let i = 1; i <= 20; i++) {
      await new Promise((r) => setTimeout(r, 300));
      ctx.drawImage(video, 0, 0);
      capturedFrames.push(canvas.toDataURL('image/jpeg', 0.75));
      setEnrollProgress(i);
    }

    try {
      const res = await api.enrollStudent({
        name: enrollName.trim(),
        images: capturedFrames
      });
      setEnrollMsg({ text: `✓ ${res.message || 'User registered successfully!'}`, isError: false });
      setEnrollName('');
      await loadDashboardData();
      setTimeout(() => {
        setShowAddUserModal(false);
        setEnrollMsg({ text: '', isError: false });
      }, 1500);
    } catch (err) {
      setEnrollMsg({ text: err.message || 'Failed to enroll user.', isError: true });
    } finally {
      setEnrollCapturing(false);
    }
  };

  // Delete User
  const handleDeleteUser = async (name) => {
    if (!window.confirm(`Are you sure you want to delete ${name}? This will purge their biometric vectors and attendance records.`)) return;
    try {
      await api.deleteStudent(name);
      await loadDashboardData();
    } catch (err) {
      alert(err.message || 'Failed to delete user.');
    }
  };

  // Force Checkout
  const handleForceCheckout = async (name) => {
    if (!window.confirm(`Force check-out for ${name} now?`)) return;
    try {
      await api.forceCheckout(name);
      await loadDashboardData();
    } catch (err) {
      alert(err.message || 'Failed to force checkout.');
    }
  };

  // Save Settings Modal
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      await api.updateCompanySettings({
        address: companyInfo.address,
        contact: companyInfo.contact,
        email: companyInfo.email,
        check_in_time: companyInfo.check_in_time,
        check_out_time: companyInfo.check_out_time,
        required_hours: companyInfo.required_hours,
        leaves_per_month: companyInfo.leaves_per_month
      });
      setShowSettingsModal(false);
      await loadDashboardData();
      alert("Settings updated successfully!");
    } catch (err) {
      alert(err.message || "Failed to update settings");
    }
  };

  // Download Excel
  const handleDownloadExcel = async () => {
    setDownloading(true);
    try {
      const now = new Date();
      await api.downloadExcel(now.getMonth() + 1, now.getFullYear());
    } catch (err) {
      alert(err.message || 'Failed to download attendance Excel.');
    } finally {
      setDownloading(false);
    }
  };

  const totalStudents = todayData?.summary?.total_enrolled || students.length || 0;
  const presentStudents = todayData?.summary?.present_today || 0;
  const absentStudents = todayData?.summary?.absent_today || (totalStudents - presentStudents);
  const roster = todayData?.roster || [];
  const fullDayCount = roster.filter(r => r.day_status === 'Full Day').length;

  // Filter roster by search & filter
  const filteredRoster = roster.filter(r => {
    const matchesSearch = r.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (activeFilter === 'present') return matchesSearch && r.status === 'Present';
    if (activeFilter === 'absent') return matchesSearch && r.status !== 'Present';
    return matchesSearch;
  });

  return (
    <div className="modern-app-layout">
      {/* Mobile Drawer Backdrop */}
      <div
        className={`sidebar-backdrop ${mobileMenuOpen ? 'active' : ''}`}
        onClick={() => setMobileMenuOpen(false)}
        aria-hidden="true"
      />

      {/* ==========================================================================
          LEFT SIDEBAR (RIVERO STYLE)
          ========================================================================== */}
      <aside className={`modern-sidebar ${mobileMenuOpen ? 'open' : ''}`}>
        <div className="sidebar-brand-row">
          <a
            href="#/app"
            className="sidebar-brand"
            onClick={() => setMobileMenuOpen(false)}
            style={{
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
              padding: '8px 16px',
              borderRadius: '12px',
              boxShadow: '0 4px 14px rgba(15, 23, 42, 0.12)',
              marginBottom: '16px',
              width: '100%',
              justifyContent: 'center'
            }}
          >
            <img
              src="/attendify-logo.png"
              alt="Attendify"
              style={{ height: '28px', width: 'auto', display: 'block', objectFit: 'contain' }}
            />
          </a>
          <button
            className="sidebar-close-btn"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close menu"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <nav className="sidebar-nav">
          <button
            className={`nav-item ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => { setActiveTab('overview'); setMobileMenuOpen(false); }}
          >
            <DashboardHouseIcon size={20} />
            Dashboard
          </button>

          <button
            className={`nav-item ${activeTab === 'attendance' ? 'active' : ''}`}
            onClick={() => { setActiveTab('attendance'); setMobileMenuOpen(false); }}
          >
            <AttendanceBadgeIcon size={20} />
            Attendance
          </button>

          <button
            className={`nav-item ${activeTab === 'mark-attendance' ? 'active' : ''}`}
            onClick={() => { setActiveTab('mark-attendance'); setMobileMenuOpen(false); }}
          >
            <ScanViewfinderIcon size={20} />
            Mark Attendance
          </button>

          <button
            className={`nav-item ${activeTab === 'records' ? 'active' : ''}`}
            onClick={() => { setActiveTab('records'); setMobileMenuOpen(false); }}
          >
            <StudentAvatarIcon size={20} />
            Students / Records
          </button>

          <button
            className="nav-item"
            onClick={() => { setShowSettingsModal(true); setMobileMenuOpen(false); }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
            Shift Settings
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="tenant-badge">
            <div className="tenant-avatar">
              {(user?.company_name || 'T')[0].toUpperCase()}
            </div>
            <div className="tenant-info">
              <div className="name">{user?.company_name || 'TARS Tech'}</div>
              <div className="role">Company Admin</div>
            </div>
          </div>

          <button onClick={() => { logout(); setMobileMenuOpen(false); }} className="nav-item" style={{ color: '#EF4444' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Logout
          </button>
        </div>
      </aside>

      {/* ==========================================================================
          MAIN CONTENT AREA
          ========================================================================== */}
      <main className="modern-main">
        {/* TOP BAR */}
        <header className="modern-topbar">
          <div className="topbar-left">
            <button
              className="mobile-menu-btn"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open Navigation Menu"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
            </button>
            <h1 className="topbar-title">
              {activeTab === 'overview' && 'Dashboard'}
              {activeTab === 'attendance' && 'Live Attendance Roster'}
              {activeTab === 'mark-attendance' && 'Face Recognition Kiosk'}
              {activeTab === 'records' && 'Student Records & Management'}
            </h1>
          </div>

          <div className="topbar-actions">
            <a href="mailto:support@tarstechnologies.com" className="help-link">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              <span>Need help?</span>
            </a>

            <button className="icon-btn" title="Notifications">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
              <span className="unread-dot"></span>
            </button>

            <div
              className="tenant-avatar"
              style={{ width: '38px', height: '38px', fontSize: '0.95rem', cursor: 'pointer' }}
              onClick={() => setShowSettingsModal(true)}
              title="Company Settings"
            >
              {(user?.company_name || 'T')[0].toUpperCase()}
            </div>
          </div>
        </header>

        {/* CONTENT BODY */}
        <div className="modern-content-body">
          {/* Sub-header Navigation & Controls */}
          <div className="controls-bar">
            <div className="pill-tabs">
              <button
                className={`pill-tab ${activeTab === 'overview' ? 'active' : ''}`}
                onClick={() => setActiveTab('overview')}
              >
                Overview
              </button>
              <button
                className={`pill-tab ${activeTab === 'attendance' ? 'active' : ''}`}
                onClick={() => setActiveTab('attendance')}
              >
                Live Roster
              </button>
              <button
                className={`pill-tab ${activeTab === 'mark-attendance' ? 'active' : ''}`}
                onClick={() => setActiveTab('mark-attendance')}
              >
                Camera Kiosk
              </button>
              <button
                className={`pill-tab ${activeTab === 'records' ? 'active' : ''}`}
                onClick={() => setActiveTab('records')}
              >
                Records
              </button>
            </div>

            <div className="action-buttons-group">
              <button
                className="btn-outline"
                onClick={() => setShowAddUserModal(true)}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"/>
                  <line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                Enroll Student
              </button>

              <button
                className="btn-solid-primary"
                onClick={handleDownloadExcel}
                disabled={downloading}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                {downloading ? 'Exporting...' : 'Export all'}
              </button>
            </div>
          </div>

          {/* ==========================================================================
              TAB 1: OVERVIEW (RIVERO DASHBOARD EXACT REPRODUCTION)
              ========================================================================== */}
          {activeTab === 'overview' && (
            <div>
              {/* TOP ROW: Area Chart (Left) + Donut Gauge (Right) */}
              <div className="dashboard-grid-top">
                {/* WIDGET 1: Avg. Work Hours Area Chart */}
                <div className="modern-card">
                  <div className="card-header-flex">
                    <div>
                      <h3 className="card-title">Avg. Work hours</h3>
                      <p className="card-subtitle">8 Nov 2026 - 14 Nov 2026</p>
                    </div>
                    <span className="badge-pill">last 7Days</span>
                  </div>

                  <div className="area-chart-container">
                    <svg className="area-svg" viewBox="0 0 650 200">
                      <defs>
                        <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#5B50E5" stopOpacity="0.25" />
                          <stop offset="100%" stopColor="#5B50E5" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>

                      {/* Horizontal Grid lines */}
                      <line x1="40" y1="20" x2="630" y2="20" stroke="#F1F5F9" strokeWidth="1" />
                      <text x="15" y="24" fill="#94A3B8" fontSize="11" fontWeight="500">8h</text>

                      <line x1="40" y1="60" x2="630" y2="60" stroke="#F1F5F9" strokeWidth="1" />
                      <text x="15" y="64" fill="#94A3B8" fontSize="11" fontWeight="500">6h</text>

                      <line x1="40" y1="100" x2="630" y2="100" stroke="#F1F5F9" strokeWidth="1" />
                      <text x="15" y="104" fill="#94A3B8" fontSize="11" fontWeight="500">4h</text>

                      <line x1="40" y1="140" x2="630" y2="140" stroke="#F1F5F9" strokeWidth="1" />
                      <text x="15" y="144" fill="#94A3B8" fontSize="11" fontWeight="500">2h</text>

                      <line x1="40" y1="175" x2="630" y2="175" stroke="#E2E8F0" strokeWidth="1" />
                      <text x="20" y="179" fill="#94A3B8" fontSize="11" fontWeight="500">0</text>

                      {/* Area Fill */}
                      <path
                        d="M 60 115 
                           Q 110 90, 150 120 
                           T 240 135 
                           T 320 85 
                           T 410 110 
                           T 500 55 
                           T 600 80 
                           L 600 175 L 60 175 Z"
                        fill="url(#areaGradient)"
                      />

                      {/* Stroke Line Curve */}
                      <path
                        d="M 60 115 
                           Q 110 90, 150 120 
                           T 240 135 
                           T 320 85 
                           T 410 110 
                           T 500 55 
                           T 600 80"
                        fill="none"
                        stroke="#5B50E5"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                      />

                      {/* Interactive Point with Tooltip */}
                      <circle cx="320" cy="85" r="5" fill="#5B50E5" stroke="#FFFFFF" strokeWidth="2.5" />
                      <line x1="320" y1="85" x2="320" y2="175" stroke="#5B50E5" strokeWidth="1.5" strokeDasharray="3 3" />

                      {/* X Axis Labels */}
                      <text x="50" y="195" fill="#94A3B8" fontSize="11">8Nov</text>
                      <text x="140" y="195" fill="#94A3B8" fontSize="11">9Nov</text>
                      <text x="225" y="195" fill="#94A3B8" fontSize="11">10Nov</text>
                      <text x="310" y="195" fill="#94A3B8" fontSize="11">11Nov</text>
                      <text x="395" y="195" fill="#94A3B8" fontSize="11">12Nov</text>
                      <text x="480" y="195" fill="#94A3B8" fontSize="11">13Nov</text>
                      <text x="575" y="195" fill="#94A3B8" fontSize="11">14Nov</text>
                    </svg>

                    {/* Floating Tooltip Card */}
                    <div className="chart-tooltip-floating">
                      <div className="date">10 Nov 2026</div>
                      <div className="val">7.30 hrs</div>
                      <div className="trend">↗ +15% vs Avg</div>
                    </div>
                  </div>
                </div>

                {/* WIDGET 2: Member Type / Attendance Ratio Donut Gauge */}
                <div className="modern-card">
                  <div className="card-header-flex">
                    <div>
                      <h3 className="card-title">Member Type</h3>
                      <p className="card-subtitle">Active student ratio</p>
                    </div>
                    <span className="link-see-all" onClick={() => setActiveTab('attendance')}>See All</span>
                  </div>

                  <div className="donut-gauge-wrap">
                    <div className="donut-svg-box">
                      <svg width="180" height="120" viewBox="0 0 180 120">
                        {/* Background track */}
                        <path
                          d="M 25 100 A 65 65 0 0 1 155 100"
                          fill="none"
                          stroke="#F1F5F9"
                          strokeWidth="14"
                          strokeLinecap="round"
                        />
                        {/* Purple Arc (Present) */}
                        <path
                          d="M 25 100 A 65 65 0 0 1 125 45"
                          fill="none"
                          stroke="#5B50E5"
                          strokeWidth="14"
                          strokeLinecap="round"
                        />
                        {/* Yellow Arc (Absent) */}
                        <path
                          d="M 132 50 A 65 65 0 0 1 155 100"
                          fill="none"
                          stroke="#FFB800"
                          strokeWidth="14"
                          strokeLinecap="round"
                        />
                      </svg>

                      <div className="donut-center-text">
                        <span className="label">Total</span>
                        <span className="number">{totalStudents || 254}</span>
                      </div>
                    </div>

                    <div className="donut-legend-flex">
                      <div className="legend-item">
                        <span className="dot-indicator" style={{ backgroundColor: '#5B50E5' }}></span>
                        <div>
                          <div className="main">{presentStudents || 206} Present</div>
                          <div className="sub">+{Math.max(1, Math.round((presentStudents || 20) * 0.1))} Intern</div>
                        </div>
                      </div>

                      <div className="legend-item">
                        <span className="dot-indicator" style={{ backgroundColor: '#FFB800' }}></span>
                        <div>
                          <div className="main">{absentStudents || 48} Absent</div>
                          <div className="sub">+{Math.max(1, Math.round((absentStudents || 5) * 0.2))} Onboarding</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* MIDDLE ROW: 3 Columns (Present Stat, Compliance Stat, Recent Stream) */}
              <div className="dashboard-grid-mid">
                {/* WIDGET 3: Present Today */}
                <div className="modern-card">
                  <div className="card-header-flex">
                    <h3 className="card-title">Present Today</h3>
                    <span className="link-see-all" onClick={() => setActiveTab('attendance')}>See All</span>
                  </div>

                  <div className="metric-value-huge">
                    {presentStudents} <span style={{ fontSize: '1.1rem', color: '#64748B', fontWeight: '500' }}>/ {totalStudents}</span>
                  </div>

                  <div className="metric-trend-sub">
                    ↗ +15% Vs Last Week
                  </div>

                  <div className="mini-bar-chart">
                    <div className="mini-bar" style={{ height: '35%' }}></div>
                    <div className="mini-bar" style={{ height: '48%' }}></div>
                    <div className="mini-bar highlight-amber" style={{ height: '90%' }}></div>
                    <div className="mini-bar" style={{ height: '60%' }}></div>
                    <div className="mini-bar" style={{ height: '40%' }}></div>
                    <div className="mini-bar" style={{ height: '75%' }}></div>
                    <div className="mini-bar" style={{ height: '65%' }}></div>
                  </div>
                </div>

                {/* WIDGET 4: Shift Compliance */}
                <div className="modern-card">
                  <div className="card-header-flex">
                    <h3 className="card-title">Full Day Shifts</h3>
                    <span className="link-see-all" onClick={() => setActiveTab('attendance')}>See All</span>
                  </div>

                  <div className="metric-value-huge">
                    {fullDayCount} <span style={{ fontSize: '1.1rem', color: '#64748B', fontWeight: '500' }}>On-Time</span>
                  </div>

                  <div className="metric-trend-sub">
                    ↗ +12% Vs Last Week
                  </div>

                  <div className="mini-bar-chart">
                    <div className="mini-bar" style={{ height: '30%' }}></div>
                    <div className="mini-bar" style={{ height: '45%' }}></div>
                    <div className="mini-bar" style={{ height: '55%' }}></div>
                    <div className="mini-bar highlight-purple" style={{ height: '95%' }}></div>
                    <div className="mini-bar" style={{ height: '65%' }}></div>
                    <div className="mini-bar" style={{ height: '50%' }}></div>
                    <div className="mini-bar" style={{ height: '70%' }}></div>
                  </div>
                </div>

                {/* WIDGET 5: Recent Check-Ins Activity Stream */}
                <div className="modern-card">
                  <div className="card-header-flex">
                    <h3 className="card-title">Recent Check-Ins</h3>
                    <button
                      className="icon-btn"
                      style={{ width: '28px', height: '28px' }}
                      onClick={() => setActiveTab('mark-attendance')}
                      title="Open Camera Kiosk"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19"/>
                        <line x1="5" y1="12" x2="19" y2="12"/>
                      </svg>
                    </button>
                  </div>

                  <div className="recent-activity-list">
                    {roster.slice(0, 4).map((r, i) => (
                      <div key={r.name || i} className="activity-item">
                        <div className="activity-left">
                          <div className="user-thumb-circle">
                            {!avatarErrors[`act_${r.name}`] && r.has_snapshot && r.snapshot_url ? (
                              <img
                                src={r.snapshot_url}
                                alt={r.name}
                                onError={() => setAvatarErrors(prev => ({ ...prev, [`act_${r.name}`]: true }))}
                              />
                            ) : (
                              (r.name || 'U')[0].toUpperCase()
                            )}
                          </div>
                          <div>
                            <div className="activity-name">{r.name}</div>
                            <div className="activity-time">{r.checkin ? `Checked in at ${r.checkin}` : 'Not checked in yet'}</div>
                          </div>
                        </div>

                        <span className={`status-chip ${r.status === 'Present' ? 'present' : 'absent'}`}>
                          {r.status === 'Present' ? '✓ In' : '✕ Out'}
                        </span>
                      </div>
                    ))}

                    {roster.length === 0 && (
                      <p style={{ color: '#94A3B8', fontSize: '0.85rem', textAlign: 'center', padding: '16px 0' }}>
                        No attendance activity logged today yet.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* BOTTOM ROW: Live Attendance Roster (List of Member - 1:1 Rivero Design) */}
              <div className="modern-card roster-card">
                <div className="card-header-flex">
                  <div>
                    <h3 className="card-title">List of Member</h3>
                    <p className="card-subtitle">Daily attendance logs & biometric verification status</p>
                  </div>

                  <div className="member-search-wrap">
                    <svg className="search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8"/>
                      <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                    </svg>
                    <input
                      type="text"
                      placeholder="Search member..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="member-search-input"
                    />
                  </div>
                </div>

                <div className="member-list-container">
                  {filteredRoster.slice(0, 10).map((r) => (
                    <div className="member-row-card" key={r.name}>
                      {/* Col 1: Profile (Avatar + Name) */}
                      <div className="member-col-profile">
                        <div
                          className="member-avatar-box"
                          style={{ cursor: r.has_snapshot ? 'pointer' : 'default' }}
                          onClick={() => r.has_snapshot && setModalImage(r.snapshot_url)}
                          title={r.has_snapshot ? 'Click to view biometric snapshot' : r.name}
                        >
                          {!avatarErrors[r.name] && r.has_snapshot && r.snapshot_url ? (
                            <img
                              src={r.snapshot_url}
                              alt={r.name}
                              onError={() => setAvatarErrors(prev => ({ ...prev, [r.name]: true }))}
                              className="member-avatar-img"
                            />
                          ) : (
                            <div className="member-avatar-fallback">
                              {r.name ? r.name.substring(0, 2).toUpperCase() : 'U'}
                            </div>
                          )}
                        </div>
                        <div className="member-name-block">
                          <div className="member-name-title">{r.name}</div>
                          <div className="member-name-sub">
                            {r.roll_number || user?.company_name || 'Enrolled Student'}
                          </div>
                        </div>
                      </div>

                      {/* Col 2: Shift Info */}
                      <div className="member-col-shift">
                        <div className="shift-title">Fulltime</div>
                        <div className="shift-sub">
                          {companyInfo.required_hours || '7.0'}h ({companyInfo.check_in_time} - {companyInfo.check_out_time})
                        </div>
                      </div>

                      {/* Col 3: Department Pill */}
                      <div className="member-col-dept">
                        <span className="member-dept-badge">
                          {r.department || 'Engineering'}
                        </span>
                      </div>

                      {/* Col 4: Timestamps */}
                      <div className="member-col-time">
                        <div className="time-title">
                          {r.checkin ? r.checkin : <span className="time-empty">—</span>}
                        </div>
                        <div className="time-sub">
                          {r.checkout ? `Out: ${r.checkout}` : r.checkin ? `Working: ${r.hours || '0'}h` : 'No Check-in'}
                        </div>
                      </div>

                      {/* Col 5: Status & Date */}
                      <div className="member-col-status">
                        <div className={`status-title-text ${r.status === 'Present' ? 'present' : 'absent'}`}>
                          {r.day_status || r.status || 'Absent'}
                        </div>
                        <div className="status-date-sub">
                          {r.date || new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </div>
                      </div>

                      {/* Col 6: Action Button */}
                      <div className="member-col-action">
                        {r.allow_checkout ? (
                          <button
                            className="btn-member-action checkout"
                            onClick={() => handleForceCheckout(r.name)}
                          >
                            Force Checkout
                          </button>
                        ) : r.checkout ? (
                          <span className="badge-member-completed">✓ Completed</span>
                        ) : (
                          <button
                            className="btn-member-action checkin"
                            onClick={() => handleForceCheckin(r.name)}
                          >
                            Check In
                          </button>
                        )}
                      </div>
                    </div>
                  ))}

                  {filteredRoster.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '36px 0', color: '#8E8CA8', fontSize: '0.84rem' }}>
                      No matching members found in attendance roster.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ==========================================================================
              TAB 2: ATTENDANCE FULL ROSTER VIEW
              ========================================================================== */}
          {activeTab === 'attendance' && (
            <div className="modern-card">
              <div className="card-header-flex roster-header-flex">
                <div>
                  <h3 className="card-title">Live Attendance Roster</h3>
                  <p className="card-subtitle">Real-time contactless check-in/out records for today</p>
                </div>

                <div className="filter-buttons-group">
                  <button
                    className={`btn-outline ${activeFilter === 'all' ? 'active' : ''}`}
                    onClick={() => setActiveFilter('all')}
                  >
                    All ({roster.length})
                  </button>
                  <button
                    className="btn-outline"
                    onClick={() => setActiveFilter('present')}
                    style={{ color: '#10B981' }}
                  >
                    Present ({presentStudents})
                  </button>
                  <button
                    className="btn-outline"
                    onClick={() => setActiveFilter('absent')}
                    style={{ color: '#EF4444' }}
                  >
                    Absent ({absentStudents})
                  </button>
                </div>
              </div>

              <div className="table-responsive">
                <table className="roster-table">
                  <thead>
                    <tr>
                      <th>Student Name</th>
                      <th>Check-In</th>
                      <th>Check-Out</th>
                      <th>Status</th>
                      <th>Hours Worked</th>
                      <th>Photo Proof</th>
                      <th>Shift Category</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRoster.map((r) => (
                      <tr key={r.name}>
                        <td>
                          <div className="member-cell">
                            <div className="avatar">{r.name[0]}</div>
                            <div>
                              <div className="name">{r.name}</div>
                              <div className="sub">{user?.company_name}</div>
                            </div>
                          </div>
                        </td>
                        <td><strong>{r.checkin || '—'}</strong></td>
                        <td><strong>{r.checkout || '—'}</strong></td>
                        <td>
                          <span className={`status-chip ${r.status === 'Present' ? 'present' : 'absent'}`}>
                            {r.status}
                          </span>
                        </td>
                        <td>
                          <strong style={{ color: '#5B50E5' }}>{r.hours && r.hours !== '0' ? `${r.hours} hrs` : '—'}</strong>
                        </td>
                        <td>
                          {r.has_snapshot ? (
                            <button
                              className="btn-outline"
                              style={{ padding: '4px 10px', fontSize: '0.78rem' }}
                              onClick={() => setModalImage(r.snapshot_url)}
                            >
                              📷 View Photo
                            </button>
                          ) : (
                            <span style={{ color: '#94A3B8', fontSize: '0.8rem' }}>No Photo</span>
                          )}
                        </td>
                        <td>
                          <span className="dept-pill">{r.day_status || 'Regular'}</span>
                        </td>
                        <td>
                          {r.allow_checkout ? (
                            <button
                              className="btn-table-action checkout"
                              onClick={() => handleForceCheckout(r.name)}
                            >
                              Force Checkout
                            </button>
                          ) : r.checkout ? (
                            <span style={{ color: '#10B981', fontSize: '0.82rem', fontWeight: '600' }}>✓ Completed</span>
                          ) : (
                            <button
                              className="btn-table-action checkin"
                              onClick={() => handleForceCheckin(r.name)}
                            >
                              Check In
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ==========================================================================
              TAB 3: MARK ATTENDANCE (CAMERA KIOSK)
              ========================================================================== */}
          {activeTab === 'mark-attendance' && (
            <div className="modern-card kiosk-card-modern">
              <h3 className="card-title" style={{ fontSize: '1.4rem' }}>Biometric Face Attendance</h3>
              <p className="card-subtitle" style={{ maxWidth: '440px', margin: '4px auto 16px auto' }}>
                Look directly into the camera with clear lighting. The system matches your 128-d face embedding automatically.
              </p>

              <div className="video-view-wrap">
                <video ref={videoRef} width="640" height="480" autoPlay playsInline muted />
                <div className="face-target-guide"></div>
              </div>
              <canvas ref={canvasRef} style={{ display: 'none' }} />

              <div style={{ maxWidth: '380px', margin: '14px auto', textAlign: 'left' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.82rem', fontWeight: '600', color: '#64748B' }}>
                  Student Override (Optional):
                </label>
                <select
                  value={selectedKioskStudent}
                  onChange={(e) => setSelectedKioskStudent(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1px solid #E2E8F0',
                    fontSize: '0.9rem',
                    backgroundColor: '#FFFFFF',
                    color: '#0F172A',
                    outline: 'none'
                  }}
                >
                  <option value="">-- Automatic Facial Recognition Match --</option>
                  {students.map((s) => (
                    <option key={s.name} value={s.name}>{s.name}</option>
                  ))}
                </select>
              </div>

              <button
                className="btn-solid-primary"
                onClick={handleCaptureAttendance}
                disabled={isProcessing || !streamActive}
                style={{ margin: '12px auto', padding: '12px 32px', fontSize: '1rem', borderRadius: '12px' }}
              >
                {isProcessing ? 'Verifying Biometrics...' : 'Capture Image & Mark Attendance'}
              </button>

              <p style={{ marginTop: '12px', fontSize: '0.88rem', color: '#64748B' }}>{webcamStatus}</p>
              {recognizedName && (
                <div style={{ marginTop: '8px', color: '#10B981', fontWeight: '700', fontSize: '1.05rem' }}>
                  {recognizedName}
                </div>
              )}
              {webcamError && (
                <div style={{ marginTop: '8px', color: '#EF4444', fontSize: '0.88rem' }}>
                  {webcamError}
                </div>
              )}
            </div>
          )}

          {/* ==========================================================================
              TAB 4: RECORDS & MEMBER MANAGEMENT
              ========================================================================== */}
          {activeTab === 'records' && (
            <div className="modern-card">
              <div className="card-header-flex records-header-flex">
                <div>
                  <h3 className="card-title">Enrolled Members ({students.length})</h3>
                  <p className="card-subtitle">Manage company biometric vector database & registered students</p>
                </div>

                <button
                  className="btn-solid-primary"
                  onClick={() => setShowAddUserModal(true)}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"/>
                    <line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                  Enroll New Student
                </button>
              </div>

              <div className="table-responsive">
                <table className="roster-table">
                  <thead>
                    <tr>
                      <th>Student Name</th>
                      <th>Biometric Vectors</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((s) => (
                      <tr key={s.name}>
                        <td>
                          <div className="member-cell">
                            <div className="avatar">{s.name[0]}</div>
                            <div>
                              <div className="name">{s.name}</div>
                              <div className="sub">{user?.company_name}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="badge-pill">
                            {s.vector_count || 10} vectors cached
                          </span>
                        </td>
                        <td>
                          <span className="status-chip present">
                            ✓ Enrolled
                          </span>
                        </td>
                        <td>
                          <button
                            className="btn-table-action checkout"
                            onClick={() => handleDeleteUser(s.name)}
                            style={{ color: '#EF4444' }}
                          >
                            Delete Student
                          </button>
                        </td>
                      </tr>
                    ))}

                    {students.length === 0 && (
                      <tr>
                        <td colSpan="4" style={{ textAlign: 'center', padding: '32px 0', color: '#94A3B8' }}>
                          No students enrolled yet. Click "Enroll New Student" to get started.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ==========================================================================
          MODAL 1: ADD USER (20-FRAME BURST CAMERA ENROLLMENT)
          ========================================================================== */}
      {showAddUserModal && (
        <div className="modern-modal-overlay" onClick={() => !enrollCapturing && setShowAddUserModal(false)}>
          <div className="modern-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="card-header-flex">
              <div>
                <h3 className="card-title">Enroll Student (20-Frame Burst)</h3>
                <p className="card-subtitle">Captures 20 camera frames to build high-accuracy 128-d embeddings</p>
              </div>
              <button
                className="icon-btn"
                style={{ width: '32px', height: '32px' }}
                onClick={() => !enrollCapturing && setShowAddUserModal(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEnrollSubmit}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '6px', color: '#0F172A' }}>
                  Student Full Name:
                </label>
                <input
                  type="text"
                  placeholder="Enter student name (e.g. John Doe)"
                  value={enrollName}
                  onChange={(e) => setEnrollName(e.target.value)}
                  disabled={enrollCapturing}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1px solid #E2E8F0',
                    fontSize: '0.9rem',
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{ borderRadius: '12px', overflow: 'hidden', background: '#000', marginBottom: '14px' }}>
                <video ref={enrollVideoRef} width="100%" height="240" autoPlay playsInline muted style={{ display: 'block' }} />
                <canvas ref={enrollCanvasRef} style={{ display: 'none' }} />
              </div>

              {enrollCapturing && (
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '6px', color: '#5B50E5', fontWeight: '600' }}>
                    <span>Capturing Biometric Burst...</span>
                    <span>{enrollProgress} / 20</span>
                  </div>
                  <div style={{ width: '100%', height: '8px', background: '#F1F5F9', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${(enrollProgress / 20) * 100}%`, height: '100%', background: '#5B50E5', transition: 'width 0.2s linear' }}></div>
                  </div>
                </div>
              )}

              {enrollMsg.text && (
                <div style={{ marginBottom: '14px', padding: '10px', borderRadius: '8px', fontSize: '0.85rem', backgroundColor: enrollMsg.isError ? '#FEF2F2' : '#ECFDF5', color: enrollMsg.isError ? '#EF4444' : '#10B981' }}>
                  {enrollMsg.text}
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn-outline"
                  onClick={() => setShowAddUserModal(false)}
                  disabled={enrollCapturing}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-solid-primary"
                  disabled={enrollCapturing || !enrollName.trim()}
                >
                  {enrollCapturing ? 'Processing Burst...' : 'Start 20-Frame Capture'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================================================
          MODAL 2: SHIFT SETTINGS & COMPANY POLICY
          ========================================================================== */}
      {showSettingsModal && (
        <div className="modern-modal-overlay" onClick={() => setShowSettingsModal(false)}>
          <div className="modern-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="card-header-flex">
              <div>
                <h3 className="card-title">Company & Shift Configuration</h3>
                <p className="card-subtitle">Set check-in windows, required hours & tenant contact</p>
              </div>
              <button
                className="icon-btn"
                style={{ width: '32px', height: '32px' }}
                onClick={() => setShowSettingsModal(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveSettings}>
              <div className="modal-form-grid-2">
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', marginBottom: '4px', color: '#64748B' }}>
                    Shift Start (HH:MM):
                  </label>
                  <input
                    type="time"
                    value={companyInfo.check_in_time}
                    onChange={(e) => setCompanyInfo({ ...companyInfo, check_in_time: e.target.value })}
                    required
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #E2E8F0', outline: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', marginBottom: '4px', color: '#64748B' }}>
                    Shift End (HH:MM):
                  </label>
                  <input
                    type="time"
                    value={companyInfo.check_out_time}
                    onChange={(e) => setCompanyInfo({ ...companyInfo, check_out_time: e.target.value })}
                    required
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #E2E8F0', outline: 'none' }}
                  />
                </div>
              </div>

              <div className="modal-form-grid-2">
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', marginBottom: '4px', color: '#64748B' }}>
                    Required Hours / Day:
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={companyInfo.required_hours}
                    onChange={(e) => setCompanyInfo({ ...companyInfo, required_hours: e.target.value })}
                    required
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #E2E8F0', outline: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', marginBottom: '4px', color: '#64748B' }}>
                    Leaves Allowed / Month:
                  </label>
                  <input
                    type="number"
                    value={companyInfo.leaves_per_month}
                    onChange={(e) => setCompanyInfo({ ...companyInfo, leaves_per_month: e.target.value })}
                    required
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #E2E8F0', outline: 'none' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', marginBottom: '4px', color: '#64748B' }}>
                  Office Address:
                </label>
                <input
                  type="text"
                  value={companyInfo.address}
                  onChange={(e) => setCompanyInfo({ ...companyInfo, address: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #E2E8F0', outline: 'none' }}
                />
              </div>

              <div className="modal-form-grid-2" style={{ marginBottom: '18px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', marginBottom: '4px', color: '#64748B' }}>
                    Contact Phone:
                  </label>
                  <input
                    type="text"
                    value={companyInfo.contact}
                    onChange={(e) => setCompanyInfo({ ...companyInfo, contact: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #E2E8F0', outline: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', marginBottom: '4px', color: '#64748B' }}>
                    Support Email:
                  </label>
                  <input
                    type="email"
                    value={companyInfo.email}
                    onChange={(e) => setCompanyInfo({ ...companyInfo, email: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #E2E8F0', outline: 'none' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn-outline"
                  onClick={() => setShowSettingsModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-solid-primary"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================================================
          MODAL 3: CHECK-IN SNAPSHOT PROOF PREVIEW
          ========================================================================== */}
      {modalImage && (
        <div className="modern-modal-overlay" onClick={() => setModalImage(null)}>
          <div className="modern-modal-dialog" style={{ textAlign: 'center', maxWidth: '460px' }} onClick={(e) => e.stopPropagation()}>
            <h3 className="card-title" style={{ marginBottom: '12px' }}>Check-In Snapshot Proof</h3>
            <img
              src={modalImage}
              alt="Check-in Snapshot"
              style={{ width: '100%', borderRadius: '12px', border: '1px solid #EEF2F6', marginBottom: '16px' }}
            />
            <button
              className="btn-outline"
              style={{ width: '100%', justifyContent: 'center' }}
              onClick={() => setModalImage(null)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
