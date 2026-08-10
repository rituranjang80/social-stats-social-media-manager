import api from './client';

export const videoAPI = {
  upload:           (formData) => api.post('/video/upload/', formData,
                                  { headers: { 'Content-Type': 'multipart/form-data' } }),
  importFromUrl:    (data)     => api.post('/video/upload/', data),
  trim:             (data)     => api.post('/video/trim/', data),
  resize:           (data)     => api.post('/video/resize/', data),
  extractThumbnail: (data)     => api.post('/video/extract-thumbnail/', data),
  addCaptions:      (data)     => api.post('/video/add-captions/', data),
  youtubeUpload:    (data)     => api.post('/video/youtube-upload/', data),
};

export const automationsAPI = {
  list:      (params)   => api.get('/automations/', { params }),
  get:       (id)       => api.get(`/automations/${id}/`),
  create:    (data)     => api.post('/automations/', data),
  update:    (id, data) => api.patch(`/automations/${id}/`, data),
  delete:    (id)       => api.delete(`/automations/${id}/`),
  toggle:    (id)       => api.post(`/automations/${id}/toggle/`),
  runNow:    (id, data) => api.post(`/automations/${id}/run_now/`, data),
  templates: ()         => api.get('/automations/templates/'),
};
