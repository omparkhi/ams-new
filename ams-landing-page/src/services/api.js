// Centralized API client for AMS SaaS
const getBaseUrl = () => {
  let url = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000/api').trim().replace(/\/+$/, '');
  // If the URL does not end with /api, append it automatically
  if (!url.endsWith('/api')) {
    url = `${url}/api`;
  }
  return url;
};

const API_BASE_URL = getBaseUrl();

class ApiService {
  getToken() {
    return localStorage.getItem('ams_token');
  }

  setToken(token) {
    if (token) {
      localStorage.setItem('ams_token', token);
    } else {
      localStorage.removeItem('ams_token');
    }
  }

  async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const token = this.getToken();

    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...(options.headers || {})
    };

    const config = {
      ...options,
      headers
    };

    if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
      config.body = JSON.stringify(options.body);
    }

    try {
      const response = await fetch(url, config);

      // Handle binary downloads (e.g., Excel export)
      if (options.isBlob) {
        if (!response.ok) {
          throw new Error(`Failed to download file (${response.status})`);
        }
        return await response.blob();
      }

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || data.message || `Request failed with status ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error(`API Error on ${endpoint}:`, error);
      throw error;
    }
  }

  // Auth Endpoints
  register(data) {
    return this.request('/auth/register', { method: 'POST', body: data });
  }

  login(credentials) {
    return this.request('/auth/login', { method: 'POST', body: credentials });
  }

  getCurrentUser() {
    return this.request('/auth/me', { method: 'GET' });
  }

  // Students Endpoints
  getStudents() {
    return this.request('/students', { method: 'GET' });
  }

  enrollStudent(data) {
    return this.request('/students/enroll', { method: 'POST', body: data });
  }

  deleteStudent(name) {
    return this.request(`/students/${encodeURIComponent(name)}`, { method: 'DELETE' });
  }

  // Kiosk Endpoint
  scanKiosk(imageData, studentName = '') {
    const payload = { image: imageData };
    if (studentName) payload.student_name = studentName;
    return this.request('/kiosk/scan', { method: 'POST', body: payload });
  }

  // Attendance Endpoints
  getTodayAttendance() {
    return this.request('/attendance/today', { method: 'GET' });
  }

  forceCheckin(name) {
    return this.request('/attendance/force-checkin', { method: 'POST', body: { name } });
  }

  forceCheckout(name) {
    return this.request('/attendance/force-checkout', { method: 'POST', body: { name } });
  }

  getAttendanceHistory(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/attendance/history${query ? `?${query}` : ''}`, { method: 'GET' });
  }

  async downloadExcel(month, year) {
    const token = this.getToken();
    const query = new URLSearchParams({ month, year, token }).toString();
    const blob = await this.request(`/attendance/export-excel?${query}`, { method: 'GET', isBlob: true });
    
    // Create direct browser download trigger
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = `Attendance_${month}_${year}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(downloadUrl);
  }

  // Settings Endpoints
  getCompanySettings() {
    return this.request('/company/settings', { method: 'GET' });
  }

  updateCompanySettings(settings) {
    return this.request('/company/settings', { method: 'PUT', body: settings });
  }
}

export const api = new ApiService();
export default api;

