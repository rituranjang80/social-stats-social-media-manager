import api from './client';

export const notificationAPI = {
  list:     ()   => api.get('/notifications/'),
  markRead: (id) => api.post(`/notifications/${id}/read/`),
  markAll:  ()   => api.post('/notifications/read-all/'),
};

export const notificationsAPI = {
  getPreferences: ()       => api.get('/notifications/preferences/'),
  putPreferences: (matrix) => api.put('/notifications/preferences/', { matrix }),
  approvalQueue:  (params) => api.get('/composer/approvals/', { params }),
};
