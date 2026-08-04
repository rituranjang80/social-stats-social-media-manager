/* Proxy /media to the API gateway during `npm start` (UI on :3000, files on :8000). */
const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function proxyMedia(app) {
  const target =
    process.env.REACT_APP_PUBLIC_ORIGIN
    || (process.env.REACT_APP_API_URL || 'http://localhost:8000/api').replace(/\/api\/?$/, '')
    || 'http://localhost:8000';

  app.use(
    '/media',
    createProxyMiddleware({
      target,
      changeOrigin: true,
      logLevel: 'warn',
    }),
  );
};
