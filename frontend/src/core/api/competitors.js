import api from './client';

export const competitorAPI = {
  list:       (params)   => api.get('/competitors/', { params }),
  get:        (id)       => api.get(`/competitors/${id}/`),
  create:     (data)     => api.post('/competitors/', data),
  update:     (id, data) => api.patch(`/competitors/${id}/`, data),
  delete:     (id)       => api.delete(`/competitors/${id}/`),
  timeline:   (id, params) => api.get(`/competitors/${id}/timeline/`, { params }),
  posts:      (id, params) => api.get(`/competitors/${id}/posts/`, { params }),
  insights:   (id)       => api.post(`/competitors/${id}/insights/`),
  snapshotNow:(id)       => api.post(`/competitors/${id}/snapshot_now/`),
  benchmark:  (data)     => api.post('/competitors/benchmark/', data),
};

export const audienceAPI = {
  unified: (params) => api.get('/audience/unified/', { params }),
};
