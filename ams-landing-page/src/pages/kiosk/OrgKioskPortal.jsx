import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../services/api';
import { formatTimeIST, getLiveTimeIST } from '../../utils/timeUtils';
import './OrgKioskPortal.css';

export default function OrgKioskPortal() {
  const { orgSlug } = useParams();
  const slug = (orgSlug || '').trim().toLowerCase();

  // Organization & Auth state
  const [orgData, setOrgData] = useState(null);
  const [loadingOrg, setLoadingOrg] = useState(true);
  const [orgError, setOrgError] = useState('');

  const storageKey = `ams_kiosk_token_${slug}`;
  const [kioskToken, setKioskToken] = useState(() => localStorage.getItem(storageKey) || '');
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [pinSubmitting, setPinSubmitting] = useState(false);

  // Active view tab in unlocked kiosk: 'scan' (Check-in/out) or 'enroll' (Self-enrollment)
  const [activeTab, setActiveTab] = useState('scan');
  const [liveTime, setLiveTime] = useState(getLiveTimeIST());

  // Webcams
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [streamActive, setStreamActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [scanMessage, setScanMessage] = useState('');
  const [scanError, setScanError] = useState('');
  const [successModal, setSuccessModal] = useState(null);

  // Enrollment state
  const [enrollName, setEnrollName] = useState('');
  const [enrollCapturing, setEnrollCapturing] = useState(false);
  const [enrollProgress, setEnrollProgress] = useState(0);
  const [enrollStatus, setEnrollStatus] = useState({ text: '', type: '' });

  // 1. Live 12-Hour IST Clock (updates every second)
  useEffect(() => {
    const timer = setInterval(() => {
      setLiveTime(getLiveTimeIST());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 2. Fetch Public Organization Info
  useEffect(() => {
    if (!slug) {
      setOrgError('No organization identifier provided.');
      setLoadingOrg(false);
      return;
    }

    const fetchOrg = async () => {
      setLoadingOrg(true);
      setOrgError('');
      try {
        const res = await api.request(`/kiosk/org/${slug}`);
        setOrgData(res);
      } catch (err) {
        setOrgError(err.message || 'Organization not found. Please verify the URL.');
      } finally {
        setLoadingOrg(false);
      }
    };

    fetchOrg();
  }, [slug]);

  // 3. Setup Webcam for Active Tab
  useEffect(() => {
    if (!kioskToken) return;

    let stream = null;
    navigator.mediaDevices.getUserMedia({
      video: { width: 640, height: 480, facingMode: 'user' }
    })
      .then((s) => {
        stream = s;
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          setStreamActive(true);
        }
      })
      .catch((err) => {
        console.error('Kiosk camera access error:', err);
        setScanError('Unable to access camera. Please allow webcam permission.');
      });

    return () => {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
      setStreamActive(false);
    };
  }, [kioskToken, activeTab]);

  // 4. Auto-dismiss Success Modal after 3.8s
  useEffect(() => {
    if (successModal) {
      const t = setTimeout(() => {
        setSuccessModal(null);
      }, 3800);
      return () => clearTimeout(t);
    }
  }, [successModal]);

  // 5. Handle PIN Submission
  const handleVerifyPin = async (e) => {
    e.preventDefault();
    setPinError('');
    if (!pinInput.trim()) {
      setPinError('Please enter the 6-digit Kiosk PIN.');
      return;
    }

    setPinSubmitting(true);
    try {
      const res = await api.request('/kiosk/verify-pin', {
        method: 'POST',
        body: { slug: slug, pin: pinInput.trim() }
      });

      if (res.token) {
        localStorage.setItem(storageKey, res.token);
        setKioskToken(res.token);
        setPinInput('');
      } else {
        throw new Error('Verification failed. Invalid token received.');
      }
    } catch (err) {
      setPinError(err.message || 'Incorrect Kiosk PIN. Please contact your organization administrator.');
    } finally {
      setPinSubmitting(false);
    }
  };

  // Lock Kiosk (Log out from kiosk session)
  const handleLockKiosk = () => {
    if (window.confirm('Lock this kiosk device? The access PIN will be required to unlock.')) {
      localStorage.removeItem(storageKey);
      setKioskToken('');
    }
  };

  // 6. Capture Attendance Scan
  const handleCaptureAttendance = async () => {
    if (!videoRef.current || !canvasRef.current || !streamActive) return;

    setIsProcessing(true);
    setScanError('');
    setScanMessage('Analyzing facial biometrics...');

    try {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;

      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = canvas.toDataURL('image/jpeg', 0.88);

      const result = await api.request('/kiosk/scan', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${kioskToken}`
        },
        body: { image: imageData }
      });

      setScanMessage(result.message || 'Scan completed');

      if (result.name && result.name !== 'Unknown') {
        const isCheckout = result.status === 'checkout_success';
        const isBlocked = result.status === 'checkout_blocked';
        const isCompleted = result.status === 'already_completed';
        const timeVal = formatTimeIST(result.checkout_time || result.checkin_time || liveTime);

        setSuccessModal({
          name: result.name,
          type: isCheckout ? 'checkout' : isBlocked || isCompleted ? 'info' : 'checkin',
          time: timeVal,
          statusBadge: isBlocked ? 'Scan Cooldown' : isCompleted ? 'Attendance Completed' : isCheckout ? 'Check-Out Recorded' : (result.day_status || 'Check-In Recorded'),
          message: result.message || 'Attendance verified successfully!'
        });
      } else {
        setScanError(result.message || 'Face not recognized. If you are new, please register first using the "New Member Register" tab above.');
      }
    } catch (err) {
      setScanError(err.message || 'Verification error. Please retry.');
      setScanMessage('');
    } finally {
      setIsProcessing(false);
    }
  };

  // 7. Handle 20-frame Biometric Self-Enrollment
  const handleSelfEnroll = async (e) => {
    e.preventDefault();
    if (!enrollName.trim()) {
      setEnrollStatus({ text: 'Please enter your full name.', type: 'error' });
      return;
    }
    if (!videoRef.current || !canvasRef.current || !streamActive) {
      setEnrollStatus({ text: 'Webcam not active. Please allow camera permissions.', type: 'error' });
      return;
    }

    setEnrollCapturing(true);
    setEnrollProgress(0);
    setEnrollStatus({ text: 'Align face. Capturing 20 facial vector frames...', type: 'info' });

    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');

    const frames = [];
    const totalFrames = 20;

    for (let i = 0; i < totalFrames; i++) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      frames.push(canvas.toDataURL('image/jpeg', 0.85));
      setEnrollProgress(Math.round(((i + 1) / totalFrames) * 100));
      await new Promise(r => setTimeout(r, 140)); // 140ms burst interval
    }

    setEnrollStatus({ text: 'Extracting 128-d biometrics & registering profile...', type: 'info' });

    try {
      const res = await api.request('/students/enroll', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${kioskToken}`
        },
        body: {
          name: enrollName.trim(),
          images: frames
        }
      });

      setEnrollStatus({
        text: `Student "${enrollName.trim()}" enrolled successfully! You can now mark attendance.`,
        type: 'success'
      });
      setEnrollName('');
      setEnrollProgress(0);

      // Auto-switch to Scan tab after 2.5 seconds
      setTimeout(() => {
        setActiveTab('scan');
        setEnrollStatus({ text: '', type: '' });
      }, 2500);
    } catch (err) {
      setEnrollStatus({ text: err.message || 'Failed to complete biometric enrollment.', type: 'error' });
    } finally {
      setEnrollCapturing(false);
    }
  };

  // If Organization Not Found or Error
  if (loadingOrg) {
    return (
      <div className="kiosk-portal-page">
        <div className="kiosk-portal-hero">
          <div className="kiosk-portal-card" style={{ textAlign: 'center', color: '#64748B', padding: '40px 20px' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1.2s linear infinite', margin: '0 auto 12px auto', display: 'block', color: '#6857DF' }}>
              <line x1="12" y1="2" x2="12" y2="6"></line>
              <line x1="12" y1="18" x2="12" y2="22"></line>
              <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
              <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
              <line x1="2" y1="12" x2="6" y2="12"></line>
              <line x1="18" y1="12" x2="22" y2="12"></line>
              <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
              <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
            </svg>
            <p style={{ margin: 0, fontSize: '0.94rem', fontWeight: 500 }}>Connecting to Organization Attendance Kiosk...</p>
          </div>
        </div>
      </div>
    );
  }

  if (orgError) {
    return (
      <div className="kiosk-portal-page">
        <div className="kiosk-portal-hero">
          <div className="kiosk-portal-card" style={{ textAlign: 'center', padding: '36px 24px' }}>
            <div style={{ width: '48px', height: '48px', margin: '0 auto 12px auto', borderRadius: '50%', background: '#FEF2F2', color: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
            </div>
            <h3 style={{ fontSize: '1.15rem', color: '#1E293B', margin: '0 0 6px 0' }}>Organization Not Found</h3>
            <p style={{ fontSize: '0.86rem', color: '#64748B', margin: '0 0 18px 0' }}>{orgError}</p>
            <Link to="/login" className="kiosk-action-btn secondary" style={{ textDecoration: 'none' }}>
              Sign In to Attendify
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="kiosk-portal-page">
      <div className="kiosk-portal-hero">
        {/* Background Texture matching Signup */}
        <img
          src="/images/693f7a801b0f40ebff9c2e56_Mask%20group%20%284%29.png"
          alt=""
          className="kiosk-hero-texture"
          loading="lazy"
        />

        {/* Header */}
        <header className="kiosk-portal-header">
          <div className="kiosk-brand-row">
            <Link to="/" title="Attendify Home">
              <img src="/attendify-logo.png" alt="Attendify" className="kiosk-logo-img" />
            </Link>
            <span className="kiosk-live-clock-badge">
              <span className="kiosk-live-pulse-dot" />
              <span>{liveTime} IST</span>
            </span>
          </div>
          <h1 className="kiosk-portal-title">{orgData?.company_name}</h1>
          <p className="kiosk-portal-subtitle">
            Contactless Face Attendance Kiosk • Shift {orgData?.check_in_time} – {orgData?.check_out_time}
          </p>
        </header>

        {/* CARD CONTAINER */}
        <main className="kiosk-portal-card">
          {/* ===================================================================
              VIEW 1: PIN AUTHENTICATION GATE (Locked)
              =================================================================== */}
          {!kioskToken ? (
            <div className="kiosk-pin-gate">
              <div className="kiosk-pin-icon-wrap">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
              </div>

              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#1E293B', margin: '0 0 4px 0' }}>
                Enter Kiosk Access PIN
              </h2>
              <p style={{ fontSize: '0.84rem', color: '#64748B', margin: '0 auto 12px auto', maxWidth: '340px' }}>
                Enter the 6-digit access code provided by <strong>{orgData?.company_name}</strong> to unlock attendance scanning on this device.
              </p>

              {pinError && (
                <div className="kiosk-alert-error" role="alert">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                  </svg>
                  <span>{pinError}</span>
                </div>
              )}

              <form onSubmit={handleVerifyPin} noValidate>
                <div className="kiosk-pin-input-box">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                  </svg>
                  <input
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    required
                    placeholder="• • • • • •"
                    value={pinInput}
                    onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
                    className="kiosk-pin-input"
                    autoFocus
                  />
                </div>

                <button
                  type="submit"
                  disabled={pinSubmitting || pinInput.length < 4}
                  className="kiosk-action-btn"
                >
                  {pinSubmitting ? (
                    <span>Verifying Access...</span>
                  ) : (
                    <>
                      <span>Unlock Kiosk Terminal</span>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="9 18 15 12 9 6"></polyline>
                      </svg>
                    </>
                  )}
                </button>
              </form>
            </div>
          ) : (
            /* ===================================================================
               VIEW 2: UNLOCKED DEDICATED KIOSK INTERFACE (2 Focused Tabs)
               =================================================================== */
            <div>
              {/* Tabs Switcher */}
              <div className="kiosk-tabs-bar">
                <button
                  type="button"
                  className={`kiosk-tab-btn ${activeTab === 'scan' ? 'active' : ''}`}
                  onClick={() => { setActiveTab('scan'); setScanError(''); setScanMessage(''); }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                    <circle cx="12" cy="13" r="4"></circle>
                  </svg>
                  <span>Mark Attendance</span>
                </button>

                <button
                  type="button"
                  className={`kiosk-tab-btn ${activeTab === 'enroll' ? 'active' : ''}`}
                  onClick={() => { setActiveTab('enroll'); setEnrollStatus({ text: '', type: '' }); }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                    <circle cx="8.5" cy="7" r="4"></circle>
                    <line x1="20" y1="8" x2="20" y2="14"></line>
                    <line x1="23" y1="11" x2="17" y2="11"></line>
                  </svg>
                  <span>New Member Register</span>
                </button>
              </div>

              {/* Shared Hidden Canvas */}
              <canvas ref={canvasRef} style={{ display: 'none' }} />

              {/* TAB 1: MARK ATTENDANCE (SCAN) */}
              {activeTab === 'scan' && (
                <div style={{ textAlign: 'center' }}>
                  <div className="kiosk-camera-viewport">
                    <video ref={videoRef} autoPlay playsInline muted />
                    <div className="kiosk-oval-target" />
                  </div>

                  {scanError && (
                    <div className="kiosk-alert-error" role="alert" style={{ margin: '0 auto 10px auto', maxWidth: '360px' }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="12"></line>
                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                      </svg>
                      <span>{scanError}</span>
                    </div>
                  )}

                  {scanMessage && !scanError && (
                    <p style={{ fontSize: '0.84rem', color: '#10B981', fontWeight: 600, margin: '0 0 10px 0' }}>
                      {scanMessage}
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={handleCaptureAttendance}
                    disabled={isProcessing || !streamActive}
                    className="kiosk-action-btn"
                    style={{ maxWidth: '360px', margin: '0 auto' }}
                  >
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                      <circle cx="12" cy="13" r="4"></circle>
                    </svg>
                    <span>{isProcessing ? 'Verifying Biometrics...' : 'Capture Image & Verify Attendance'}</span>
                  </button>

                  <p style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '10px', marginBottom: 0 }}>
                    Align your face inside the dashed oval. Check-in or check-out is recorded automatically.
                  </p>
                </div>
              )}

              {/* TAB 2: SELF ENROLLMENT */}
              {activeTab === 'enroll' && (
                <div>
                  <form onSubmit={handleSelfEnroll} noValidate style={{ textAlign: 'center' }}>
                    <div style={{ textAlign: 'left', marginBottom: '10px' }}>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#1E293B', marginBottom: '4px' }}>
                        Full Name <span style={{ color: '#EF4444' }}>*</span>
                      </label>
                      <div className="kiosk-pin-input-box" style={{ height: '38px', margin: 0, padding: '0 10px' }}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                          <circle cx="12" cy="7" r="4"></circle>
                        </svg>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Priya Sharma"
                          value={enrollName}
                          onChange={(e) => setEnrollName(e.target.value)}
                          className="signup-text-input"
                          style={{ fontSize: '13px', letterSpacing: 'normal', textAlign: 'left' }}
                          disabled={enrollCapturing}
                        />
                      </div>
                    </div>

                    <div className="kiosk-camera-viewport" style={{ maxHeight: '200px' }}>
                      <video ref={videoRef} autoPlay playsInline muted />
                      <div className="kiosk-oval-target" style={{ width: '130px', height: '170px' }} />
                    </div>

                    {enrollCapturing && (
                      <div style={{ margin: '8px 0' }}>
                        <div className="kiosk-progress-track">
                          <div className="kiosk-progress-fill" style={{ width: `${enrollProgress}%` }} />
                        </div>
                        <span style={{ fontSize: '0.78rem', color: '#6857DF', fontWeight: 600 }}>
                          Capturing burst vectors: {enrollProgress}%
                        </span>
                      </div>
                    )}

                    {enrollStatus.text && (
                      <div className={enrollStatus.type === 'error' ? 'kiosk-alert-error' : enrollStatus.type === 'success' ? 'kiosk-alert-success' : 'kiosk-alert-error'} style={{ background: enrollStatus.type === 'info' ? '#EEF2FF' : undefined, borderColor: enrollStatus.type === 'info' ? '#C7D2FE' : undefined, color: enrollStatus.type === 'info' ? '#4338CA' : undefined }}>
                        <span>{enrollStatus.text}</span>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={enrollCapturing || !enrollName.trim() || !streamActive}
                      className="kiosk-action-btn"
                    >
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                      </svg>
                      <span>{enrollCapturing ? 'Capturing 20 Vectors...' : 'Register 20 Biometric Vectors'}</span>
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}
        </main>

        {/* Footer actions: Lock Device */}
        {kioskToken && (
          <button type="button" onClick={handleLockKiosk} className="kiosk-lock-link">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
            <span>Lock Kiosk Device</span>
          </button>
        )}
      </div>

      {/* =========================================================================
          VERIFICATION MODAL POPUP (Right Tick Animation)
          ========================================================================= */}
      {successModal && (
        <div className="attendance-popup-overlay" onClick={() => setSuccessModal(null)}>
          <div className="attendance-popup-card" onClick={(e) => e.stopPropagation()}>
            <div className="attendance-tick-circle">
              <svg className="attendance-tick-svg" viewBox="0 0 52 52">
                <circle cx="26" cy="26" r="25" />
                <path d="M14 27l7 7 17-17" />
              </svg>
            </div>

            <div className={`attendance-popup-badge ${successModal.type}`}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              {successModal.type === 'checkout'
                ? 'Check-Out Verified'
                : successModal.type === 'info'
                ? 'Attendance Status'
                : 'Check-In Verified'}
            </div>

            <h3 className="attendance-popup-name">{successModal.name}</h3>

            {successModal.time && (
              <div className="attendance-popup-time">
                Recorded at {formatTimeIST(successModal.time)}
              </div>
            )}

            {successModal.statusBadge && (
              <div style={{ marginBottom: '10px' }}>
                <span className="badge-status present" style={{ fontSize: '0.78rem', padding: '3px 10px' }}>
                  {successModal.statusBadge}
                </span>
              </div>
            )}

            <p className="attendance-popup-msg">
              {successModal.message}
            </p>

            <button
              type="button"
              className="btn-solid-primary"
              onClick={() => setSuccessModal(null)}
              style={{ width: '100%', padding: '10px 20px', borderRadius: '12px', fontSize: '0.92rem' }}
            >
              Done
            </button>

            <div className="attendance-popup-progress" />
          </div>
        </div>
      )}
    </div>
  );
}

