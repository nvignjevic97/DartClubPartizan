import { useEffect, useState } from 'react';
import { api, fmtDate } from '../api.js';
import { useAuth } from '../auth.jsx';

const thisMonth = () => new Date().toISOString().slice(0, 7);

export default function Account() {
  const { user } = useAuth();
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
    try { await api.upload('/payments', form); setMsg('Document uploaded. The club will confirm it soon.'); setFile(null); e.target.reset(); load(); }
    catch (ex) { setErr(ex.message); }
  }

  return (
    <div className="narrow">
      <h2 className="sec">Hello, {user.name} {user.surname}</h2>

      <Membership status={status} suspensionRequested={suspensionRequested} onChange={loadStatus} />

      {status === 'SUSPENDED' ? (
        <p className="box muted">Your membership is paused, so there's nothing to pay right now.</p>
      ) : (
        <form className="box" onSubmit={submit}>
          <h3>Upload subscription proof</h3>
          <p className="muted">One photo or PDF per month. You can replace it until the club confirms it.</p>
          <label>Month<input type="month" value={month} min={user.memberSince || undefined} onChange={(e) => setMonth(e.target.value)} required /></label>
          {user.memberSince && <p className="muted">You're a member from {user.memberSince} - that's the earliest month you can submit.</p>}
          <label>Document<input type="file" accept="image/*,application/pdf" onChange={(e) => setFile(e.target.files[0])} required /></label>
          {msg && <p className="ok">{msg}</p>}{err && <p className="err">{err}</p>}
          <button className="btn" disabled={!file}>Upload document</button>
        </form>
      )}

      <h3>Your months</h3>
      {list.length === 0 && <p className="muted">Nothing uploaded yet.</p>}
      <table className="tbl wide">
        <thead><tr><th>Month</th><th>File</th><th>Uploaded</th><th>Status</th></tr></thead>
        <tbody>{list.map((p) => (
          <tr key={p.id}><td>{p.month}</td><td>{p.fileName}</td><td>{fmtDate(p.uploadedAt)}</td>
            <td><span className={'tag ' + p.status}>{p.status === 'PAID' ? 'Confirmed' : 'Waiting for review'}</span></td></tr>
        ))}</tbody>
      </table>
    </div>
  );
}

/** Lets a member ask to pause or resume their own membership. The request needs a club admin to
 * confirm it before it actually takes effect - this just flags it for them. */
function Membership({ status, suspensionRequested, onChange }) {
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
      <h3>Membership</h3>
      <p>
        Status: <span className={'tag ' + status}>{status === 'APPROVED' ? 'Active' : 'Paused'}</span>
      </p>
      {err && <p className="err">{err}</p>}

      {suspensionRequested ? (
        <>
          <p className="muted">
            {status === 'APPROVED'
              ? "You've asked to pause your membership - waiting for the club to confirm it."
              : "You've asked to resume your membership - waiting for the club to confirm it."}
          </p>
          <button className="btn small ghost" disabled={busy} onClick={() => act('cancel-request')}>Cancel request</button>
        </>
      ) : status === 'APPROVED' ? (
        <>
          <p className="muted">Pausing your membership means you won't owe any subscription payments until you resume it. You can still log in.</p>
          <button className="btn small ghost" disabled={busy} onClick={() => act('request-suspend')}>Request to pause membership</button>
        </>
      ) : (
        <>
          <p className="muted">Ready to come back? Ask the club to resume your membership.</p>
          <button className="btn small" disabled={busy} onClick={() => act('request-reactivate')}>Request to resume membership</button>
        </>
      )}
    </div>
  );
}
