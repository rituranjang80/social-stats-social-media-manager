import api from './client';

export const auditAPI = {
  list: (params) => api.get('/audit/log/', { params }),
};

export const errorMonitoringAPI = {
  list:         (params) => api.get('/errors/', { params }),
  get:          (id)     => api.get(`/errors/${id}/`),
  resolve:      (id, data) => api.post(`/errors/${id}/resolve/`, data),
  delete:       (id)     => api.delete(`/errors/${id}/`),
  reportClient: (data)   => api.post('/errors/client-report/', data, {
    skipWorkspace: true,
    validateStatus: (s) => s === 201 || s === 204,
  }),
};
