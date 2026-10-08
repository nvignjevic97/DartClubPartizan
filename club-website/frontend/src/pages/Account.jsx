import { useEffect, useState } from 'react';
import { api, fmtDate } from '../api.js';
import { useAuth } from '../auth.jsx';
import { useLang } from '../i18n/index.jsx';

const thisMonth = () => new Date().toISOString().slice(0, 7);

export default function Account() {
  const { user } = useAuth();
  const { t } = useLang();
  const [month, setMonth] = useState(thisMonth());
  const [file, setFile] = useState(null);
  const [list, setList] = useState([]);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [status, setStatus] = useState(user.status);
  const [suspensionRequested, setSuspensionRequested] = useState(user.suspensionRequested);

  const load = () => api.get('/payments/me').then(setList).catch((e) => setErr(e.message));
  const loadStatus = () => api.get('/account/status').then((s) => { setStatus(s.status); setSuspensionRequested(s.suspensionRequested); }).catch(() => {});
  useEffect(() => { load(); loadStatus(); }, []);

  async function submit(e) {
    e.preventDefault(); setMsg(''); setErr('');
    const form = new FormData(); form.append('month', month); form.append('file', file);
    try { await api.upload('/payments', form); setMsg(t('account.uploaded')); setFile(null); e.target.reset(); load(); }
    catch (ex) { setErr(ex.message); }
  }

  return (
    <div className="narrow">
      <h2 className="sec">{t('account.hello')} {user.name} {user.surname}</h2>

      <Membership status={status} suspensionRequested={suspensionRequested} onChange={loadStatus} />

      {status === 'SUSPENDED' ? (
        <p className="box muted">{t('account.membershipPaused')}</p>
      ) : (
        <form className="box" onSubmit={submit}>
          <h3>{t('account.uploadTitle')}</h3>
          <p className="muted">{t('account.uploadHint')}</p>
          <label>{t('account.month')}<input type="month" value={month} min={user.memberSince || undefined} onChange={(e) => setMonth(e.target.value)} required /></label>
          {user.memberSince && <p className="muted">{t('account.memberFrom')} {user.memberSince} {t('account.earliestMonth')}</p>}
          <label>{t('account.document')}<input type="file" accept="image/*,application/pdf" onChange={(e) => setFile(e.target.files[0])} required /></label>
          {msg && <p className="ok">{msg}</p>}{err && <p className="err">{err}</p>}
          <button className="btn" disabled={!file}>{t('account.uploadBtn')}</button>
        </form>
      )}

      <h3>{t('account.yourMonths')}</h3>
      {list.length === 0 && <p className="muted">{t('account.nothingUploaded')}</p>}
      <table className="tbl wide">
        <thead><tr><th>{t('account.colMonth')}</th><th>{t('account.colFile')}</th><th>{t('account.colUploaded')}</th><th>{t('account.colStatus')}</th></tr></thead>
        <tbody>{list.map((p) => (
          <tr key={p.id}><td>{p.month}</td><td>{p.fileName}</td><td>{fmtDate(p.uploadedAt)}</td>
            <td><span className={'tag ' + p.status}>{p.status === 'PAID' ? t('account.confirmed') : t('account.waitingReview')}</span></td></tr>
        ))}</tbody>
      </table>
    </div>
  );
}

/** Lets a member ask to pause or resume their own membership. The request needs a club admin to
 * confirm it before it actually takes effect - this just flags it for them. */
function Membership({ status, suspensionRequested, onChange }) {
  const { t } = useLang();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function act(path) {
    setBusy(true); setErr('');
    try { await api.post(`/account/${path}`); onChange(); }
    catch (e) { setErr(e.message); }
    setBusy(false);
  }

  if (status !== 'APPROVED' && status !== 'SUSPENDED') return null;

  return (
    <div className="box">
      <h3>{t('account.membership')}</h3>
      <p>
        {t('account.status')}: <span className={'tag ' + status}>{status === 'APPROVED' ? t('account.active') : t('account.paused')}</span>
      </p>
      {err && <p className="err">{err}</p>}

      {suspensionRequested ? (
        <>
          <p className="muted">
            {status === 'APPROVED' ? t('account.askedPause') : t('account.askedResume')}
          </p>
          <button className="btn small ghost" disabled={busy} onClick={() => act('cancel-request')}>{t('account.cancelRequest')}</button>
        </>
      ) : status === 'APPROVED' ? (
        <>
          <p className="muted">{t('account.pauseHint')}</p>
          <button className="btn small ghost" disabled={busy} onClick={() => act('request-suspend')}>{t('account.requestPause')}</button>
        </>
      ) : (
        <>
          <p className="muted">{t('account.resumeHint')}</p>
          <button className="btn small" disabled={busy} onClick={() => act('request-reactivate')}>{t('account.requestResume')}</button>
        </>
      )}
    </div>
  );
}
