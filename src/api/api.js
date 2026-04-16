import axios from 'axios';
import { appVersion, getCurrentAppPath, isElectron, redirectToLogin } from '../lib/desktop';
import { clearAuthTokens, clearStoredUser, getAccessToken } from '../lib/authStorage';

export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: `${API_BASE}/api`,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
api.interceptors.request.use(async (config) => {
  const token = await getAccessToken();
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }

  config.headers.set('X-Client-Type', isElectron ? 'Electron' : 'Web');
  config.headers.set('X-Client-Version', appVersion);

  return config;
});

// Handle 401 → redirect to login
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    if (err.response?.status === 401) {
      await clearAuthTokens();
      clearStoredUser();
      
      // Do NOT redirect if the user is already on the login page
      // This allows the "Invalid Credentials" error to stay visible
      const currentPath = getCurrentAppPath();
      if (currentPath !== '/' && currentPath !== '/login') {
        redirectToLogin();
      }
    }
    return Promise.reject(err);
  }
);

// ── Auth ──────────────────────────────────────────────
export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  registerPM: (data) => api.post('/auth/register/pm', data),
  getMe: () => api.get('/auth/me'),
  getMeInit: () => api.get('/auth/init'),
  updateProfile: (data) => api.patch('/auth/me', data),
  assignRole: (data) => api.post('/users/assign-role', data),
  getInviteCodes: () => api.get('/users/invite-codes'),
  generateInviteCode: (data) => api.post('/users/invite-codes', data),
  deactivateInvitation: (id) => api.patch('/users/invite-codes', { id }),
  getPendingUsers: () => api.get('/users/pending'),

  // SU Employee Management
  getEmployees: () => api.get('/users/employees'),
  changeEmployeeRole: (id, role) => api.patch(`/users/employees/${id}/role`, { role }),
  deactivateEmployee: (id) => api.patch(`/users/employees/${id}/deactivate`),
  getReportEligibleUsers: () => api.get('/users/report-eligible-users'),

  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (data) => api.post('/auth/reset-password', data),

  // Portfolio Endpoints
  addSkill: (data) => api.post('/users/skills', data),
  deleteSkill: (id) => api.delete(`/users/skills/${id}`),
  addCertification: (formData) => api.post('/users/certifications', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  deleteCertification: (id) => api.delete(`/users/certifications/${id}`),
  addExperience: (data) => api.post('/users/experience', data),
  deleteExperience: (id) => api.delete(`/users/experience/${id}`),
};

// ── Notifications ─────────────────────────────────────
export const notificationsAPI = {
  list: () => api.get('/users/notifications'),
  markRead: (id) => api.post(`/users/notifications/${id}/read`),
  markAllRead: () => api.post('/users/notifications/read-all'),
};

// ── Teams ─────────────────────────────────────────────
export const teamsAPI = {
  list: () => api.get('/teams'),
  create: (data) => api.post('/teams', data),
  myTeam: () => api.get('/teams/my'),
  getEligibleUsers: () => api.get('/teams/eligible-users'),
  getAllUsers: () => api.get('/teams/all-users'),
  getManagedUsers: () => api.get('/teams/managed-users'),
  getEligibleMembers: (teamId) => api.get(`/teams/${teamId}/eligible-members`),
  assignTL: (teamId, data) => api.post(`/teams/${teamId}/assign-tl`, data),
  assignJP: (teamId, data) => api.post(`/teams/${teamId}/assign-jp`, data),
  deleteTeam: (teamId) => api.delete(`/teams/${teamId}/delete`),
  removeMember: (teamId, userId) => api.delete(`/teams/${teamId}/members/${userId}`),
  // TL self-service
  getAvailableJPs: () => api.get('/teams/available-jps'),
  tlAssignJP: (teamId, data) => api.post(`/teams/${teamId}/tl-assign-jp`, data),
  tlRemoveMember: (teamId, userId) => api.delete(`/teams/${teamId}/members/${userId}/tl-remove`),
};


// ── Projects ──────────────────────────────────────────
export const projectsAPI = {
  list: () => api.get('/projects'),
  getById: (id) => api.get(`/projects/${id}`),
  create: (formData) => api.post('/projects', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  updateStatus: (id, data) => api.patch(`/projects/${id}/status`, data),
  update: (id, formData) => api.patch(`/projects/${id}/`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  delete: (id) => api.delete(`/projects/${id}/delete`),
  deleteDocument: (projectId, docId) => api.delete(`/projects/${projectId}/documents/${docId}/delete`),
  getGithubData: (id) => api.get(`/projects/${id}/github`),
  setupGithub: (id, data) => api.post(`/projects/${id}/github/setup`, data),
  getGithubRepoDetails: (projectId, repoId) => api.get(`/projects/${projectId}/github/repos/${repoId}`),
  getLogs: (projectId) => api.get(`/projects/${projectId}/logs`),
  createLog: (projectId, data) => api.post(`/projects/${projectId}/logs`, data),
  deleteLog: (projectId, logId) => api.delete(`/projects/${projectId}/logs/${logId}`),
};

export const leavesAPI = {
  getPending: () => api.get('/leaves/pending', { params: { t: Date.now() } }),
  review: (id, data) => api.patch(`/leaves/${id}/review`, data),
  apply: (data) => api.post('/leaves/my', data),
  getMy: () => api.get('/leaves/my', { params: { t: Date.now() } }),
  getCalendarEvents: () => api.get('/leaves/calendar', { params: { t: Date.now() } }),
  getPolicies: () => api.get('/leaves/policies', { params: { t: Date.now() } }),
  updatePolicies: (data) => api.put('/leaves/policies', data),
  getEarnedLeaves: () => api.get('/leaves/earned-leaves', { params: { t: Date.now() } }),
  updateEarnedLeaves: (data) => api.put('/leaves/earned-leaves', data),
};

// ── Tasks ─────────────────────────────────────────────
export const tasksAPI = {
  list: () => api.get('/tasks/', { params: { t: Date.now() } }),
  listByProject: (projectId) => api.get('/tasks/', { params: { project: projectId, t: Date.now() } }),
  detail: (id) => api.get(`/tasks/${id}/`),
  create: (data) => api.post('/tasks/', data),
  start: (id) => api.post(`/tasks/${id}/start/`),
  submit: (id, formData) => api.post(`/tasks/${id}/submit/`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  review: (id, data) => api.post(`/tasks/${id}/review/`, data),
  updatePriority: (id, priority) => api.patch(`/tasks/${id}/`, { priority }),
  update: (id, data) => api.patch(`/tasks/${id}/`, data),

  // Ticket APIs
  getTickets: (taskId) => api.get(`/tickets/?task=${taskId}`),
  createTicket: (data) => api.post('/tickets/', data, {
    // We might need multipart/form-data for file uploads
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  resolveTicket: (ticketId) => api.patch(`/tickets/${ticketId}/resolve/`),

  // Comment APIs
  getComments: (ticketId) => api.get(`/comments/?ticket=${ticketId}`),
  createComment: (data) => api.post('/comments/', data),
  gracePeriod: (id) => api.post(`/tasks/${id}/grace_period/`),
};

// ── Dashboard Stats ─────────────────────────────────────
export const dashboardAPI = {
  getStats: () => api.get('/dashboard-stats/')
};

// ── Attendance ─────────────────────────────────────────
export const attendanceAPI = {
  status: () => api.get('/attendance/status/'),
  adminDashboardMetrics: (params) => api.get('/attendance/admin-dashboard/metrics/', { params }),
  getTimesheet: (params) => api.get('/attendance/timesheet/', { params }),
  getHeatmapData: async (params) => {
    // Fetch all 12 months for a year in parallel
    const { year, user_id } = params;
    const promises = Array.from({ length: 12 }, (_, i) => {
      const p = { month: i + 1, year };
      if (user_id) p.user_id = user_id;
      return api.get('/attendance/timesheet/', { params: p });
    });
    const results = await Promise.all(promises);
    return results.flatMap(r => r.data.records || []);
  },
  startBreak: (data) => api.post('/attendance/start_break/', data),
  endBreak: () => api.post('/attendance/end_break/'),
  logout: () => api.post('/attendance/logout/'),
  exportExcel: (params) => api.get('/attendance/admin-dashboard/export_excel/', { params, responseType: 'blob' }),
  exportPdf: (params) => api.get('/attendance/admin-dashboard/export_pdf/', { params, responseType: 'blob' }),
  
  // Evidence Gallery
  getEvidence: (params) => api.get('/attendance/evidence/', { params }),
  uploadEvidence: (formData) => api.post('/attendance/evidence/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  deleteEvidence: (id) => api.delete(`/attendance/evidence/${id}/`),
};

// ── Workspace ─────────────────────────────────────────
export const workspaceAPI = {
  // Messages
  getMessages: (projectId) => api.get(`/messages/?project=${projectId}`),
  createMessage: (data) => api.post('/messages/', data),

  // Events
  getEvents: (projectId) => api.get(`/events/?project=${projectId}`),
  getAllEvents: () => api.get('/events/'),   // all org events (used by dashboard)
  createEvent: (data) => api.post('/events/', data),
  updateEvent: (id, data) => api.patch(`/events/${id}/`, data),

  // Chat
  getChat: (projectId) => api.get(`/chat/?project=${projectId}`),
  sendChat: (data) => api.post('/chat/', data),

  // Activity
  getActivity: (projectId) => api.get(`/activity/?project=${projectId}`),

  // Task Lists
  getTaskLists: (projectId) => api.get(`/task-lists/?project=${projectId}`),
  createTaskList: (data) => api.post('/task-lists/', data),
};

export default api;
