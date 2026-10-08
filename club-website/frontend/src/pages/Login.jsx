import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { useConfig } from '../config.js';
import { useLang } from '../i18n/index.jsx';

const EMPTY = { username: '', email: '', password: '', confirmPassword: '', mobilePhone: '', name: '', surname: '', consentPrivacy: false, consentMarketing: false };

// Fills {{clubName}} etc. into admin-editable consent text, same mini-templating as the email templates.
function fillTemplate(template, vars) {
  let out = template || '';
  for (const k in vars) out = out.replaceAll(`{{${k}}}`, vars[k]);
  return out;
}

export default function Login() {
  const cfg = useConfig();
  const { t } = useLang();
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
        if (f.password !== f.confirmPassword) { setErr(t('login.passwordsNoMatch')); return; }
        if (!f.consentPrivacy) { setErr(t('login.acceptPrivacy')); return; }
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
      <h2>{mode === 'login' ? t('login.loginTitle') : mode === 'forgot' ? t('login.forgotTitle') : t('login.signupTitle')}</h2>

      {mode === 'signup' && (
        <>
          <label>{t('login.firstName')}<input value={f.name} onChange={set('name')} required /></label>
          <label>{t('login.surname')}<input value={f.surname} onChange={set('surname')} required /></label>
          <label>{t('login.username')}<input value={f.username} onChange={set('username')} required minLength={3} /></label>
          <label>{t('login.email')}<input type="email" value={f.email} onChange={set('email')} required /></label>
          <label>{t('login.mobilePhone')}
            <input type="tel" value={f.mobilePhone} onChange={set('mobilePhone')} required
                   pattern="\+?[0-9]{7,15}" title="7-15 digits, optionally starting with +, no spaces" placeholder="e.g. +38970123456" />
          </label>
          <label>{t('login.password')}<input type="password" value={f.password} onChange={set('password')} required minLength={6} /></label>
          <label>{t('login.confirmPassword')}<input type="password" value={f.confirmPassword} onChange={set('confirmPassword')} required minLength={6} /></label>

          <label className="check">
            <input type="checkbox" checked={f.consentPrivacy} onChange={setCheck('consentPrivacy')} required />
            <span>{fillTemplate(cfg.consentPrivacyText, vars)}</span>
          </label>
          <label className="check">
            <input type="checkbox" checked={f.consentMarketing} onChange={setCheck('consentMarketing')} />
            <span>{fillTemplate(cfg.consentMarketingText, vars)} <span className="muted">{t('login.optional')}</span></span>
          </label>
        </>
      )}

      {mode === 'login' && (
        <>
          <label>{t('login.usernameOrEmail')}<input value={f.identifier} onChange={set('identifier')} required /></label>
          <label>{t('login.password')}<input type="password" value={f.password} onChange={set('password')} required /></label>
        </>
      )}

      {mode === 'forgot' && (
        <label>{t('login.email')}<input type="email" value={f.email} onChange={set('email')} required /></label>
      )}

      {notice && <p className="ok">{notice}</p>}
      {err && <p className="err">{err}</p>}
      {mode !== 'forgot' && <button className="btn">{mode === 'login' ? t('login.logIn') : t('login.signUp')}</button>}
      {mode === 'forgot' && <button className="btn" disabled={busy}>{busy ? t('login.sending') : t('login.sendResetLink')}</button>}

      {mode === 'login' && (
        <p className="muted">
          <button type="button" className="link dark" onClick={() => switchMode('forgot')}>{t('login.forgotPassword')}</button>
        </p>
      )}

      {mode !== 'forgot' && (
        <p className="muted">
          {mode === 'login' ? t('login.newMember') : t('login.alreadyHaveAccount')}
          <button type="button" className="link dark" onClick={() => switchMode(mode === 'login' ? 'signup' : 'login')}>
            {mode === 'login' ? t('login.signUp') : t('login.logIn')}
          </button>
        </p>
      )}
      {mode === 'forgot' && (
        <p className="muted">
          <button type="button" className="link dark" onClick={() => switchMode('login')}>{t('login.backToLogin')}</button>
        </p>
      )}
      {mode === 'signup' && <p className="muted">{t('login.needsApproval')}</p>}
    </form>
  );
}
