import api from './client';

export const calendarAPI = {
  getPostStatuses: () => api.get('/calendar/post-statuses/'),
  getPosts:     (params)   => api.get('/calendar/posts/',               { params }),
  getPost:      (id)       => api.get(`/calendar/posts/${id}/`),
  createPost:   (data)     => api.post('/calendar/posts/', data),
  updatePost:   (id, data) => api.put(`/calendar/posts/${id}/`, data),
  deletePost:   (id)       => api.delete(`/calendar/posts/${id}/`),
  reschedule:   (id, data) => api.post(`/calendar/posts/${id}/reschedule/`, data),
  getUpcoming:  (params)   => api.get('/calendar/posts/upcoming/',      { params }),
  getStats:     (params)   => api.get('/calendar/posts/stats/',         { params }),
  getNotes:     (params)   => api.get('/calendar/notes/',               { params }),
  createNote:   (data)     => api.post('/calendar/notes/', data),
  updateNote:   (id, data) => api.put(`/calendar/notes/${id}/`, data),
  deleteNote:   (id)       => api.delete(`/calendar/notes/${id}/`),
  getSchedule:  (params)   => api.get('/calendar/schedule/',            { params }),
  saveSchedule: (data)     => api.post('/calendar/schedule/', data),
  suggestTimes: (params)   => api.get('/calendar/suggest-times/',       { params }),
};

export const postManagementAPI = {
  getSettings: (params) => api.get('/post-management/settings/', { params }),
  saveSettings: (data) => api.put('/post-management/settings/', data),
  getPosts: (params) => api.get('/post-management/posts/', { params }),
  updateStatus: (id, data) => api.patch(`/post-management/posts/${id}/status/`, data),
  getStatusLog: (params) => api.get('/post-management/status-log/', { params }),
};

export const gmbAPI = {
  info:    (clientId)         => api.get(`/gmb/info/${clientId}/`),
  reviews: (clientId, params) => api.get(`/gmb/reviews/${clientId}/`, { params }),
};
