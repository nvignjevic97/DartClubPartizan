// Thin fetch wrapper: adds the JWT and turns error responses into Error(message).
async function req(path, { method = 'GET', body, form, raw } = {}) {
  const headers = {};
  const token = localStorage.getItem('token');
  if (token) headers.Authorization = 'Bearer ' + token;
  let payload;
  if (form) payload = form;
  else if (body !== undefined) { headers['Content-Type'] = 'application/json'; payload = JSON.stringify(body); }
  const res = await fetch('/api' + path, { method, headers, body: payload });
  if (!res.ok) {
    let msg; try { msg = (await res.json()).message; } catch { /* no body */ }
    throw new Error(msg || res.statusText);
  }
  if (raw) return res.blob();
  return (res.headers.get('content-type') || '').includes('json') ? res.json() : null;
}

export const api = {
  get: (p) => req(p),
  post: (p, body) => req(p, { method: 'POST', body }),
  put: (p, body) => req(p, { method: 'PUT', body }),
  del: (p) => req(p, { method: 'DELETE' }),
  upload: (p, form) => req(p, { method: 'POST', form }),
  blob: (p) => req(p, { raw: true }),
};

export const fmtDate = (s) => s ? new Date(s).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : '';
