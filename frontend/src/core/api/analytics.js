import api from './client';

export const overviewAPI = {
  get: (params) => api.get('/overview/', { params }),
};

export const syncLogsAPI = {
  list: (params) => api.get('/synclogs/', { params }),
};

export const goalsAPI = {
  list:     (params)   => api.get('/goals/', { params }),
  create:   (data)     => api.post('/goals/', data),
  update:   (id, data) => api.put(`/goals/${id}/`, data),
  delete:   (id)       => api.delete(`/goals/${id}/`),
  progress: (params)   => api.get('/goals/progress/', { params }),
};

export const insightsAPI = {
  list:     (params) => api.get('/insights/', { params }),
  generate: (data)   => api.post('/insights/generate/', data),
};

export const topPostsAPI = {
  list:    (params) => api.get('/top-posts/', { params }),
  allTime: (params) => api.get('/top-posts/all-time/', { params }),
  run:     ()       => api.post('/top-posts/run/'),
};

export const alertsAPI = {
  list:        (params) => api.get('/alerts/', { params }),
  markRead:    (id)     => api.post(`/alerts/${id}/mark_read/`),
  markAllRead: (params) => api.post('/alerts/mark_all_read/', null, { params }),
  runCheck:    ()       => api.post('/alerts/run_check/'),
};

export const roiAPI = {
  getSettings:  (clientId)        => api.get(`/roi/settings/${clientId}/`),
  saveSettings: (clientId, data)  => api.put(`/roi/settings/${clientId}/`, data),
  calculate:    (data)            => api.post('/roi/calculate/', data),
  getLive:      (params)          => api.get('/roi/live/', { params }),
  getReports:   (params)          => api.get('/roi/reports/', { params }),
};
