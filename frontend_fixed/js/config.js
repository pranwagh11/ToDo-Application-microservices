// NOTE: this static file is no longer served — server.js intercepts requests
// for /js/config.js and generates it dynamically from the API_BASE_URL env
// var at request time. This file is kept only so the repo doesn't 404 if
// something references it directly by path; its content is never sent as-is.
// See server.js for the real logic, and set API_BASE_URL when running the
// frontend container (docker-compose.yml / Kubernetes Deployment env).
const CONFIG = {
  API_BASE_URL: 'http://localhost:3000',
};
