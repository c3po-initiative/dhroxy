const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  console.log('=== setupProxy.js loaded ===');

  app.use(
    createProxyMiddleware({
      target: 'http://localhost:8080',
      changeOrigin: true,
      pathFilter: '/fhir',
      logLevel: 'debug',
      onProxyReq: (proxyReq, req, res) => {
        console.log('=== PROXY REQUEST ===');
        console.log('Proxy path:', proxyReq.path);
        console.log('Method:', req.method);

        // Forward X-Sundhed-* headers
        const cookieHeader = req.headers['x-sundhed-cookie'];
        const xsrfHeader = req.headers['x-sundhed-xsrf-token'];
        const uuidHeader = req.headers['x-sundhed-conversation-uuid'];

        if (cookieHeader) {
          proxyReq.setHeader('X-Sundhed-Cookie', cookieHeader);
          console.log('Forwarding X-Sundhed-Cookie');
        }
        if (xsrfHeader) {
          proxyReq.setHeader('X-Sundhed-XSRF-Token', xsrfHeader);
          console.log('Forwarding X-Sundhed-XSRF-Token');
        }
        if (uuidHeader) {
          proxyReq.setHeader('X-Sundhed-Conversation-UUID', uuidHeader);
          console.log('Forwarding X-Sundhed-Conversation-UUID');
        }

        // Fix body forwarding: if Express body-parser consumed the body,
        // re-write it so the proxy sends the correct data
        if (req.body && req.method === 'POST') {
          const bodyData = JSON.stringify(req.body);
          proxyReq.setHeader('Content-Type', 'application/json');
          proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
          proxyReq.write(bodyData);
        }

        console.log('=== END PROXY REQUEST ===');
      },
      onError: (err, req, res) => {
        console.error('Proxy error:', err);
      }
    })
  );
};
