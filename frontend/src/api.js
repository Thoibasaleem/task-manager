const base = import.meta.env.VITE_API_URL || '';

export function getToken() {
  return localStorage.getItem('ethara_token');
}

export function setToken(token) {
  if (token) localStorage.setItem('ethara_token', token);
  else localStorage.removeItem('ethara_token');
}

async function request(path, options = {}) {
  const headers = { ...options.headers };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(options.body);
  }
  const res = await fetch(`${base}${path}`, { ...options, headers });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const err = new Error(data?.message || res.statusText);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export const api = {
  login: (email, password) =>
    request('/api/auth/login', { method: 'POST', body: { email, password } }),
  register: (payload) => request('/api/auth/register', { method: 'POST', body: payload }),
  me: () => request('/api/auth/me'),
  tasks: () => request('/api/tasks'),
  task: (id) => request(`/api/tasks/${id}`),
  createTask: (payload) => request('/api/tasks', { method: 'POST', body: payload }),
  bulkCreateTasks: (userIds, taskTemplate, count) =>
    request('/api/tasks/bulk', { method: 'POST', body: { userIds, taskTemplate, count } }),
  users: () => request('/api/users'),
  submitTask: (id, actualTimeSpent, proofOfWork) =>
    request(`/api/tasks/${id}/submit`, { method: 'POST', body: { actualTimeSpent, proofOfWork } }),
  reviewTask: (id, decision, feedback) =>
    request(`/api/tasks/${id}/review`, { method: 'PATCH', body: { decision, feedback } }),
  todayProgress: () => request('/api/tasks/progress/today'),
  qualityStats: () => request('/api/tasks/stats/quality'),
};
