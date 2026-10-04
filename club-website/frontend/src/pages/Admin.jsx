import { useEffect, useState } from 'react';
import { api, fmtDate } from '../api.js';
import { useConfig } from '../config.js';
import Crud from '../components/Crud.jsx';

const TABS = ['Accounts', 'Subscriptions', 'News', 'Matches', 'League table', 'Email templates', 'Marketing emails', 'Site settings'];

export default function Admin() {
  const [tab, setTab] = useState(TABS[0]);
  const [pendingCount, setPendingCount] = useState(0);
  useEffect(() => { api.get('/admin/accounts/pending').then((l) => setPendingCount(l.length)).catch(() => {}); }, []);
  return (
    <div>
      <h2 className="sec">Admin</h2>
      <div className="tabs">{TABS.map((t) => (
        <button key={t} className={t === tab ? 'on' : ''} onClick={() => setTab(t)}>
          {t}{t === 'Accounts' && pendingCount > 0 ? ` (${pendingCount})` : ''}
        </button>
      ))}</div>
      {tab === 'Accounts' && <Accounts onCount={setPendingCount} />}
      {tab === 'Subscriptions' && <Subscriptions />}
      {tab === 'News' && <Crud title="news" listPath="/news" adminPath="/admin/news"
        fields={[{ name: 'title', label: 'Title', type: 'text' }, { name: 'content', label: 'Text', type: 'textarea' }, { name: 'imageUrl', label: 'Picture', type: 'image' }]}
        summary={(n) => `${n.title} (${fmtDate(n.createdAt)})`} />}
      {tab === 'Matches' && <Crud title="match" listPath="/matches" adminPath="/admin/matches"
        fields={[{ name: 'homeTeam', label: 'Home team', type: 'text' }, { name: 'awayTeam', label: 'Away team', type: 'text' },
          { name: 'kickoff', label: 'Kick-off', type: 'datetime' }, { name: 'venue', label: 'Venue', type: 'text', optional: true },
          { name: 'homeScore', label: 'Home score (leave empty until played)', optionalNumber: true },
          { name: 'awayScore', label: 'Away score', optionalNumber: true }]}
        summary={(m) => `${fmtDate(m.kickoff)} — ${m.homeTeam} ${m.homeScore != null ? m.homeScore + ':' + m.awayScore : 'vs'} ${m.awayTeam}`} />}
      {tab === 'League table' && <Crud title="team" listPath="/standings" adminPath="/admin/standings"
        fields={[{ name: 'team', label: 'Team', type: 'text' }, { name: 'won', label: 'Won', type: 'number' },
          { name: 'lost', label: 'Lost', type: 'number' }, { name: 'points', label: 'Points', type: 'number' }]}
        summary={(s) => `${s.team} — ${s.points} pts (${s.won}W-${s.lost}L)`} />}
      {tab === 'Email templates' && <EmailTemplates />}
      {tab === 'Marketing emails' && <MarketingEmails />}
      {tab === 'Site settings' && <><HeroImages /><Settings /></>}
    </div>
  );
}

function Accounts({ onCount }) {
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState('');
  const [rejectingId, setRejectingId] = useState(null);
  const [reason, setReason] = useState('');
  const [approvingId, setApprovingId] = useState(null);
  const [sinceMonth, setSinceMonth] = useState('');
  const load = () => api.get('/admin/accounts/pending').then((l) => { setRows(l); onCount(l.length); }).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, []);

  function startApprove(id) { setApprovingId(id); setSinceMonth(new Date().toISOString().slice(0, 7)); setErr(''); }

  async function confirmApprove(id) {
    if (!sinceMonth) { setErr('Pick the month they start being active from'); return; }
    setErr('');
    try {
      await api.put(`/admin/accounts/${id}/approve`, { memberSince: sinceMonth });
      setApprovingId(null); load();
    } catch (e) { setErr(e.message); }
  }

  function startReject(id) { setRejectingId(id); setReason(''); setErr(''); }

  async function confirmReject(id) {
    if (!reason.trim()) { setErr('Enter a reason to send to the member'); return; }
    try {
      await api.put(`/admin/accounts/${id}/reject`, { reason: reason.trim() });
      setRejectingId(null); setReason(''); load();
    } catch (e) { setErr(e.message); }
  }

  return (
    <>
      <p className="muted">New members can't log in until you approve their account. Both decisions are emailed to the member.</p>
      {err && <p className="err">{err}</p>}
      {rows.length === 0 && <p className="muted">No sign-ups waiting for approval.</p>}
      <div className="sub-list">
        {rows.map((r) => (
          <div className="sub-row acct-row" key={r.id}>
            <div className="sub-id">
              <span className="avatar">{r.name.charAt(0).toUpperCase()}</span>
              <span className="sub-who">
                <span className="sub-fullname">{r.name} {r.surname}</span>
                <span className="muted">@{r.username} · {r.email}{r.mobilePhone ? ' · ' + r.mobilePhone : ''}</span>
              </span>
            </div>
            {approvingId === r.id ? (
              <div className="row sub-actions acct-actions">
                <label className="inline">Active from <input type="month" value={sinceMonth} onChange={(e) => setSinceMonth(e.target.value)} autoFocus /></label>
                <button className="btn small" onClick={() => confirmApprove(r.id)}>Confirm approval</button>
                <button className="btn small ghost" onClick={() => setApprovingId(null)}>Cancel</button>
              </div>
            ) : rejectingId === r.id ? (
              <div className="row sub-actions acct-actions">
                <input placeholder="Reason for the member" value={reason} onChange={(e) => setReason(e.target.value)} autoFocus />
                <button className="btn small" onClick={() => confirmReject(r.id)}>Send rejection</button>
                <button className="btn small ghost" onClick={() => setRejectingId(null)}>Cancel</button>
              </div>
            ) : (
              <div className="row sub-actions">
                <button className="btn small" onClick={() => startApprove(r.id)}>Approve</button>
                <button className="btn small ghost" onClick={() => startReject(r.id)}>Reject</button>
              </div>
            )}
          </div>
        ))}
      </div>

      <Membership />
    </>
  );
}

/** Suspend/reactivate membership: requests a member sent in need confirming, and any member can
 * also be paused or resumed directly from here. */
function Membership() {
  const [rows, setRows] = useState([]);
  const [filter, setFilter] = useState('');
  const [err, setErr] = useState('');
  const [busyId, setBusyId] = useState(null);

  const load = () => api.get('/admin/accounts/members').then(setRows).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, []);

  async function act(id, action) {
    setBusyId(id); setErr('');
    try { await api.put(`/admin/accounts/${id}/${action}`); load(); }
    catch (e) { setErr(e.message); }
    setBusyId(null);
  }

  const requests = rows.filter((r) => r.suspensionRequested);
  const q = filter.trim().toLowerCase();
  const members = rows.filter((r) => !q || r.fullName.toLowerCase().includes(q) || r.email.toLowerCase().includes(q));

  return (
    <>
      {requests.length > 0 && (
        <>
          <h3 className="modal-sub">Pause/resume requests</h3>
          <p className="muted">A member asked for this - confirm it to apply the change, or decline to leave their membership as-is.</p>
          <div className="sub-list">
            {requests.map((r) => (
              <div className="sub-row acct-row" key={r.id}>
                <div className="sub-id">
                  <span className="avatar">{r.fullName.charAt(0).toUpperCase()}</span>
                  <span className="sub-who">
                    <span className="sub-fullname">{r.fullName}</span>
                    <span className="muted">{r.email} · wants to {r.status === 'APPROVED' ? 'pause' : 'resume'} their membership</span>
                  </span>
                </div>
                <div className="row sub-actions">
                  <button className="btn small" disabled={busyId === r.id}
                    onClick={() => act(r.id, r.status === 'APPROVED' ? 'suspend' : 'reactivate')}>
                    Confirm {r.status === 'APPROVED' ? 'pause' : 'resume'}
                  </button>
                  <button className="btn small ghost" disabled={busyId === r.id} onClick={() => act(r.id, 'decline-suspension-request')}>Decline</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <h3 className="modal-sub">Members</h3>
      <p className="muted">Pause a member's membership and they won't owe any more subscriptions while it's paused; they can still log in.</p>
      {err && <p className="err">{err}</p>}
      <input placeholder="Search by name or email" value={filter} onChange={(e) => setFilter(e.target.value)} style={{ marginBottom: 12 }} />
      {members.length === 0 && <p className="muted">No members found.</p>}
      <div className="sub-list">
        {members.map((r) => (
          <div className="sub-row acct-row" key={r.id}>
            <div className="sub-id">
              <span className="avatar">{r.fullName.charAt(0).toUpperCase()}</span>
              <span className="sub-who">
                <span className="sub-fullname">{r.fullName}</span>
                <span className="muted">{r.email}</span>
              </span>
            </div>
            <span className={'tag ' + r.status}>{r.status === 'APPROVED' ? 'Active' : 'Paused'}</span>
            <div className="row sub-actions">
              {r.status === 'APPROVED'
                ? <button className="btn small ghost" disabled={busyId === r.id} onClick={() => act(r.id, 'suspend')}>Suspend</button>
                : <button className="btn small ghost" disabled={busyId === r.id} onClick={() => act(r.id, 'reactivate')}>Reactivate</button>}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function Subscriptions() {
  const [view, setView] = useState('month');
  return (
    <>
      <div className="row" style={{ marginBottom: 16 }}>
        <button className={'btn small' + (view === 'month' ? '' : ' ghost')} onClick={() => setView('month')}>By month</button>
        <button className={'btn small' + (view === 'arrears' ? '' : ' ghost')} onClick={() => setView('arrears')}>Who owes money</button>
      </div>
      {view === 'month' ? <MonthSubscriptions /> : <ArrearsOverview />}
    </>
  );
}

function MonthSubscriptions() {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState('');
  const [toast, setToast] = useState('');
  const [sendingKey, setSendingKey] = useState(null);
  const [openId, setOpenId] = useState(null);

  const load = () => api.get('/admin/subscriptions?month=' + month).then(setRows).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, [month]);

  async function mark(id, status) { setErr(''); try { await api.put(`/admin/payments/${id}/status`, { status }); load(); } catch (e) { setErr(e.message); } }

  async function remind(userId, channel) {
    const key = userId + '-' + channel;
    setSendingKey(key); setErr(''); setToast('');
    try {
      await api.post(`/admin/accounts/${userId}/remind`, { month, channel });
      setToast('Email reminder sent.');
    } catch (e) { setErr(e.message); }
    setSendingKey(null);
  }

  const STATUS_LABEL = { PAID: 'Paid', PENDING: 'Needs review', NONE: 'Not paid' };

  return (
    <>
      <label className="inline">Month <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} /></label>
      {toast && <p className="ok">{toast}</p>}
      {err && <p className="err">{err}</p>}
      {rows.length === 0 && <p className="muted">No members have registered yet.</p>}

      <div className="sub-list">
        {rows.map((r) => (
          <div className="sub-row" key={r.userId}>
            <button className="sub-name" onClick={() => setOpenId(r.userId)}>
              <span className="avatar">{r.fullName.charAt(0).toUpperCase()}</span>
              <span className="sub-who">
                <span className="sub-fullname">{r.fullName}</span>
                <span className="muted">{r.email}</span>
              </span>
            </button>
            <span className={'tag ' + r.status}>{STATUS_LABEL[r.status]}</span>
            <div className="row sub-actions">
              {r.paymentId && (r.status === 'PENDING'
                ? <button className="btn small" onClick={() => mark(r.paymentId, 'PAID')}>Mark paid</button>
                : <button className="btn small ghost" onClick={() => mark(r.paymentId, 'PENDING')}>Undo</button>)}
              <button className="btn small ghost" disabled={sendingKey === r.userId + '-EMAIL'} onClick={() => remind(r.userId, 'EMAIL')}>
                {sendingKey === r.userId + '-EMAIL' ? 'Sending…' : 'Remind · email'}
              </button>
              <button className="btn small ghost" disabled title="SMS/call reminders aren't set up yet">Remind · phone</button>
            </div>
          </div>
        ))}
      </div>

      {openId && <AccountHistory userId={openId} onClose={() => setOpenId(null)} />}
    </>
  );
}

function monthsAgo(n) { const d = new Date(); d.setMonth(d.getMonth() - n); return d.toISOString().slice(0, 7); }

/** Super-admin overview: every month in a range, and who still hasn't been marked paid for it. */
function ArrearsOverview() {
  const [from, setFrom] = useState(monthsAgo(5));
  const [to, setTo] = useState(monthsAgo(0));
  const [months, setMonths] = useState([]);
  const [err, setErr] = useState('');
  const [toast, setToast] = useState('');
  const [sendingKey, setSendingKey] = useState(null);

  const load = () => api.get(`/admin/subscriptions/arrears?from=${from}&to=${to}`).then(setMonths).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, [from, to]);

  const STATUS_LABEL = { PENDING: 'Needs review', NONE: 'Not paid' };

  async function remind(userId, month) {
    const key = userId + '-' + month;
    setSendingKey(key); setErr(''); setToast('');
    try {
      await api.post(`/admin/accounts/${userId}/remind`, { month, channel: 'EMAIL' });
      setToast('Email reminder sent.');
    } catch (e) { setErr(e.message); }
    setSendingKey(null);
  }

  return (
    <>
      <p className="muted">Everyone who hasn't been marked paid, month by month.</p>
      <div className="row">
        <label className="inline">From <input type="month" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
        <label className="inline">To <input type="month" value={to} onChange={(e) => setTo(e.target.value)} /></label>
      </div>
      {toast && <p className="ok">{toast}</p>}
      {err && <p className="err">{err}</p>}

      {months.map(({ month, owing }) => (
        <div className="box narrow" key={month}>
          <h3>{month} {owing.length === 0 ? <span className="muted">— everyone paid</span> : <span className="muted">— {owing.length} owing</span>}</h3>
          {owing.length > 0 && (
            <div className="sub-list">
              {owing.map((o) => (
                <div className="sub-row" key={o.userId}>
                  <div className="sub-id">
                    <span className="avatar">{o.fullName.charAt(0).toUpperCase()}</span>
                    <span className="sub-who">
                      <span className="sub-fullname">{o.fullName}</span>
                      <span className="muted">{o.email}</span>
                    </span>
                  </div>
                  <span className={'tag ' + o.status}>{STATUS_LABEL[o.status]}</span>
                  <div className="row sub-actions">
                    <button className="btn small ghost" disabled={sendingKey === o.userId + '-' + month} onClick={() => remind(o.userId, month)}>
                      {sendingKey === o.userId + '-' + month ? 'Sending…' : 'Remind · email'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </>
  );
}

function AccountHistory({ userId, onClose }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [since, setSince] = useState('');
  const [sinceMsg, setSinceMsg] = useState('');

  const load = () => api.get(`/admin/accounts/${userId}`).then((d) => { setData(d); setSince(d.memberSince || ''); }).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, [userId]);
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function view(id) {
    const blob = await api.blob(`/admin/payments/${id}/file`);
    window.open(URL.createObjectURL(blob), '_blank');
  }
  async function mark(id, status) { await api.put(`/admin/payments/${id}/status`, { status }); load(); }

  async function saveSince(month) {
    setErr(''); setSinceMsg('');
    try { await api.put(`/admin/accounts/${userId}/member-since`, { month }); setSince(month || ''); setSinceMsg('Saved.'); load(); }
    catch (e) { setErr(e.message); }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
        {err && <p className="err">{err}</p>}
        {!data ? <p className="muted">Loading…</p> : (
          <>
            <div className="modal-head">
              <span className="avatar lg">{data.name.charAt(0).toUpperCase()}</span>
              <div>
                <h3>{data.name} {data.surname}</h3>
                <p className="muted">@{data.username} · {data.email}{data.mobilePhone ? ' · ' + data.mobilePhone : ''}</p>
              </div>
            </div>
            <label>Member since <span className="muted">(the first month they're expected to pay - earlier months won't show as owing)</span>
              <div className="row">
                <input type="month" value={since} onChange={(e) => setSince(e.target.value)} />
                <button type="button" className="btn small ghost" onClick={() => saveSince(since)}>Save</button>
                {since && <button type="button" className="link dark" onClick={() => saveSince('')}>Clear</button>}
              </div>
            </label>
            {sinceMsg && <p className="ok">{sinceMsg}</p>}
            <h3 className="modal-sub">Subscription history</h3>
            {data.payments.length === 0 ? <p className="muted">No documents uploaded yet.</p> : (
              <div className="history-list">
                {data.payments.map((p) => (
                  <div className="history-row" key={p.id}>
                    <span className="history-month">{p.month}</span>
                    <span className={'tag ' + p.status}>{p.status === 'PAID' ? 'Paid' : 'Needs review'}</span>
                    <button className="link dark" onClick={() => view(p.id)}>Open {p.fileName}</button>
                    {p.status === 'PENDING'
                      ? <button className="btn small" onClick={() => mark(p.id, 'PAID')}>Mark paid</button>
                      : <button className="btn small ghost" onClick={() => mark(p.id, 'PENDING')}>Undo</button>}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

const SETTINGS = [
  ['clubName', 'Club name', 'text'], ['tagline', 'Tagline', 'text'], ['logoUrl', 'Logo', 'image'],
  ['aboutText', 'About us text', 'textarea'], ['accentColor', 'Accent colour', 'color'], ['contactEmail', 'Contact email', 'text'], ['footerText', 'Footer text', 'text'],
  ['consentPrivacyText', 'Sign-up checkbox 1: data storage consent', 'textarea'],
  ['consentMarketingText', 'Sign-up checkbox 2: marketing consent', 'textarea'],
];

const EMAIL_TEMPLATES = [
  { key: 'emailWelcome', label: 'Welcome / account pending', hint: 'Sent right after someone signs up.' },
  { key: 'emailApproved', label: 'Account approved', hint: 'Sent when you approve a member.' },
  { key: 'emailRejected', label: 'Account rejected', hint: 'Sent when you reject a member. Use {{reason}} to include the reason you typed.' },
  { key: 'emailPasswordReset', label: 'Forgot password', hint: 'Sent when someone asks to reset their password. Use {{link}} to include the reset link.' },
  { key: 'emailSuspended', label: 'Membership suspended', hint: 'Sent when a membership is paused (by the member\'s request or by you).' },
  { key: 'emailReactivated', label: 'Membership reactivated', hint: 'Sent when a paused membership is resumed.' },
];

function EmailTemplates() {
  const cfg = useConfig();
  const [v, setV] = useState({});
  const [msg, setMsg] = useState('');
  useEffect(() => { const { reload, ...rest } = cfg; setV(rest); }, []);

  async function save(e) {
    e.preventDefault(); setMsg('');
    const body = {};
    EMAIL_TEMPLATES.forEach(({ key }) => { body[key + 'Subject'] = v[key + 'Subject'] ?? ''; body[key + 'Body'] = v[key + 'Body'] ?? ''; });
    await api.put('/admin/config', body); await cfg.reload(); setMsg('Saved');
  }

  return (
    <form className="box narrow" onSubmit={save}>
      <p className="muted">Placeholders: <code>{'{{name}}'}</code> <code>{'{{surname}}'}</code> <code>{'{{username}}'}</code> <code>{'{{clubName}}'}</code>
        {' '}(and <code>{'{{reason}}'}</code> for the rejection email, <code>{'{{link}}'}</code> for the password reset email) get replaced automatically.</p>
      {EMAIL_TEMPLATES.map(({ key, label, hint }) => (
        <div key={key}>
          <h3>{label}</h3>
          <p className="muted">{hint}</p>
          <label>Subject
            <input value={v[key + 'Subject'] ?? ''} onChange={(e) => setV({ ...v, [key + 'Subject']: e.target.value })} />
          </label>
          <label>Body
            <textarea rows={6} value={v[key + 'Body'] ?? ''} onChange={(e) => setV({ ...v, [key + 'Body']: e.target.value })} />
          </label>
        </div>
      ))}
      {msg && <p className="ok">{msg}</p>}
      <button className="btn">Save templates</button>
    </form>
  );
}

/** One-off marketing blast: configurable subject/body, sent to everyone who opted in or to a chosen few. */
function MarketingEmails() {
  const [recipients, setRecipients] = useState([]);
  const [mode, setMode] = useState('all'); // 'all' | 'custom'
  const [selected, setSelected] = useState(new Set());
  const [filter, setFilter] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [result, setResult] = useState(null);

  useEffect(() => { api.get('/admin/marketing/recipients').then(setRecipients).catch((e) => setErr(e.message)); }, []);

  const visible = recipients.filter((r) => (r.fullName + ' ' + r.email).toLowerCase().includes(filter.toLowerCase()));
  const toggle = (id) => setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const selectAllVisible = () => setSelected((s) => { const n = new Set(s); visible.forEach((r) => n.add(r.userId)); return n; });
  const clearSelection = () => setSelected(new Set());

  const recipientCount = mode === 'all' ? recipients.length : selected.size;

  async function send(e) {
    e.preventDefault();
    setErr(''); setResult(null);
    if (!subject.trim() || !body.trim()) { setErr('Enter a subject and a message'); return; }
    if (mode === 'custom' && selected.size === 0) { setErr('Choose at least one recipient'); return; }
    setBusy(true);
    try {
      const r = await api.post('/admin/marketing/send', {
        subject: subject.trim(),
        body,
        recipientIds: mode === 'all' ? [] : Array.from(selected),
      });
      setResult(r);
    } catch (e2) { setErr(e2.message); }
    setBusy(false);
  }

  return (
    <form className="box narrow" onSubmit={send}>
      <p className="muted">Only members who ticked the marketing-consent box at sign-up can receive this
        ({recipients.length} opted in). Placeholders: <code>{'{{name}}'}</code> <code>{'{{surname}}'}</code> <code>{'{{clubName}}'}</code> get replaced automatically.</p>

      <label>Subject
        <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Autumn training schedule" />
      </label>
      <label>Message
        <textarea rows={8} value={body} onChange={(e) => setBody(e.target.value)} placeholder={'Hi {{name}},\n\n...'} />
      </label>

      <label className="block">Send to
        <div className="row" style={{ marginTop: 6 }}>
          <label className="inline"><input type="radio" checked={mode === 'all'} onChange={() => setMode('all')} /> Everyone who opted in ({recipients.length})</label>
          <label className="inline"><input type="radio" checked={mode === 'custom'} onChange={() => setMode('custom')} /> Choose specific members</label>
        </div>
      </label>

      {mode === 'custom' && (
        <div>
          <div className="row">
            <input placeholder="Search by name or email…" value={filter} onChange={(e) => setFilter(e.target.value)} />
            <button type="button" className="btn small ghost" onClick={selectAllVisible}>Select all shown</button>
            <button type="button" className="btn small ghost" onClick={clearSelection}>Clear ({selected.size})</button>
          </div>
          <div className="recipient-list">
            {visible.length === 0 && <p className="muted">No matching members.</p>}
            {visible.map((r) => (
              <label className="recipient-row" key={r.userId}>
                <input type="checkbox" checked={selected.has(r.userId)} onChange={() => toggle(r.userId)} />
                <span>{r.fullName}</span>
                <span className="muted">{r.email}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {err && <p className="err">{err}</p>}
      {result && (
        <p className="ok">
          Sent to {result.sent} member{result.sent === 1 ? '' : 's'}.
          {result.failed > 0 ? ` ${result.failed} failed to send.` : ''}
          {result.skipped > 0 ? ` ${result.skipped} selected member${result.skipped === 1 ? '' : 's'} had not opted in and ${result.skipped === 1 ? 'was' : 'were'} skipped.` : ''}
        </p>
      )}
      <button className="btn" disabled={busy || recipientCount === 0}>{busy ? 'Sending…' : `Send to ${recipientCount} member${recipientCount === 1 ? '' : 's'}`}</button>
    </form>
  );
}

function HeroImages() {
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(false);
  const load = () => api.get('/admin/hero-images').then(setItems).catch(() => {});
  useEffect(() => { load(); }, []);

  async function add(file) {
    if (!file) return;
    setBusy(true);
    try {
      const form = new FormData(); form.append('file', file);
      const { url } = await api.upload('/admin/assets', form);
      await api.post('/admin/hero-images', { url });
      await load();
    } finally { setBusy(false); }
  }
  async function remove(id) { await api.del(`/admin/hero-images/${id}`); await load(); }
  async function move(id, dir) { setItems(await api.put(`/admin/hero-images/${id}/move?dir=${dir}`)); }

  return (
    <div className="box narrow">
      <h3>Front page photos (rotating)</h3>
      <p className="muted">Add as many photos as you like - they'll fade from one to the next on the front page, in this order.</p>
      <div className="hero-thumbs">
        {items.map((h, i) => (
          <div className="hero-thumb" key={h.id}>
            <img src={h.url} alt="" />
            <div className="hero-thumb-actions">
              <button type="button" className="link dark" disabled={i === 0} onClick={() => move(h.id, 'up')}>↑</button>
              <button type="button" className="link dark" disabled={i === items.length - 1} onClick={() => move(h.id, 'down')}>↓</button>
              <button type="button" className="link dark" onClick={() => remove(h.id)}>Remove</button>
            </div>
          </div>
        ))}
      </div>
      <label className="block">Add a photo
        <input type="file" accept="image/*" disabled={busy} onChange={(e) => add(e.target.files[0])} />
      </label>
      {items.length === 0 && <p className="muted">No photos yet - the front page will show a plain dark banner until you add some.</p>}
    </div>
  );
}

function Settings() {
  const cfg = useConfig();
  const [v, setV] = useState({});
  const [msg, setMsg] = useState('');
  useEffect(() => { const { reload, ...rest } = cfg; setV(rest); }, []);

  async function img(k, file) {
    if (!file) return;
    const form = new FormData(); form.append('file', file);
    const r = await api.upload('/admin/assets', form); setV((o) => ({ ...o, [k]: r.url }));
  }
  async function save(e) {
    e.preventDefault();
    await api.put('/admin/config', v); await cfg.reload(); setMsg('Saved');
  }

  return (
    <form className="box narrow" onSubmit={save}>
      {SETTINGS.map(([k, label, type]) => (
        <label key={k}>{label}
          {k === 'consentPrivacyText' && <span className="muted block">Shown next to checkbox 1 on sign-up. <code>{'{{clubName}}'}</code> is replaced automatically. Required - members can't sign up without accepting it.</span>}
          {k === 'consentMarketingText' && <span className="muted block">Shown next to checkbox 2 on sign-up. <code>{'{{clubName}}'}</code> is replaced automatically. Optional - members can still sign up if they leave it unchecked.</span>}
          {type === 'textarea' ? <textarea rows={k.startsWith('consent') ? 3 : 6} value={v[k] ?? ''} onChange={(e) => setV({ ...v, [k]: e.target.value })} />
            : type === 'image' ? <>{v[k] && <img className="thumb" src={v[k]} alt="" />}<input type="file" accept="image/*" onChange={(e) => img(k, e.target.files[0])} />
              {v[k] && <button type="button" className="link dark" onClick={() => setV({ ...v, [k]: '' })}>Remove image</button>}</>
            : <input type={type} value={v[k] ?? ''} onChange={(e) => setV({ ...v, [k]: e.target.value })} />}
        </label>
      ))}
      {msg && <p className="ok">{msg}</p>}
      <button className="btn">Save settings</button>
    </form>
  );
}
