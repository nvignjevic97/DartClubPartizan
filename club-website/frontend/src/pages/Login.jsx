import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { useConfig } from '../config.js';

const EMPTY = { username: '', email: '', password: '', confirmPassword: '', mobilePhone: '', name: '', surname: '', consentPrivacy: false, consentMarketing: false };

// Fills {{clubName}} etc. into admin-editable consent text, same mini-templating as the email templates.
function fillTemplate(template, vars) {
  let out = template || '';
  for (const k in vars) out = out.replaceAll(`{{${k}}}`, vars[k]);
  return out;
}

export default function Login() {
  const cfg = useConfig();
  const [mode, setMode] = useState('login');
  const [f, setF] = useState({ identifier: '', password: '', ...EMPTY });
  const [err, setErr] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const { login } = useAuth();
  const nav = useNavigate();
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const setCheck = (k) => (e) => setF({ ...f, [k]: e.target.checked });

  function switchMode(next) {
    setMode(next); setErr(''); setNotice(''); setF({ identifier: '', password: '', ...EMPTY });
  }

  async function submit(e) {
    e.preventDefault(); setErr(''); setNotice('');
    try {
      if (mode === 'login') {
        const data = await api.post('/auth/login', { identifier: f.identifier, password: f.password });
        login(data);
        nav(data.role === 'SUPER_ADMIN' ? '/admin' : '/account');
      } else if (mode === 'forgot') {
        setBusy(true);
        try {
          const res = await api.post('/auth/forgot-password', { email: f.email });
          setNotice(res.message);
        } finally { setBusy(false); }
      } else {
        if (f.password !== f.confirmPassword) { setErr("Passwords don't match."); return; }
        if (!f.consentPrivacy) { setErr('Please accept the data storage terms to create an account.'); return; }
        const { username, email, password, mobilePhone, name, surname, consentPrivacy, consentMarketing } = f;
        const res = await api.post('/auth/register', { username, email, password, mobilePhone, name, surname, consentPrivacy, consentMarketing });
        setNotice(res.message);
        setMode('login');
        setF({ identifier: f.username, password: '', ...EMPTY });
      }
    } catch (ex) { setErr(ex.message); }
  }

  const vars = { clubName: cfg.clubName || 'the club' };

  return (
    <form className="auth" onSubmit={submit}>
      <h2>{mode === 'login' ? 'Log in' : mode === 'forgot' ? 'Reset your password' : 'Create your account'}</h2>

      {mode === 'signup' && (
        <>
          <label>First name<input value={f.name} onChange={set('name')} required /></label>
          <label>Surname<input value={f.surname} onChange={set('surname')} required /></label>
          <label>Username<input value={f.username} onChange={set('username')} required minLength={3} /></label>
          <label>Email<input type="email" value={f.email} onChange={set('email')} required /></label>
          <label>Mobile phone
            <input type="tel" value={f.mobilePhone} onChange={set('mobilePhone')} required
                   pattern="\+?[0-9]{7,15}" title="7-15 digits, optionally starting with +, no spaces" placeholder="e.g. +38970123456" />
          </label>
          <label>Password<input type="password" value={f.password} onChange={set('password')} required minLength={6} /></label>
          <label>Confirm password<input type="password" value={f.confirmPassword} onChange={set('confirmPassword')} required minLength={6} /></label>

          <label className="check">
            <input type="checkbox" checked={f.consentPrivacy} onChange={setCheck('consentPrivacy')} required />
            <span>{fillTemplate(cfg.consentPrivacyText, vars)}</span>
          </label>
          <label className="check">
            <input type="checkbox" checked={f.consentMarketing} onChange={setCheck('consentMarketing')} />
            <span>{fillTemplate(cfg.consentMarketingText, vars)} <span className="muted">(optional)</span></span>
          </label>
        </>
      )}

      {mode === 'login' && (
        <>
          <label>Username or email<input value={f.identifier} onChange={set('identifier')} required /></label>
          <label>Password<input type="password" value={f.password} onChange={set('password')} required /></label>
        </>
      )}

      {mode === 'forgot' && (
        <label>Email<input type="email" value={f.email} onChange={set('email')} required /></label>
      )}

      {notice && <p className="ok">{notice}</p>}
      {err && <p className="err">{err}</p>}
      {mode !== 'forgot' && <button className="btn">{mode === 'login' ? 'Log in' : 'Sign up'}</button>}
      {mode === 'forgot' && <button className="btn" disabled={busy}>{busy ? 'Sending…' : 'Send reset link'}</button>}

      {mode === 'login' && (
        <p className="muted">
          <button type="button" className="link dark" onClick={() => switchMode('forgot')}>Forgot your password?</button>
        </p>
      )}

      {mode !== 'forgot' && (
        <p className="muted">
          {mode === 'login' ? 'New member? ' : 'Already have an account? '}
          <button type="button" className="link dark" onClick={() => switchMode(mode === 'login' ? 'signup' : 'login')}>
            {mode === 'login' ? 'Sign up' : 'Log in'}
          </button>
        </p>
      )}
      {mode === 'forgot' && (
        <p className="muted">
          <button type="button" className="link dark" onClick={() => switchMode('login')}>Back to log in</button>
        </p>
      )}
      {mode === 'signup' && <p className="muted">A club admin has to approve your account before you can log in.</p>}
    </form>
  );
}
