import React, { useState, useRef, useEffect } from 'react';
import api from '../../services/api';
import '../../styles/ams-theme.css';

export default function Kiosk() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const [streamActive, setStreamActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null);
  const [autoScan, setAutoScan] = useState(false);

  useEffect(() => {
    let currentStream = null;

    async function startCamera() {
      try {
        setCameraError('');
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
          audio: false
        });
        currentStream = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
          setStreamActive(true);
        }
      } catch (err) {
        setCameraError('Unable to access webcam. Please ensure camera permissions are allowed.');
      }
    }

    startCamera();

    return () => {
      if (currentStream) {
        currentStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const captureAndScan = async () => {
    if (!videoRef.current || !canvasRef.current || scanning) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const base64Image = canvas.toDataURL('image/jpeg', 0.85);

    setScanning(true);
    try {
      const res = await api.scanKiosk(base64Image);
      setResult(res);

      if (res.status === 'checkin_success' || res.status === 'checkout_success') {
        setTimeout(() => setResult(null), 6000);
      }
    } catch (err) {
      setResult({
        status: 'error',
        message: err.message || 'Recognition request failed.'
      });
    } finally {
      setScanning(false);
    }
  };

  useEffect(() => {
    if (!autoScan || !streamActive) return;

    const interval = setInterval(() => {
      if (!scanning && !result) {
        captureAndScan();
      }
    }, 3500);

    return () => clearInterval(interval);
  }, [autoScan, streamActive, scanning, result]);

  const isSuccess = result?.status === 'checkin_success' || result?.status === 'checkout_success';
  const isWarning = result?.status === 'checkout_blocked' || result?.status === 'already_completed';

  return (
    <div style={{ maxWidth: '750px', margin: '0 auto', textAlign: 'center' }}>
      <div className="ams-dashboard-header">
        <h1>Attendance Kiosk</h1>
        <p>Contactless face recognition terminal for check-in and check-out</p>
      </div>

      {cameraError && (
        <div className="ams-error-message">
          {cameraError}
        </div>
      )}

      {/* Main Terminal Card */}
      <div className="ams-card" style={{ padding: '25px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{
          position: 'relative',
          width: '100%',
          maxWidth: '600px',
          borderRadius: '10px',
          overflow: 'hidden',
          backgroundColor: '#1A2526',
          border: '2px solid #3A4B5C',
          marginBottom: '20px'
        }}>
          <video
            ref={videoRef}
            playsInline
            muted
            style={{
              width: '100%',
              height: '380px',
              objectFit: 'cover',
              display: 'block',
              transform: 'scaleX(-1)'
            }}
          />

          <canvas ref={canvasRef} style={{ display: 'none' }} />

          {/* Guide Overlay */}
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '220px',
            height: '260px',
            border: scanning ? '2px dashed #28A745' : '2px dashed rgba(255, 255, 255, 0.4)',
            borderRadius: '110px',
            pointerEvents: 'none'
          }} />

          {/* Live Indicator */}
          <div style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            padding: '4px 10px',
            borderRadius: '15px',
            fontSize: '0.8rem',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: streamActive ? '#28A745' : '#DC3545'
            }} />
            {streamActive ? 'Live Camera' : 'Offline'}
          </div>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
          <button
            onClick={captureAndScan}
            disabled={!streamActive || scanning}
            className="ams-btn ams-btn-success"
            style={{ padding: '12px 24px', fontSize: '1rem', fontWeight: 'bold' }}
          >
            {scanning ? 'Verifying Face...' : '📷 Scan Attendance'}
          </button>

          <button
            onClick={() => setAutoScan((prev) => !prev)}
            className="ams-btn"
            style={{ padding: '12px 20px', fontSize: '0.95rem' }}
          >
            {autoScan ? 'Auto-Scan: Active' : 'Auto-Scan: Off'}
          </button>
        </div>

        {/* Result Notification Banner */}
        {result && (
          <div
            className={isSuccess ? 'ams-welcome-message' : isWarning ? 'ams-welcome-message' : 'ams-error-message'}
            style={{
              width: '100%',
              maxWidth: '600px',
              marginTop: '20px',
              textAlign: 'left',
              backgroundColor: isWarning ? '#FFF3CD' : undefined,
              color: isWarning ? '#856404' : undefined,
              border: isWarning ? '1px solid #FFEEBA' : undefined
            }}
          >
            <div>
              <strong>{result.message}</strong>
              {result.name && (
                <div style={{ fontSize: '0.85rem', marginTop: '4px' }}>
                  User: <strong>{result.name}</strong>
                  {result.checkin_time && ` | Check-in: ${result.checkin_time}`}
                  {result.expected_checkout && ` | Expected Out: ${result.expected_checkout}`}
                  {result.hours_worked && ` | Hours: ${result.hours_worked}`}
                </div>
              )}
            </div>
            <button
              onClick={() => setResult(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}
            >
              ×
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
