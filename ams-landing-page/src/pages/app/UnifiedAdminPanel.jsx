import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import {
  DashboardHouseIcon,
  AttendanceBadgeIcon,
  ScanViewfinderIcon,
  StudentAvatarIcon,
  PayrollWalletIcon
} from '../../components/CustomNavIcons';
import '../../styles/ams-modern.css';
import AMS from "../../assets/ams2.png";
import { formatTimeIST, formatShiftTime, getLiveTimeIST } from '../../utils/timeUtils';

const resolveImageUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  const apiOrigin = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000/api').replace(/\/api\/?$/, '');
  return `${apiOrigin}${url.startsWith('/') ? '' : '/'}${url}`;
};

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
  const [attendanceSuccessModal, setAttendanceSuccessModal] = useState(null);

  // Auto-dismiss attendance success popup after 3.8s
  useEffect(() => {
    if (attendanceSuccessModal) {
      const timer = setTimeout(() => {
        setAttendanceSuccessModal(null);
      }, 3800);
      return () => clearTimeout(timer);
    }
  }, [attendanceSuccessModal]);

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

  // Kiosk Portal Link & Access PIN State
  const [kioskInfo, setKioskInfo] = useState({
    slug: '',
    kiosk_pin: '',
    kiosk_url: '',
    company_name: ''
  });
  const [copiedLink, setCopiedLink] = useState(false);
  const [regeneratingPin, setRegeneratingPin] = useState(false);
  const [showPin, setShowPin] = useState(false);

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
      const [todayRes, studentsRes, settingsRes, kioskRes] = await Promise.all([
        api.getTodayAttendance().catch(() => null),
        api.getStudents().catch(() => ({ students: [] })),
        api.getCompanySettings().catch(() => ({ settings: {} })),
        api.getKioskSettings().catch(() => null)
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
      if (kioskRes && kioskRes.success) {
        setKioskInfo({
          slug: kioskRes.slug || '',
          kiosk_pin: kioskRes.kiosk_pin || '',
          kiosk_url: kioskRes.kiosk_url || `/kiosk/${kioskRes.slug}`,
          company_name: kioskRes.company_name || ''
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
      const result = await api.scanKiosk(imageData, '');
      setWebcamStatus(result.message || 'Action completed');
      if (result.name && result.name !== 'Unknown') {
        setRecognizedName(`✓ Recognized: ${result.name}`);
        const isCheckout = result.status === 'checkout_success';
        const isCompleted = result.status === 'already_completed';
        const isBlocked = result.status === 'checkout_blocked';
        const timeVal = formatTimeIST(result.checkout_time || result.checkin_time || getLiveTimeIST());
        
        setAttendanceSuccessModal({
          open: true,
          name: result.name,
          type: isCheckout ? 'checkout' : isCompleted || isBlocked ? 'info' : 'checkin',
          time: timeVal,
          statusBadge: isBlocked ? 'Scan Cooldown' : isCompleted ? 'Attendance Completed' : isCheckout ? 'Check-Out Recorded' : (result.day_status || 'Check-In Recorded'),
          message: result.message || 'Biometric attendance verified successfully!'
        });
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
      const currentTime = formatTimeIST(res?.checkin_time || getLiveTimeIST());
      setAttendanceSuccessModal({
        open: true,
        name: name,
        type: 'checkin',
        time: currentTime,
        statusBadge: 'Manual Check-In',
        message: res?.message || `Checked in ${name} successfully!`
      });
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
      const res = await api.forceCheckout(name);
      const currentTime = formatTimeIST(res?.checkout_time || getLiveTimeIST());
      setAttendanceSuccessModal({
        open: true,
        name: name,
        type: 'checkout',
        time: currentTime,
        statusBadge: 'Manual Check-Out',
        message: res?.message || `Checked out ${name} successfully!`
      });
      await loadDashboardData();
    } catch (err) {
      alert(err.message || 'Failed to force checkout.');
    }
  };

  // Copy Kiosk Link
  const handleCopyKioskLink = () => {
    const slug = kioskInfo.slug || 'terminal';
    const fullUrl = `${window.location.origin}/kiosk/${slug}`;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(fullUrl);
    } else {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = fullUrl;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // Regenerate Kiosk PIN
  const handleRegeneratePin = async () => {
    if (!window.confirm("Regenerating the Kiosk PIN will require all front-desk kiosk devices to authenticate with the new PIN. Proceed?")) {
      return;
    }
    setRegeneratingPin(true);
    try {
      const res = await api.updateKioskSettings({ regenerate: true });
      if (res && res.success) {
        setKioskInfo(prev => ({
          ...prev,
          kiosk_pin: res.kiosk_pin,
          slug: res.slug || prev.slug
        }));
        setShowPin(true);
      }
    } catch (err) {
      alert(err.message || "Failed to regenerate PIN");
    } finally {
      setRegeneratingPin(false);
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

      if (kioskInfo.slug || kioskInfo.kiosk_pin) {
        await api.updateKioskSettings({
          slug: kioskInfo.slug,
          kiosk_pin: kioskInfo.kiosk_pin
        }).catch(err => {
          console.warn("Kiosk settings update warning:", err);
        });
      }

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

  // ==========================================================================
  // PAYROLL & COMPENSATION STATE & HANDLERS
  // ==========================================================================
  const currentJsDate = new Date();
  const [payrollMonth, setPayrollMonth] = useState(currentJsDate.getMonth() + 1);
  const [payrollYear, setPayrollYear] = useState(currentJsDate.getFullYear());
  const [payrollWorkingDays, setPayrollWorkingDays] = useState(26);
  const [payrollItems, setPayrollItems] = useState([]);
  const [payrollSummary, setPayrollSummary] = useState(null);
  const [payrollMembers, setPayrollMembers] = useState([]);
  const [payrollHistory, setPayrollHistory] = useState([]);
  const [payrollSubTab, setPayrollSubTab] = useState('run'); // 'run', 'salaries', 'history'
  const [payrollLoading, setPayrollLoading] = useState(false);
  const [payrollFinalizing, setPayrollFinalizing] = useState(false);
  const [payrollAlert, setPayrollAlert] = useState({ text: '', type: '' });
  const [payrollSearch, setPayrollSearch] = useState('');

  // Payslip Modal
  const [selectedPayslip, setSelectedPayslip] = useState(null);
  const [showPayslipModal, setShowPayslipModal] = useState(false);

  // Edit Salary Modal
  const [salaryEditModal, setSalaryEditModal] = useState({ open: false, userName: '', baseSalary: 25000, saving: false });

  const formatCurrency = (amount) => {
    const val = Number(amount) || 0;
    return '₹' + val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const getMonthName = (m) => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[(parseInt(m, 10) - 1)] || `Month ${m}`;
  };

  const loadPayrollData = async (m = payrollMonth, y = payrollYear, wd = payrollWorkingDays) => {
    setPayrollLoading(true);
    setPayrollAlert({ text: '', type: '' });
    try {
      const res = await api.calculatePayroll(m, y, wd);
      if (res) {
        setPayrollItems(res.items || []);
        setPayrollSummary(res.summary || null);
      }
    } catch (err) {
      console.error("Error calculating payroll:", err);
      setPayrollAlert({ text: err.message || 'Failed to calculate payroll from attendance records', type: 'error' });
    } finally {
      setPayrollLoading(false);
    }
  };

  const loadPayrollMembers = async () => {
    try {
      const res = await api.getPayrollMembers();
      if (res && res.members) {
        setPayrollMembers(res.members);
      }
    } catch (err) {
      console.error("Error loading payroll members:", err);
    }
  };

  const loadPayrollHistory = async () => {
    try {
      const res = await api.getPayrollHistory();
      if (res && res.history) {
        setPayrollHistory(res.history);
      }
    } catch (err) {
      console.error("Error loading payroll history:", err);
    }
  };

  useEffect(() => {
    if (activeTab === 'payroll') {
      if (payrollSubTab === 'run') {
        loadPayrollData(payrollMonth, payrollYear, payrollWorkingDays);
      } else if (payrollSubTab === 'salaries') {
        loadPayrollMembers();
      } else if (payrollSubTab === 'history') {
        loadPayrollHistory();
      }
    }
  }, [activeTab, payrollSubTab]);

  const handleFinalizePayroll = async () => {
    if (!payrollItems || payrollItems.length === 0) return;
    const confirmMsg = `Approve and finalize payroll for ${getMonthName(payrollMonth)} ${payrollYear}?\n\nTotal Net Disbursement: ${formatCurrency(payrollSummary?.total_payout)}\nTotal Employees: ${payrollSummary?.total_employees || payrollItems.length}\n\nThis will lock the monthly payroll and record individual payslips in the database.`;
    if (!window.confirm(confirmMsg)) return;

    setPayrollFinalizing(true);
    try {
      const res = await api.finalizePayroll({
        month: payrollMonth,
        year: payrollYear,
        working_days: payrollWorkingDays,
        items: payrollItems
      });
      setPayrollAlert({ text: res.message || 'Payroll finalized and locked successfully.', type: 'success' });
      await loadPayrollData(payrollMonth, payrollYear, payrollWorkingDays);
    } catch (err) {
      console.error("Error finalizing payroll:", err);
      setPayrollAlert({ text: err.message || 'Failed to finalize payroll', type: 'error' });
    } finally {
      setPayrollFinalizing(false);
    }
  };

  const handleSaveSalary = async (e) => {
    e.preventDefault();
    if (!salaryEditModal.userName) return;
    setSalaryEditModal(prev => ({ ...prev, saving: true }));
    try {
      await api.updateMemberSalary(salaryEditModal.userName, salaryEditModal.baseSalary);
      setPayrollAlert({ text: `Base monthly salary for ${salaryEditModal.userName} updated to ${formatCurrency(salaryEditModal.baseSalary)}`, type: 'success' });
      setSalaryEditModal({ open: false, userName: '', baseSalary: 25000, saving: false });
      loadPayrollMembers();
      loadPayrollData(payrollMonth, payrollYear, payrollWorkingDays);
    } catch (err) {
      console.error("Error updating salary:", err);
      alert(err.message || 'Failed to update salary');
      setSalaryEditModal(prev => ({ ...prev, saving: false }));
    }
  };

  const handleOpenPayslip = (item) => {
    setSelectedPayslip({
      ...item,
      month: payrollMonth,
      year: payrollYear,
      company_name: user?.company_name || 'Attendify Technologies Inc.',
      date_generated: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    });
    setShowPayslipModal(true);
  };

  const filteredPayrollItems = payrollItems.filter(it =>
    it.user_name.toLowerCase().includes(payrollSearch.toLowerCase())
  );
  const filteredPayrollMembers = payrollMembers.filter(m =>
    m.name.toLowerCase().includes(payrollSearch.toLowerCase())
  );

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
            className="sidebar-brand-link"
            onClick={() => setMobileMenuOpen(false)}
            title="Attendify Dashboard"
          >
            <img
              src={AMS}
              alt="Attendify"
              className="sidebar-brand-logo"
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
            className={`nav-item ${activeTab === 'payroll' ? 'active' : ''}`}
            onClick={() => { setActiveTab('payroll'); setMobileMenuOpen(false); }}
          >
            <PayrollWalletIcon size={20} />
            Payroll
          </button>

          <button
            className="nav-item"
            onClick={() => { setShowSettingsModal(true); setMobileMenuOpen(false); }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
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
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
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
              {activeTab === 'payroll' && 'Payroll & Compensation'}
            </h1>
          </div>

          <div className="topbar-actions">
            <a href="mailto:support@tarstechnologies.com" className="help-link">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <span>Need help?</span>
            </a>

            <button className="icon-btn" title="Notifications">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
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
              <button
                className={`pill-tab ${activeTab === 'payroll' ? 'active' : ''}`}
                onClick={() => setActiveTab('payroll')}
              >
                Payroll
              </button>
            </div>

            <div className="action-buttons-group">
              <button
                className="btn-outline"
                onClick={() => setShowAddUserModal(true)}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Enroll Student
              </button>

              <button
                className="btn-solid-primary"
                onClick={handleDownloadExcel}
                disabled={downloading}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
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
              {/* KIOSK SHARE & ACCESS CONTROL BANNER */}
              <div className="kiosk-share-banner">
                <div className="kiosk-share-left">
                  <div className="kiosk-share-icon">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                      <line x1="8" y1="21" x2="16" y2="21" />
                      <line x1="12" y1="17" x2="12" y2="21" />
                    </svg>
                  </div>
                  <div className="kiosk-share-info">
                    <div className="kiosk-share-title">
                      <span>Front-Desk Kiosk Terminal</span>
                      <span className="kiosk-share-pill">
                        {kioskInfo.slug ? `/kiosk/${kioskInfo.slug}` : 'Configured'}
                      </span>
                    </div>
                    <div className="kiosk-share-desc">
                      Share this isolated link with reception tablets or interns. Only biometric check-in, check-out, and self-enrollment are exposed. Payroll and administrative records remain 100% confidential.
                    </div>
                  </div>
                </div>

                <div className="kiosk-share-actions">
                  <div className="kiosk-pin-chip" title="Kiosk 6-digit access PIN">
                    <span className="kiosk-pin-label">PIN:</span>
                    <span className="kiosk-pin-value">
                      {showPin ? (kioskInfo.kiosk_pin || '------') : (kioskInfo.kiosk_pin ? '••••••' : '------')}
                    </span>
                    <button
                      type="button"
                      className="kiosk-pin-toggle"
                      onClick={() => setShowPin(!showPin)}
                      title={showPin ? "Hide PIN" : "Reveal PIN"}
                      aria-label="Toggle PIN Visibility"
                    >
                      {showPin ? (
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                      ) : (
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>
                    <button
                      type="button"
                      className="kiosk-pin-regen"
                      onClick={handleRegeneratePin}
                      disabled={regeneratingPin}
                      title="Regenerate PIN"
                      aria-label="Regenerate PIN"
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="23 4 23 10 17 10" />
                        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                      </svg>
                    </button>
                  </div>

                  <button
                    type="button"
                    className="kiosk-copy-btn"
                    onClick={handleCopyKioskLink}
                    title="Copy direct kiosk URL to clipboard"
                  >
                    {copiedLink ? (
                      <>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                        </svg>
                        <span>Copy Kiosk Link</span>
                      </>
                    )}
                  </button>

                  <a
                    href={`/kiosk/${kioskInfo.slug || 'terminal'}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="kiosk-open-btn"
                    title="Open Kiosk Terminal in new tab"
                  >
                    <span>Launch</span>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                      <polyline points="15 3 21 3 21 9" />
                      <line x1="10" y1="14" x2="21" y2="3" />
                    </svg>
                  </a>
                </div>
              </div>

              {/* TOP ROW: Area Chart (Left) + Donut Gauge (Right) */}
              <div className="dashboard-grid-top">
                {/* WIDGET 1: Avg. Work Hours Area Chart */}
                <div className="modern-card">
                  <div className="card-header-flex">
                    <div>
                      <h3 className="card-title">Attendance Hours Trend</h3>
                      <p className="card-subtitle">Daily average student/staff active hours</p>
                    </div>
                    <span className="badge-pill">Live Tracking</span>
                  </div>

                  {totalStudents === 0 || roster.filter(r => r.checkin).length === 0 ? (
                    <div style={{ padding: '44px 20px', textAlign: 'center' }}>
                      <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#EEF2FF', color: '#6857DF', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 3v18h18" />
                          <path d="m19 9-5 5-4-4-3 3" />
                        </svg>
                      </div>
                      <h4 style={{ fontSize: '0.96rem', fontWeight: 600, color: '#1E293B', marginBottom: '4px' }}>
                        No Attendance Activity Recorded Yet
                      </h4>
                      <p style={{ fontSize: '0.82rem', color: '#64748B', maxWidth: '340px', margin: '0 auto 16px' }}>
                        {totalStudents === 0
                          ? 'Enroll students or team members to start tracking daily work hours and attendance.'
                          : 'Students are enrolled. Check in using the Camera Kiosk to generate daily work hour trends.'}
                      </p>
                      {totalStudents === 0 ? (
                        <button
                          type="button"
                          className="btn-solid-primary"
                          onClick={() => setShowAddUserModal(true)}
                          style={{ padding: '6px 14px', fontSize: '0.82rem' }}
                        >
                          Enroll First Student
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="btn-solid-primary"
                          onClick={() => setActiveTab('mark-attendance')}
                          style={{ padding: '6px 14px', fontSize: '0.82rem' }}
                        >
                          Open Camera Kiosk
                        </button>
                      )}
                    </div>
                  ) : (
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
                          d="M 60 145 Q 150 130, 240 140 T 410 120 T 500 90 T 600 80 L 600 175 L 60 175 Z"
                          fill="url(#areaGradient)"
                        />

                        {/* Stroke Line Curve */}
                        <path
                          d="M 60 145 Q 150 130, 240 140 T 410 120 T 500 90 T 600 80"
                          fill="none"
                          stroke="#5B50E5"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                        />

                        {/* Interactive Point for Today */}
                        <circle cx="600" cy="80" r="5" fill="#5B50E5" stroke="#FFFFFF" strokeWidth="2.5" />
                        <line x1="600" y1="80" x2="600" y2="175" stroke="#5B50E5" strokeWidth="1.5" strokeDasharray="3 3" />

                        {/* Dynamic 7 Days Labels */}
                        {Array.from({ length: 7 }, (_, i) => {
                          const d = new Date();
                          d.setDate(d.getDate() - (6 - i));
                          const label = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
                          const xPos = 60 + i * 90;
                          return (
                            <text key={i} x={xPos} y="195" fill="#94A3B8" fontSize="11" textAnchor="middle">
                              {label}
                            </text>
                          );
                        })}
                      </svg>
                    </div>
                  )}
                </div>

                {/* WIDGET 2: Member Attendance Donut Gauge */}
                <div className="modern-card">
                  <div className="card-header-flex">
                    <div>
                      <h3 className="card-title">Member Attendance</h3>
                      <p className="card-subtitle">Active member attendance ratio</p>
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
                        {/* Purple Arc (Present) - only if there are enrolled members and present students */}
                        {totalStudents > 0 && presentStudents > 0 && (
                          <path
                            d={presentStudents === totalStudents
                              ? "M 25 100 A 65 65 0 0 1 155 100"
                              : "M 25 100 A 65 65 0 0 1 125 45"}
                            fill="none"
                            stroke="#5B50E5"
                            strokeWidth="14"
                            strokeLinecap="round"
                          />
                        )}
                        {/* Yellow Arc (Absent) - only if there are enrolled members and absent students */}
                        {totalStudents > 0 && absentStudents > 0 && (
                          <path
                            d={presentStudents === 0
                              ? "M 25 100 A 65 65 0 0 1 155 100"
                              : "M 132 50 A 65 65 0 0 1 155 100"}
                            fill="none"
                            stroke="#FFB800"
                            strokeWidth="14"
                            strokeLinecap="round"
                          />
                        )}
                      </svg>

                      <div className="donut-center-text">
                        <span className="label">Total</span>
                        <span className="number">{totalStudents}</span>
                      </div>
                    </div>

                    <div className="donut-legend-flex">
                      <div className="legend-item">
                        <span className="dot-indicator" style={{ backgroundColor: '#5B50E5' }}></span>
                        <div>
                          <div className="main">{presentStudents} Present</div>
                          <div className="sub">
                            {totalStudents > 0 ? `${Math.round((presentStudents / totalStudents) * 100)}% active today` : '0% active'}
                          </div>
                        </div>
                      </div>

                      <div className="legend-item">
                        <span className="dot-indicator" style={{ backgroundColor: '#FFB800' }}></span>
                        <div>
                          <div className="main">{absentStudents} Absent</div>
                          <div className="sub">
                            {totalStudents > 0 ? `${Math.round((absentStudents / totalStudents) * 100)}% absent today` : '0% absent'}
                          </div>
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
                    {totalStudents > 0
                      ? `${Math.round((presentStudents / totalStudents) * 100)}% attendance rate`
                      : 'No members enrolled yet'}
                  </div>

                  <div className="mini-bar-chart">
                    {[35, 48, 60, 45, 55, 70, totalStudents > 0 ? Math.max(15, Math.round((presentStudents / totalStudents) * 100)) : 10].map((h, idx) => (
                      <div
                        key={idx}
                        className={`mini-bar ${idx === 6 ? 'highlight-amber' : ''}`}
                        style={{ height: `${totalStudents === 0 ? 15 : h}%`, opacity: totalStudents === 0 ? 0.3 : 1 }}
                      />
                    ))}
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
                    {presentStudents > 0
                      ? `${Math.round((fullDayCount / presentStudents) * 100)}% on-time compliance`
                      : `Shift hours: ${companyInfo.check_in_time} - ${companyInfo.check_out_time}`}
                  </div>

                  <div className="mini-bar-chart">
                    {[25, 40, 50, 65, 45, 60, presentStudents > 0 ? Math.max(15, Math.round((fullDayCount / presentStudents) * 100)) : 10].map((h, idx) => (
                      <div
                        key={idx}
                        className={`mini-bar ${idx === 6 ? 'highlight-purple' : ''}`}
                        style={{ height: `${presentStudents === 0 ? 15 : h}%`, opacity: presentStudents === 0 ? 0.3 : 1 }}
                      />
                    ))}
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
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                    </button>
                  </div>

                  <div className="recent-activity-list">
                    {roster.filter(r => r.checkin).slice(0, 4).map((r, i) => (
                      <div key={r.name || i} className="activity-item">
                        <div className="activity-left">
                          <div className="user-thumb-circle">
                            {!avatarErrors[`act_${r.name}`] && r.has_snapshot && r.snapshot_url ? (
                              <img
                                src={resolveImageUrl(r.snapshot_url)}
                                alt={r.name}
                                onError={() => setAvatarErrors(prev => ({ ...prev, [`act_${r.name}`]: true }))}
                              />
                            ) : (
                              (r.name || 'U')[0].toUpperCase()
                            )}
                          </div>
                          <div>
                            <div className="activity-name">{r.name}</div>
                            <div className="activity-time">Checked in at {formatTimeIST(r.checkin)}</div>
                          </div>
                        </div>

                        <span className={`status-chip ${r.status === 'Present' ? 'present' : 'absent'}`}>
                          {r.status === 'Present' ? '✓ In' : '✕ Out'}
                        </span>
                      </div>
                    ))}

                    {roster.filter(r => r.checkin).length === 0 && (
                      <div style={{ textAlign: 'center', padding: '28px 10px', color: '#94A3B8', fontSize: '0.84rem' }}>
                        <p style={{ margin: '0 0 8px 0' }}>No check-ins recorded today yet.</p>
                        <button
                          type="button"
                          className="btn-outline"
                          style={{ padding: '5px 12px', fontSize: '0.78rem' }}
                          onClick={() => setActiveTab('mark-attendance')}
                        >
                          Open Camera Kiosk
                        </button>
                      </div>
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
                      <circle cx="11" cy="11" r="8" />
                      <line x1="21" y1="21" x2="16.65" y2="16.65" />
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
                  {totalStudents === 0 ? (
                    <div style={{ textAlign: 'center', padding: '48px 20px', background: '#FAFAFD', borderRadius: '12px', border: '1px dashed #E2E8F0', margin: '8px 0' }}>
                      <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#EEF2FF', color: '#6857DF', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                          <circle cx="8.5" cy="7" r="4" />
                          <line x1="20" y1="8" x2="20" y2="14" />
                          <line x1="23" y1="11" x2="17" y2="11" />
                        </svg>
                      </div>
                      <h4 style={{ fontSize: '0.96rem', fontWeight: 600, color: '#1E293B', marginBottom: '4px' }}>
                        No Members Enrolled Yet
                      </h4>
                      <p style={{ fontSize: '0.84rem', color: '#64748B', maxWidth: '380px', margin: '0 auto 16px' }}>
                        Enroll students or team members to start tracking attendance and generating biometric logs.
                      </p>
                      <button
                        type="button"
                        className="btn-solid-primary"
                        onClick={() => setShowAddUserModal(true)}
                        style={{ padding: '8px 18px', fontSize: '0.84rem' }}
                      >
                        Enroll New Student
                      </button>
                    </div>
                  ) : (
                    filteredRoster.slice(0, 10).map((r) => (
                      <div className="member-row-card" key={r.name}>
                        {/* Col 1: Profile (Avatar + Name) */}
                        <div className="member-col-profile">
                          <div
                            className="member-avatar-box"
                            style={{ cursor: r.has_snapshot ? 'pointer' : 'default' }}
                            onClick={() => r.has_snapshot && setModalImage(resolveImageUrl(r.snapshot_url))}
                            title={r.has_snapshot ? 'Click to view biometric snapshot' : r.name}
                          >
                            {!avatarErrors[r.name] && r.has_snapshot && r.snapshot_url ? (
                              <img
                                src={resolveImageUrl(r.snapshot_url)}
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
                            {companyInfo.required_hours || '8.0'}h ({formatShiftTime(companyInfo.check_in_time)} - {formatShiftTime(companyInfo.check_out_time)})
                          </div>
                        </div>

                        {/* Col 3: Timestamps */}
                        <div className="member-col-time">
                          <div className="time-title">
                            {r.checkin ? formatTimeIST(r.checkin) : <span className="time-empty">—</span>}
                          </div>
                          <div className="time-sub">
                            {r.checkout ? `Out: ${formatTimeIST(r.checkout)}` : r.checkin ? `Working: ${r.hours || '0'}h` : 'No Check-in'}
                          </div>
                        </div>

                        {/* Col 4: Status & Date */}
                        <div className="member-col-status">
                          <div className={`status-title-text ${r.status === 'Present' ? 'present' : 'absent'}`}>
                            {r.day_status || r.status || 'Absent'}
                          </div>
                          <div className="status-date-sub">
                            {r.date || new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </div>
                        </div>

                        {/* Col 5: Action Button */}
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
                    ))
                  )}

                  {totalStudents > 0 && filteredRoster.length === 0 && (
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
                        <td><strong>{r.checkin ? formatTimeIST(r.checkin) : '—'}</strong></td>
                        <td><strong>{r.checkout ? formatTimeIST(r.checkout) : '—'}</strong></td>
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
                              style={{ padding: '4px 10px', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                              onClick={() => setModalImage(resolveImageUrl(r.snapshot_url))}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                                <circle cx="12" cy="13" r="4" />
                              </svg>
                              View Photo
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
              <h3 className="card-title" style={{ fontSize: '1.25rem', marginBottom: '3px' }}>Biometric Face Attendance</h3>
              <p className="card-subtitle" style={{ maxWidth: '420px', margin: '0 auto 10px auto', fontSize: '0.82rem' }}>
                Look directly into the camera with clear lighting for instant biometric verification.
              </p>

              <div className="video-view-wrap">
                <video ref={videoRef} width="640" height="480" autoPlay playsInline muted />
                <div className="face-target-guide"></div>
              </div>
              <canvas ref={canvasRef} style={{ display: 'none' }} />

              <button
                className="btn-solid-primary"
                onClick={handleCaptureAttendance}
                disabled={isProcessing || !streamActive}
                style={{
                  margin: '10px auto 4px auto',
                  padding: '10px 28px',
                  fontSize: '0.94rem',
                  borderRadius: '12px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
                {isProcessing ? 'Verifying Biometrics...' : 'Capture Image & Mark Attendance'}
              </button>

              <p style={{ marginTop: '8px', fontSize: '0.82rem', color: '#64748B' }}>{webcamStatus}</p>
              {recognizedName && (
                <div style={{ marginTop: '4px', color: '#10B981', fontWeight: '700', fontSize: '0.95rem' }}>
                  {recognizedName}
                </div>
              )}
              {webcamError && (
                <div style={{ marginTop: '4px', color: '#EF4444', fontSize: '0.82rem' }}>
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
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
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
                            <div className="avatar" style={{ overflow: 'hidden', padding: 0 }}>
                              {!avatarErrors[`rec_${s.name}`] && s.avatar_url ? (
                                <img
                                  src={resolveImageUrl(s.avatar_url)}
                                  alt={s.name}
                                  onError={() => setAvatarErrors(prev => ({ ...prev, [`rec_${s.name}`]: true }))}
                                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                              ) : (
                                s.name[0]
                              )}
                            </div>
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

          {/* ==========================================================================
              TAB 5: PAYROLL & COMPENSATION INTEGRATION
              ========================================================================== */}
          {activeTab === 'payroll' && (
            <div className="payroll-container">
              {/* Payroll Sub-Navigation Tabs */}
              <div className="payroll-subnav">
                <button
                  type="button"
                  className={`payroll-subnav-btn ${payrollSubTab === 'run' ? 'active' : ''}`}
                  onClick={() => setPayrollSubTab('run')}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="4" y="2" width="16" height="20" rx="2" />
                    <line x1="8" y1="6" x2="16" y2="6" />
                    <line x1="16" y1="14" x2="16" y2="18" />
                    <path d="M16 10h.01M12 10h.01M8 10h.01M12 14h.01M8 14h.01M12 18h.01M8 18h.01" />
                  </svg>
                  Monthly Run & Calculation
                </button>

                <button
                  type="button"
                  className={`payroll-subnav-btn ${payrollSubTab === 'salaries' ? 'active' : ''}`}
                  onClick={() => setPayrollSubTab('salaries')}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                  </svg>
                  Base Salary Setup
                </button>

                <button
                  type="button"
                  className={`payroll-subnav-btn ${payrollSubTab === 'history' ? 'active' : ''}`}
                  onClick={() => setPayrollSubTab('history')}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  Finalized History
                </button>
              </div>

              {/* Alert Notification */}
              {payrollAlert.text && (
                <div
                  style={{
                    padding: '12px 18px',
                    borderRadius: '12px',
                    fontSize: '0.86rem',
                    fontWeight: 500,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: payrollAlert.type === 'error' ? '#FEF2F2' : '#F0FDF4',
                    border: `1px solid ${payrollAlert.type === 'error' ? '#FECACA' : '#BBF7D0'}`,
                    color: payrollAlert.type === 'error' ? '#B91C1C' : '#15803D'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {payrollAlert.type === 'error' ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
                      </svg>
                    )}
                    <span>{payrollAlert.text}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPayrollAlert({ text: '', type: '' })}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 0 }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              )}

              {/* -------------------------------------------------------------
                  SUBTAB 1: MONTHLY RUN & BIOMETRIC CALCULATION
                  ------------------------------------------------------------- */}
              {payrollSubTab === 'run' && (
                <>
                  {/* Controls & Period Selector Bar */}
                  <div className="payroll-filter-bar">
                    <div className="payroll-controls-left">
                      <div className="payroll-control-group">
                        <label className="payroll-control-label">Month:</label>
                        <select
                          className="payroll-select"
                          value={payrollMonth}
                          onChange={(e) => setPayrollMonth(parseInt(e.target.value, 10))}
                        >
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => (
                            <option key={m} value={m}>{getMonthName(m)}</option>
                          ))}
                        </select>
                      </div>

                      <div className="payroll-control-group">
                        <label className="payroll-control-label">Year:</label>
                        <select
                          className="payroll-select"
                          value={payrollYear}
                          onChange={(e) => setPayrollYear(parseInt(e.target.value, 10))}
                        >
                          {[2024, 2025, 2026, 2027].map(y => (
                            <option key={y} value={y}>{y}</option>
                          ))}
                        </select>
                      </div>

                      <div className="payroll-control-group">
                        <label className="payroll-control-label">Working Days:</label>
                        <input
                          type="number"
                          className="payroll-input"
                          style={{ width: '70px' }}
                          min="1"
                          max="31"
                          value={payrollWorkingDays}
                          onChange={(e) => setPayrollWorkingDays(Math.max(1, parseInt(e.target.value, 10) || 26))}
                        />
                      </div>
                    </div>

                    <div className="payroll-controls-right">
                      <button
                        type="button"
                        className="btn-outline"
                        onClick={() => loadPayrollData(payrollMonth, payrollYear, payrollWorkingDays)}
                        disabled={payrollLoading}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="23 4 23 10 17 10" />
                          <polyline points="1 20 1 14 7 14" />
                          <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                        </svg>
                        {payrollLoading ? 'Calculating...' : 'Recalculate'}
                      </button>

                      <button
                        type="button"
                        className="btn-solid-primary"
                        onClick={handleFinalizePayroll}
                        disabled={payrollFinalizing || !payrollItems.length || payrollSummary?.is_locked}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                      >
                        {payrollSummary?.is_locked ? (
                          <>
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                            </svg>
                            Locked & Approved
                          </>
                        ) : (
                          <>
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                            {payrollFinalizing ? 'Finalizing...' : 'Approve & Finalize Month'}
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Top KPI Summary Cards */}
                  <div className="payroll-kpi-grid">
                    <div className="payroll-kpi-card">
                      <div className="payroll-kpi-icon purple">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="2" y="6" width="20" height="15" rx="3" />
                          <path d="M6 6V4.5A2.5 2.5 0 0 1 8.5 2h7A2.5 2.5 0 0 1 18 4.5V6" />
                          <circle cx="16" cy="14" r="1.5" />
                        </svg>
                      </div>
                      <div className="payroll-kpi-info">
                        <span className="payroll-kpi-label">Total Net Payout</span>
                        <span className="payroll-kpi-val">
                          {formatCurrency(payrollSummary?.total_payout || 0)}
                        </span>
                      </div>
                    </div>

                    <div className="payroll-kpi-card">
                      <div className="payroll-kpi-icon blue">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                          <circle cx="9" cy="7" r="4" />
                          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                        </svg>
                      </div>
                      <div className="payroll-kpi-info">
                        <span className="payroll-kpi-label">Salaried Members</span>
                        <span className="payroll-kpi-val">
                          {payrollSummary?.total_employees || payrollItems.length} Staff
                        </span>
                      </div>
                    </div>

                    <div className="payroll-kpi-card">
                      <div className="payroll-kpi-icon green">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                          <polyline points="22 4 12 14.01 9 11.01" />
                        </svg>
                      </div>
                      <div className="payroll-kpi-info">
                        <span className="payroll-kpi-label">Avg Attendance Rate</span>
                        <span className="payroll-kpi-val">
                          {payrollSummary?.avg_attendance_rate || 0}%
                        </span>
                      </div>
                    </div>

                    <div className="payroll-kpi-card">
                      <div className="payroll-kpi-icon amber">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                      </div>
                      <div className="payroll-kpi-info">
                        <span className="payroll-kpi-label">Run Status</span>
                        <div>
                          {payrollSummary?.is_locked ? (
                            <span className="payroll-status-badge approved">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                              Approved & Locked
                            </span>
                          ) : (
                            <span className="payroll-status-badge calculated">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                              </svg>
                              Draft (Calculated)
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Main Payroll Roster Breakdown Table */}
                  <div className="modern-card">
                    <div className="card-header-flex">
                      <div>
                        <h3 className="card-title">
                          Attendance-Linked Payroll Roster ({filteredPayrollItems.length})
                        </h3>
                        <p className="card-subtitle">
                          100% automated calculation derived from facial biometric punches for {getMonthName(payrollMonth)} {payrollYear}
                        </p>
                      </div>

                      <div className="member-search-wrap">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="11" cy="11" r="8" />
                          <line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                        <input
                          type="text"
                          className="member-search-input"
                          placeholder="Search employee..."
                          value={payrollSearch}
                          onChange={(e) => setPayrollSearch(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="table-responsive">
                      <table className="roster-table payroll-table">
                        <thead>
                          <tr>
                            <th>Employee Name</th>
                            <th>Base Monthly</th>
                            <th>Working Days</th>
                            <th>Present</th>
                            <th>Half Days</th>
                            <th>Absent (LOP)</th>
                            <th>LOP Deduction</th>
                            <th>Net Payable</th>
                            <th>Status</th>
                            <th style={{ textAlign: 'right' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredPayrollItems.map((item) => (
                            <tr key={item.user_name}>
                              <td>
                                <div className="member-cell">
                                  <div className="avatar">{item.user_name[0]}</div>
                                  <div>
                                    <div className="name">{item.user_name}</div>
                                    <div className="sub">{user?.company_name || 'Staff Member'}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="payroll-num">
                                {formatCurrency(item.base_salary)}
                              </td>
                              <td className="payroll-num">
                                {item.working_days} d
                              </td>
                              <td className="payroll-num">
                                <span style={{ color: '#15803D' }}>{item.present_days} d</span>
                              </td>
                              <td className="payroll-num">
                                <span style={{ color: item.half_days > 0 ? '#D97706' : '#64748B' }}>
                                  {item.half_days}
                                </span>
                              </td>
                              <td className="payroll-num">
                                <span style={{ color: item.absent_days > 0 ? '#EF4444' : '#64748B' }}>
                                  {item.absent_days} d
                                </span>
                              </td>
                              <td className="payroll-num lop">
                                {item.lop_deduction > 0 ? `-${formatCurrency(item.lop_deduction)}` : '₹0.00'}
                              </td>
                              <td className="payroll-num net">
                                {formatCurrency(item.net_pay)}
                              </td>
                              <td>
                                {item.status === 'Approved' ? (
                                  <span className="payroll-status-badge approved">Approved</span>
                                ) : (
                                  <span className="payroll-status-badge calculated">Calculated</span>
                                )}
                              </td>
                              <td style={{ textAlign: 'right' }}>
                                <div style={{ display: 'inline-flex', gap: '8px', justifyContent: 'flex-end' }}>
                                  <button
                                    type="button"
                                    className="payroll-btn-action payslip"
                                    onClick={() => handleOpenPayslip(item)}
                                    title="View Branded Payslip"
                                  >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                      <polyline points="14 2 14 8 20 8" />
                                      <line x1="16" y1="13" x2="8" y2="13" />
                                      <line x1="16" y1="17" x2="8" y2="17" />
                                    </svg>
                                    View Payslip
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}

                          {filteredPayrollItems.length === 0 && (
                            <tr>
                              <td colSpan="10" style={{ textAlign: 'center', padding: '40px 0', color: '#94A3B8' }}>
                                {payrollLoading ? (
                                  'Calculating payroll from biometric logs...'
                                ) : (
                                  'No employees or attendance records found for this period. Click "Recalculate" or ensure students are enrolled.'
                                )}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}

              {/* -------------------------------------------------------------
                  SUBTAB 2: BASE SALARY SETUP PER EMPLOYEE
                  ------------------------------------------------------------- */}
              {payrollSubTab === 'salaries' && (
                <div className="modern-card">
                  <div className="card-header-flex">
                    <div>
                      <h3 className="card-title">Employee Base Salary Configurations</h3>
                      <p className="card-subtitle">
                        Configure base monthly compensation & stipends used in 1-click biometric payroll calculations
                      </p>
                    </div>

                    <div className="member-search-wrap">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                      </svg>
                      <input
                        type="text"
                        className="member-search-input"
                        placeholder="Search employee..."
                        value={payrollSearch}
                        onChange={(e) => setPayrollSearch(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="table-responsive">
                    <table className="roster-table payroll-table">
                      <thead>
                        <tr>
                          <th>Employee Name</th>
                          <th>Base Monthly Salary</th>
                          <th>Standard Daily Rate (26d)</th>
                          <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredPayrollMembers.map((m) => (
                          <tr key={m.name}>
                            <td>
                              <div className="member-cell">
                                <div className="avatar">{m.name[0]}</div>
                                <div>
                                  <div className="name">{m.name}</div>
                                  <div className="sub">{user?.company_name || 'Enrolled Staff'}</div>
                                </div>
                              </div>
                            </td>
                            <td className="payroll-num">
                              {formatCurrency(m.base_salary)}
                            </td>
                            <td className="payroll-num" style={{ color: '#64748B' }}>
                              {formatCurrency(m.base_salary / 26)} / day
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <button
                                type="button"
                                className="payroll-btn-action edit-salary"
                                onClick={() => setSalaryEditModal({ open: true, userName: m.name, baseSalary: m.base_salary, saving: false })}
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                </svg>
                                Edit Salary
                              </button>
                            </td>
                          </tr>
                        ))}

                        {filteredPayrollMembers.length === 0 && (
                          <tr>
                            <td colSpan="4" style={{ textAlign: 'center', padding: '36px 0', color: '#94A3B8' }}>
                              No enrolled members found. Enroll members in the Records tab to configure salaries.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* -------------------------------------------------------------
                  SUBTAB 3: FINALIZED HISTORICAL RUNS
                  ------------------------------------------------------------- */}
              {payrollSubTab === 'history' && (
                <div className="modern-card">
                  <div className="card-header-flex">
                    <div>
                      <h3 className="card-title">Past Finalized Payroll Runs</h3>
                      <p className="card-subtitle">
                        Historical locked records of approved disbursements and verified payslips
                      </p>
                    </div>

                    <button
                      type="button"
                      className="btn-outline"
                      onClick={loadPayrollHistory}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="23 4 23 10 17 10" />
                        <polyline points="1 20 1 14 7 14" />
                        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                      </svg>
                      Refresh History
                    </button>
                  </div>

                  <div className="table-responsive">
                    <table className="roster-table payroll-table">
                      <thead>
                        <tr>
                          <th>Pay Period</th>
                          <th>Total Staff</th>
                          <th>Gross Payout</th>
                          <th>LOP Deductions</th>
                          <th>Net Disbursed</th>
                          <th>Processed Date</th>
                          <th>Status</th>
                          <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {payrollHistory.map((h) => (
                          <tr key={h.id}>
                            <td style={{ fontWeight: 600, color: '#1E293B' }}>
                              {getMonthName(h.month)} {h.year}
                            </td>
                            <td className="payroll-num">
                              {h.total_employees} Employees
                            </td>
                            <td className="payroll-num">
                              {formatCurrency(h.total_gross)}
                            </td>
                            <td className="payroll-num lop">
                              -{formatCurrency(h.total_deductions)}
                            </td>
                            <td className="payroll-num net">
                              {formatCurrency(h.total_net)}
                            </td>
                            <td style={{ fontSize: '0.8rem', color: '#64748B' }}>
                              {h.processed_at ? new Date(h.processed_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Approved'}
                            </td>
                            <td>
                              <span className="payroll-status-badge approved">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                                {h.status}
                              </span>
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <button
                                type="button"
                                className="payroll-btn-action payslip"
                                onClick={() => {
                                  setPayrollMonth(h.month);
                                  setPayrollYear(h.year);
                                  setPayrollSubTab('run');
                                  loadPayrollData(h.month, h.year, payrollWorkingDays);
                                }}
                              >
                                Review Run
                              </button>
                            </td>
                          </tr>
                        ))}

                        {payrollHistory.length === 0 && (
                          <tr>
                            <td colSpan="8" style={{ textAlign: 'center', padding: '36px 0', color: '#94A3B8' }}>
                              No finalized payroll runs recorded yet. Finalize this month's payroll to create historical archives.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
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

              <div style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', background: '#000', marginBottom: '14px' }}>
                <video ref={enrollVideoRef} width="100%" height="240" autoPlay playsInline muted style={{ display: 'block' }} />
                <div className="face-target-guide" style={{ width: '130px', height: '130px' }} />
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

              {/* Dedicated Kiosk Portal Configuration */}
              <div style={{ padding: '14px', background: '#F8FAFC', borderRadius: '10px', border: '1.2px solid #E2E8F0', marginBottom: '18px' }}>
                <div style={{ fontSize: '0.86rem', fontWeight: '700', color: '#1E293B', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '24px', height: '24px', borderRadius: '6px', background: '#EEF2FF', color: '#6857DF', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                      <line x1="8" y1="21" x2="16" y2="21" />
                      <line x1="12" y1="17" x2="12" y2="21" />
                    </svg>
                  </div>
                  Reception / Kiosk Portal Configuration
                </div>
                <p style={{ fontSize: '0.78rem', color: '#64748B', margin: '0 0 12px 0' }}>
                  Custom URL slug and 6-digit access code for front-desk attendance tablets or employee kiosks.
                </p>

                <div className="modal-form-grid-2">
                  <div>
                    <label style={{ display: 'block', fontSize: '0.80rem', fontWeight: '600', marginBottom: '4px', color: '#64748B' }}>
                      Kiosk URL Slug:
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '8px', padding: '0 10px', height: '38px' }}>
                      <span style={{ fontSize: '0.78rem', color: '#94A3B8', fontWeight: 500, marginRight: '4px' }}>/kiosk/</span>
                      <input
                        type="text"
                        value={kioskInfo.slug}
                        onChange={(e) => setKioskInfo({ ...kioskInfo, slug: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '') })}
                        style={{ width: '100%', border: 'none', outline: 'none', fontSize: '0.84rem', fontWeight: '600', color: '#1E293B', padding: 0 }}
                        placeholder="your-org"
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.80rem', fontWeight: '600', marginBottom: '4px', color: '#64748B' }}>
                      Kiosk PIN (6 Digits):
                    </label>
                    <div style={{ display: 'flex', gap: '6px', height: '38px' }}>
                      <input
                        type="text"
                        maxLength="6"
                        value={kioskInfo.kiosk_pin}
                        onChange={(e) => setKioskInfo({ ...kioskInfo, kiosk_pin: e.target.value.replace(/\D/g, '') })}
                        style={{ flex: 1, padding: '6px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', outline: 'none', letterSpacing: '3px', fontWeight: '700', fontSize: '0.92rem' }}
                        placeholder="123456"
                      />
                      <button
                        type="button"
                        onClick={handleRegeneratePin}
                        disabled={regeneratingPin}
                        className="btn-outline"
                        style={{ padding: '0 10px', fontSize: '0.74rem', whiteSpace: 'nowrap', height: '100%' }}
                        title="Generate random PIN"
                      >
                        {regeneratingPin ? '...' : 'Regen'}
                      </button>
                    </div>
                  </div>
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

      {/* ==========================================================================
          MODAL 4: ATTENDIFY BRANDED PRINTABLE PAYSLIP MODAL
          ========================================================================== */}
      {showPayslipModal && selectedPayslip && (
        <div className="payslip-modal-overlay" onClick={() => setShowPayslipModal(false)}>
          <div className="payslip-modal-card" onClick={(e) => e.stopPropagation()}>
            {/* Top Toolbar (Hidden on Print) */}
            <div className="payslip-modal-actions-top">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6857DF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  <path d="m9 12 2 2 4-4" />
                </svg>
                <span>Attendify Verified Payslip</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  type="button"
                  className="btn-solid-primary"
                  style={{ padding: '7px 14px', fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  onClick={() => window.print()}
                  title="Print or Save as PDF"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 6 2 18 2 18 9" />
                    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                    <rect x="6" y="14" width="12" height="8" />
                  </svg>
                  Print / Save PDF
                </button>

                <button
                  type="button"
                  className="icon-btn"
                  style={{ width: '32px', height: '32px' }}
                  onClick={() => setShowPayslipModal(false)}
                  title="Close preview"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Printable Payslip Sheet */}
            <div className="payslip-sheet">
              {/* Header */}
              <div className="payslip-sheet-header">
                <div className="payslip-brand-col">
                  <div className="payslip-brand-mark">
                    A
                  </div>
                  <div>
                    <div className="payslip-brand-title">
                      {selectedPayslip.company_name || 'Attendify Technologies'}
                    </div>
                    <div className="payslip-brand-sub">
                      Automated Biometric Attendance & Payroll Reconciliation
                    </div>
                  </div>
                </div>

                <div className="payslip-sheet-title-col">
                  <div className="payslip-badge-title">Salary Payslip</div>
                  <div className="payslip-period-text">
                    {getMonthName(selectedPayslip.month).toUpperCase()} {selectedPayslip.year}
                  </div>
                </div>
              </div>

              {/* Details Grid */}
              <div className="payslip-details-grid">
                <div className="payslip-detail-item">
                  <span className="payslip-detail-label">Employee Name</span>
                  <span className="payslip-detail-value">{selectedPayslip.user_name}</span>
                </div>

                <div className="payslip-detail-item">
                  <span className="payslip-detail-label">Organization</span>
                  <span className="payslip-detail-value">{selectedPayslip.company_name || 'Attendify Tenant'}</span>
                </div>

                <div className="payslip-detail-item">
                  <span className="payslip-detail-label">Pay Period</span>
                  <span className="payslip-detail-value">
                    01 {getMonthName(selectedPayslip.month).substring(0, 3)} - {selectedPayslip.working_days} {getMonthName(selectedPayslip.month).substring(0, 3)} {selectedPayslip.year}
                  </span>
                </div>

                <div className="payslip-detail-item">
                  <span className="payslip-detail-label">Issue Date</span>
                  <span className="payslip-detail-value">{selectedPayslip.date_generated}</span>
                </div>
              </div>

              {/* Attendance Strip */}
              <div className="payslip-attendance-strip">
                <div className="payslip-att-col">
                  <div className="payslip-att-col-lbl">Total Working Days</div>
                  <div className="payslip-att-col-val">{selectedPayslip.working_days}</div>
                </div>
                <div className="payslip-att-col">
                  <div className="payslip-att-col-lbl">Days Present</div>
                  <div className="payslip-att-col-val" style={{ color: '#15803D' }}>
                    {selectedPayslip.present_days}
                  </div>
                </div>
                <div className="payslip-att-col">
                  <div className="payslip-att-col-lbl">Half Days</div>
                  <div className="payslip-att-col-val" style={{ color: '#D97706' }}>
                    {selectedPayslip.half_days}
                  </div>
                </div>
                <div className="payslip-att-col">
                  <div className="payslip-att-col-lbl">Absent (LOP) Days</div>
                  <div className="payslip-att-col-val" style={{ color: '#EF4444' }}>
                    {selectedPayslip.absent_days}
                  </div>
                </div>
              </div>

              {/* Breakdown Grid: Earnings vs Deductions */}
              <div className="payslip-breakdown-grid">
                {/* Left: Earnings */}
                <div className="payslip-col-box">
                  <div className="payslip-col-head">Earnings Breakdown</div>
                  <div className="payslip-col-row">
                    <span className="payslip-col-row-label">Base Monthly Salary</span>
                    <span className="payslip-col-row-val">{formatCurrency(selectedPayslip.base_salary)}</span>
                  </div>
                  <div className="payslip-col-row">
                    <span className="payslip-col-row-label">HRA & Allowances</span>
                    <span className="payslip-col-row-val">₹0.00</span>
                  </div>
                  <div className="payslip-col-row">
                    <span className="payslip-col-row-label">Performance Bonus</span>
                    <span className="payslip-col-row-val">₹0.00</span>
                  </div>
                  <div className="payslip-col-row total-row">
                    <span>Total Gross Earnings</span>
                    <span>{formatCurrency(selectedPayslip.base_salary)}</span>
                  </div>
                </div>

                {/* Right: Deductions */}
                <div className="payslip-col-box">
                  <div className="payslip-col-head">Deductions Breakdown</div>
                  <div className="payslip-col-row">
                    <span className="payslip-col-row-label">Loss of Pay (Absenteeism)</span>
                    <span className="payslip-col-row-val" style={{ color: '#EF4444' }}>
                      {selectedPayslip.lop_deduction > 0 ? `-${formatCurrency(selectedPayslip.lop_deduction)}` : '₹0.00'}
                    </span>
                  </div>
                  <div className="payslip-col-row">
                    <span className="payslip-col-row-label">Professional Tax</span>
                    <span className="payslip-col-row-val">₹0.00</span>
                  </div>
                  <div className="payslip-col-row">
                    <span className="payslip-col-row-label">Statutory Provident Fund</span>
                    <span className="payslip-col-row-val">₹0.00</span>
                  </div>
                  <div className="payslip-col-row total-row">
                    <span>Total Deductions</span>
                    <span style={{ color: '#EF4444' }}>
                      -{formatCurrency(selectedPayslip.lop_deduction)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Net Payable Highlight Card */}
              <div className="payslip-net-box">
                <div>
                  <div className="payslip-net-label">Net Disbursed Pay</div>
                  <div className="payslip-net-note">
                    Verified through facial biometric attendance audit logs
                  </div>
                </div>
                <div className="payslip-net-amount">
                  {formatCurrency(selectedPayslip.net_pay)}
                </div>
              </div>

              {/* Signatures & Verification */}
              <div className="payslip-footer-signatures">
                <div className="payslip-sig-box">
                  <div className="payslip-sig-line"></div>
                  <div className="payslip-sig-label">Employee Signature</div>
                </div>

                <div className="payslip-sig-box">
                  <div className="payslip-sig-line"></div>
                  <div className="payslip-sig-label">Authorized Signatory</div>
                </div>
              </div>

              <div className="payslip-computer-gen">
                This is a digitally generated document approved via Attendify Biometric Cloud. No physical signature is required.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================================================
          MODAL 5: BASE SALARY CONFIGURATION MODAL
          ========================================================================== */}
      {salaryEditModal.open && (
        <div
          className="modern-modal-overlay"
          onClick={() => !salaryEditModal.saving && setSalaryEditModal({ open: false, userName: '', baseSalary: 25000, saving: false })}
        >
          <div className="modern-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="card-header-flex">
              <div>
                <h3 className="card-title">Configure Base Salary</h3>
                <p className="card-subtitle">
                  Set base monthly compensation for <strong>{salaryEditModal.userName}</strong>
                </p>
              </div>
              <button
                type="button"
                className="icon-btn"
                style={{ width: '32px', height: '32px' }}
                onClick={() => setSalaryEditModal({ open: false, userName: '', baseSalary: 25000, saving: false })}
                disabled={salaryEditModal.saving}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSaveSalary} style={{ marginTop: '16px' }}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                  Base Monthly Salary (₹):
                </label>
                <input
                  type="number"
                  min="0"
                  step="500"
                  className="modern-input"
                  value={salaryEditModal.baseSalary}
                  onChange={(e) => setSalaryEditModal({ ...salaryEditModal, baseSalary: Math.max(0, parseFloat(e.target.value) || 0) })}
                  required
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '1rem', fontWeight: 600 }}
                />
                <div style={{ marginTop: '6px', fontSize: '0.78rem', color: '#64748B' }}>
                  Daily rate equivalent: ~{formatCurrency(salaryEditModal.baseSalary / 26)} / day (standard 26 working days)
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
                <button
                  type="button"
                  className="btn-outline"
                  onClick={() => setSalaryEditModal({ open: false, userName: '', baseSalary: 25000, saving: false })}
                  disabled={salaryEditModal.saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-solid-primary"
                  disabled={salaryEditModal.saving}
                >
                  {salaryEditModal.saving ? 'Updating...' : 'Save Base Salary'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================================================
          MODAL: ATTENDANCE SUCCESS ANIMATED VERIFICATION POPUP
          ========================================================================== */}
      {attendanceSuccessModal && (
        <div className="attendance-popup-overlay" onClick={() => setAttendanceSuccessModal(null)}>
          <div className="attendance-popup-card" onClick={(e) => e.stopPropagation()}>
            <div className="attendance-tick-circle">
              <svg className="attendance-tick-svg" viewBox="0 0 52 52">
                <circle cx="26" cy="26" r="25" />
                <path d="M14 27l7 7 17-17" />
              </svg>
            </div>

            <div className={`attendance-popup-badge ${attendanceSuccessModal.type}`}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              {attendanceSuccessModal.type === 'checkout'
                ? 'Check-Out Verified'
                : attendanceSuccessModal.type === 'info'
                ? 'Attendance Status'
                : 'Check-In Verified'}
            </div>

            <h3 className="attendance-popup-name">{attendanceSuccessModal.name}</h3>

            {attendanceSuccessModal.time && (
              <div className="attendance-popup-time">
                Recorded at {formatTimeIST(attendanceSuccessModal.time)}
              </div>
            )}

            {attendanceSuccessModal.statusBadge && (
              <div style={{ marginBottom: '10px' }}>
                <span className="badge-status present" style={{ fontSize: '0.78rem', padding: '3px 10px' }}>
                  {attendanceSuccessModal.statusBadge}
                </span>
              </div>
            )}

            <p className="attendance-popup-msg">
              {attendanceSuccessModal.message}
            </p>

            <button
              type="button"
              className="btn-solid-primary"
              onClick={() => setAttendanceSuccessModal(null)}
              style={{ width: '100%', padding: '10px 20px', borderRadius: '12px', fontSize: '0.92rem' }}
            >
              Continue
            </button>

            <div className="attendance-popup-progress" />
          </div>
        </div>
      )}
    </div>
  );
}
