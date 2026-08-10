import api, { publicApi } from './client';

export const sharedReportsAPI = {
  list:   (params) => api.get('/shared-reports/', { params }),
  create: (data)   => api.post('/shared-reports/', data),
  delete: (id)     => api.delete(`/shared-reports/${id}/`),
  update: (id, data) => api.patch(`/shared-reports/${id}/`, data),
};

export const publicReportAPI = {
  get:    (token)          => publicApi.get(`/public/report/${token}/`),
  verify: (token, password) => publicApi.post(`/public/report/${token}/verify/`, { password }),
};

export const lookupsAPI = {
  get: () => publicApi.get('/public/lookups/'),
};

export const contentAPI = {
  getPublic: (key) => publicApi.get(`/public/content/${key}/`),
};
