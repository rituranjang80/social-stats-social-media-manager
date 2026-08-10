import api from './client';

export const composerAPI = {
  posts: {
    list:        (params)   => api.get('/composer/posts/', { params }),
    get:         (id, params) => api.get(`/composer/posts/${id}/`, { params }),
    create:      (data)     => api.post('/composer/posts/', data),
    update:      (id, data) => api.patch(`/composer/posts/${id}/`, data),
    delete:      (id)       => api.delete(`/composer/posts/${id}/`),
    publishNow:  (id, params) => api.post(`/composer/posts/${id}/publish_now/`, {}, { params }),
    schedule:    (id, scheduled_at, params) => api.post(`/composer/posts/${id}/schedule/`, { scheduled_at }, { params }),
    cancel:      (id)       => api.post(`/composer/posts/${id}/cancel/`),
    duplicate:   (id, params) => api.post(`/composer/posts/${id}/duplicate/`, {}, { params }),
    approve:     (id)       => api.post(`/composer/posts/${id}/approve/`),
    addToQueue:  (id, queue_id) => api.post(`/composer/posts/${id}/add_to_queue/`, { queue_id }),
    preview:     (id)       => api.get(`/composer/posts/${id}/preview/`),
    tagSuggestions: (params) => api.get('/composer/posts/tag_suggestions/', { params }),
  },
  media: {
    list:        (params)   => api.get('/composer/media/', { params }),
    get:         (id)       => api.get(`/composer/media/${id}/`),
    delete:      (id)       => api.delete(`/composer/media/${id}/`),
    update:      (id, data) => api.patch(`/composer/media/${id}/`, data),
    upload:      (formData, params) => {
      if (params?.client_id != null && !formData.has('client')) {
        formData.append('client', String(params.client_id));
      }
      return api.post('/composer/media/', formData, {
        params,
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    bulkUpload:  (formData, params) => {
      if (params?.client_id != null && !formData.has('client')) {
        formData.append('client', String(params.client_id));
      }
      return api.post('/composer/media/bulk_upload/', formData, {
        params,
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
  },
  queues: {
    list:        (params)   => api.get('/composer/queues/', { params }),
    get:         (id)       => api.get(`/composer/queues/${id}/`),
    create:      (data)     => api.post('/composer/queues/', data),
    update:      (id, data) => api.patch(`/composer/queues/${id}/`, data),
    delete:      (id)       => api.delete(`/composer/queues/${id}/`),
    addItems:    (id, items) => api.post(`/composer/queues/${id}/add_items/`, { items }),
    reorder:     (id, order) => api.post(`/composer/queues/${id}/reorder/`, { order }),
    pause:       (id)       => api.post(`/composer/queues/${id}/pause/`),
    resume:      (id)       => api.post(`/composer/queues/${id}/resume/`),
  },
  preflight:     (data)     => api.post('/composer/preflight/', data),
};

export const captionAPI = {
  generate:   (data)     => api.post('/ai/caption/', data),
  getHistory: (clientId) => api.get('/ai/caption/', { params: { client_id: clientId } }),
};

export const postIdeasAPI = {
  generate:      (data)              => api.post('/ai/post-ideas/', data),
  getHistory:    (params)            => api.get('/ai/post-ideas/', { params }),
  approveAll:    (id)                => api.post(`/ai/post-ideas/${id}/approve-all/`),
  addToCalendar: (id, data)          => api.post(`/ai/post-ideas/${id}/add-to-calendar/`, data),
  updateIdea:    (id, ideaId, data)  => api.patch(`/ai/post-ideas/${id}/ideas/${ideaId}/`, data),
};

export const hashtagAPI = {
  generate:    (data)   => api.post('/ai/hashtags/', data),
  getHistory:  (params) => api.get('/ai/hashtags/', { params }),
  saveSet:     (id, data) => api.post(`/ai/hashtags/${id}/save-set/`, data),
  getSavedSets:(params) => api.get('/ai/hashtags/saved-sets/', { params }),
};
