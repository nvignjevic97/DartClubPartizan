import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api.js';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [err, setErr] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault(); setErr('');
    if (password !== confirm) { setErr("Passwords don't match"); return; }
    setBusy(true);
    try {
      await api.post('/auth/reset-password', { token, newPassword: password });
      setDone(true);
    } catch (ex) { setErr(ex.message); } finally { setBusy(false); }
  }

  if (!token) {
    return (
      <form className="auth">
        <h2>Reset your password</h2>
        <p className="err">This link is missing its reset token. Please use the link from your email, or request a new one.</p>
        <p className="muted"><Link to="/login">Back to log in</Link></p>
      </form>
    );
  }

  if (done) {
    return (
      <form className="auth">
        <h2>Password changed</h2>
        <p className="ok">Your password has been changed. You can now log in.</p>
        <p className="muted"><Link to="/login">Go to log in</Link></p>
      </form>
    );
  }

  return (
    <form className="auth" onSubmit={submit}>
      <h2>Choose a new password</h2>
      <label>New password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} /></label>
      <label>Confirm new password<input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={6} /></label>
      {err && <p className="err">{err}</p>}
      <button className="btn" disabled={busy}>{busy ? 'Saving…' : 'Save new password'}</button>
      <p className="muted"><Link to="/login">Back to log in</Link></p>
    </form>
  );
}
