import React, { useState, useRef, useEffect } from 'react';
import api from '../../services/api';
import '../../styles/ams-theme.css';

export default function StudentEnrollment() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const [studentName, setStudentName] = useState('');
  const [streamActive, setStreamActive] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [captureProgress, setCaptureProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState({ type: '', text: '' });
  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(true);

  useEffect(() => {
    let currentStream = null;

    async function initCamera() {
      try {
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
        setStatusMessage({
          type: 'error',
          text: 'Camera access denied or unavailable. Please enable permissions to capture facial features.'
        });
      }
    }

    initCamera();
    fetchStudents();

    return () => {
      if (currentStream) {
        currentStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const fetchStudents = async () => {
    try {
      const res = await api.getStudents();
      setStudents(res.students || []);
    } catch (err) {
      console.error("Failed to load users:", err);
    } finally {
      setLoadingStudents(false);
    }
  };

  const handleStartCapture = async (e) => {
    e.preventDefault();
    if (!studentName.trim()) {
      setStatusMessage({ type: 'error', text: 'Please enter the user\'s name.' });
      return;
    }

    if (!streamActive || !videoRef.current || !canvasRef.current) {
      setStatusMessage({ type: 'error', text: 'Camera is not active.' });
      return;
    }

    setStatusMessage({ type: '', text: '' });
    setCapturing(true);
    setCaptureProgress(0);

    const capturedFrames = [];
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');

    // Burst capture: 20 frames spaced at 500ms intervals (identical to add_user.html)
    for (let i = 1; i <= 20; i++) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const base64Data = canvas.toDataURL('image/jpeg', 0.85);
      capturedFrames.push(base64Data);
      setCaptureProgress(i);
    }

    setStatusMessage({ type: 'info', text: 'Processing face encodings and registering user...' });

    try {
      const res = await api.enrollStudent({
        name: studentName.trim(),
        images: capturedFrames
      });

      setStatusMessage({
        type: 'success',
        text: `✓ ${res.message || 'User registered successfully!'}`
      });

      setStudentName('');
      setCaptureProgress(0);
      await fetchStudents();
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Registration failed. Ensure face is clearly visible and try again.'
      });
    } finally {
      setCapturing(false);
    }
  };

  const handleDelete = async (name) => {
    if (!window.confirm(`Are you sure you want to delete user "${name}" and their biometric encodings?`)) return;

    try {
      await api.deleteStudent(name);
      await fetchStudents();
    } catch (err) {
      alert(err.message || 'Failed to delete user.');
    }
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div className="ams-dashboard-header" style={{ textAlign: 'center' }}>
        <h1>Add User</h1>
        <p>Position user in front of the camera and enter their full name</p>
      </div>

      {statusMessage.text && (
        <div className={statusMessage.type === 'error' ? 'ams-error-message' : 'ams-welcome-message'}>
          {statusMessage.text}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '20px', alignItems: 'start' }}>
        {/* Left: Enrollment Card from add_user.html */}
        <div className="ams-card" style={{ maxWidth: '640px', width: '100%', margin: '0 auto' }}>
          <form onSubmit={handleStartCapture}>
            <label className="ams-label">User Name</label>
            <input
              type="text"
              required
              disabled={capturing}
              placeholder="Enter user name"
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              className="ams-input"
              style={{ marginBottom: '15px' }}
            />

            {/* Video Viewport matching add_user.html */}
            <div style={{
              position: 'relative',
              width: '100%',
              borderRadius: '8px',
              overflow: 'hidden',
              backgroundColor: '#1A2526',
              border: '2px solid #3A4B5C',
              marginBottom: '15px'
            }}>
              <video
                ref={videoRef}
                playsInline
                muted
                style={{
                  width: '100%',
                  height: '320px',
                  objectFit: 'cover',
                  display: 'block',
                  transform: 'scaleX(-1)'
                }}
              />
              <canvas ref={canvasRef} style={{ display: 'none' }} />

              {capturing && (
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  backgroundColor: 'rgba(0, 0, 0, 0.7)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff'
                }}>
                  <div style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '8px' }}>
                    Capturing {captureProgress} / 20
                  </div>
                  <div style={{
                    width: '70%',
                    height: '8px',
                    backgroundColor: '#3A4B5C',
                    borderRadius: '4px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      width: `${(captureProgress / 20) * 100}%`,
                      height: '100%',
                      backgroundColor: '#28A745',
                      transition: 'width 0.2s ease'
                    }} />
                  </div>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={capturing || !streamActive || !studentName.trim()}
              className="ams-btn ams-btn-success"
              style={{ width: '100%', padding: '12px', fontSize: '1rem', fontWeight: 'bold' }}
            >
              {capturing ? `Capturing (${captureProgress}/20)...` : 'Start Capture & Register User'}
            </button>
          </form>
        </div>

        {/* Right: Enrolled Users List */}
        <div className="ams-card" style={{ margin: 0, maxHeight: '500px', display: 'flex', flexDirection: 'column' }}>
          <h2>Enrolled Users ({students.length})</h2>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loadingStudents ? (
              <p style={{ color: '#A0A0A0', fontSize: '0.9rem' }}>Loading users...</p>
            ) : students.length === 0 ? (
              <p style={{ color: '#A0A0A0', fontSize: '0.9rem' }}>No users added yet.</p>
            ) : (
              <table className="ams-table" style={{ marginTop: 0 }}>
                <tbody>
                  {students.map((s) => (
                    <tr key={s.name}>
                      <td style={{ padding: '8px 10px', fontWeight: '500' }}>
                        <div>{s.name}</div>
                        <small style={{ color: s.has_biometrics ? '#28A745' : '#FFC107', fontSize: '0.75rem' }}>
                          {s.has_biometrics ? `✓ ${s.vector_count} face encodings` : 'No face data'}
                        </small>
                      </td>
                      <td style={{ width: '40px', textAlign: 'center', padding: '8px' }}>
                        <button
                          onClick={() => handleDelete(s.name)}
                          className="ams-btn ams-btn-danger"
                          style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                          title="Delete user"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
