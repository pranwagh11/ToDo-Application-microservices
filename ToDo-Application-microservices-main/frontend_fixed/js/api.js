const Api = (() => {
  function getToken() {
    return localStorage.getItem('keepr_token');
  }

  async function request(path, { method = 'GET', body, auth = true } = {}) {
    const headers = { 'Content-Type': 'application/json' };
    if (auth) {
      const token = getToken();
      if (token) headers['Authorization'] = `Bearer ${token}`;
    }

    let res;
    try {
      res = await fetch(`${CONFIG.API_BASE_URL}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch (err) {
      throw new Error('Could not reach the server. Is the API Gateway running?');
    }

    let data;
    try {
      data = await res.json();
    } catch {
      data = null;
    }

    if (!res.ok) {
      throw new Error((data && data.message) || `Request failed (${res.status})`);
    }

    return data;
  }

  return {
    register: (payload) => request('/auth/register', { method: 'POST', body: payload, auth: false }),
    login: (payload) => request('/auth/login', { method: 'POST', body: payload, auth: false }),
    profile: () => request('/auth/profile'),

    listTasks: () => request('/tasks'),
    createTask: (payload) => request('/tasks', { method: 'POST', body: payload }),
    updateTask: (id, payload) => request(`/tasks/${id}`, { method: 'PUT', body: payload }),
    completeTask: (id) => request(`/tasks/${id}/complete`, { method: 'PATCH' }),
    deleteTask: (id) => request(`/tasks/${id}`, { method: 'DELETE' }),
  };
})();
