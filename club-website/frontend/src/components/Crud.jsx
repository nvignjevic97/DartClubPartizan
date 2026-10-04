import { useEffect, useState } from 'react';
import { api } from '../api.js';

/**
 * Generic admin editor: list + create/edit form.
 * fields: [{ name, label, type: text|textarea|number|datetime|image }]
 * listPath: public GET path; adminPath: base path for POST/PUT/DELETE.
 */
export default function Crud({ title, listPath, adminPath, fields, summary }) {
  const empty = Object.fromEntries(fields.map((f) => [f.name, f.type === 'number' ? 0 : '']));
  const [rows, setRows] = useState([]);
  const [item, setItem] = useState(empty);
  const [err, setErr] = useState('');

  const load = () => api.get(listPath).then(setRows).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, []);

  const set = (k, v) => setItem({ ...item, [k]: v });

  async function uploadImage(k, file) {
    if (!file) return;
    const form = new FormData(); form.append('file', file);
    try { const r = await api.upload('/admin/assets', form); set(k, r.url); } catch (e) { setErr(e.message); }
  }

  async function save(e) {
    e.preventDefault(); setErr('');
    const body = { ...item };
    fields.forEach((f) => {
      if (f.type === 'number') body[f.name] = Number(body[f.name]);
      if (f.optionalNumber) body[f.name] = body[f.name] === '' || body[f.name] == null ? null : Number(body[f.name]);
      if (f.type === 'datetime' && body[f.name]) body[f.name] = body[f.name].slice(0, 16);
    });
    try {
      if (item.id) await api.put(`${adminPath}/${item.id}`, body); else await api.post(adminPath, body);
      setItem(empty); load();
    } catch (ex) { setErr(ex.message); }
  }

  async function remove(id) {
    if (!confirm('Delete this item?')) return;
    await api.del(`${adminPath}/${id}`); load();
  }

  return (
    <div className="split">
      <form className="box" onSubmit={save}>
        <h3>{item.id ? 'Edit' : 'Add'} {title}</h3>
        {fields.map((f) => (
          <label key={f.name}>{f.label}
            {f.type === 'textarea' ? <textarea rows={6} value={item[f.name] ?? ''} onChange={(e) => set(f.name, e.target.value)} required={!f.optionalNumber} />
              : f.type === 'image' ? (
                <>
                  {item[f.name] && <img className="thumb" src={item[f.name]} alt="" />}
                  <input type="file" accept="image/*" onChange={(e) => uploadImage(f.name, e.target.files[0])} />
                </>
              ) : <input type={f.type === 'datetime' ? 'datetime-local' : f.type === 'number' || f.optionalNumber ? 'number' : 'text'}
                  value={item[f.name] ?? ''} onChange={(e) => set(f.name, e.target.value)} required={!f.optional && !f.optionalNumber} />}
          </label>
        ))}
        {err && <p className="err">{err}</p>}
        <div className="row">
          <button className="btn">Save</button>
          {item.id && <button type="button" className="btn ghost" onClick={() => setItem(empty)}>Cancel</button>}
        </div>
      </form>
      <div>
        {rows.length === 0 && <p className="muted">Nothing here yet.</p>}
        {rows.map((r) => (
          <div className="listrow" key={r.id}>
            <span>{summary(r)}</span>
            <span className="row">
              <button className="link dark" onClick={() => setItem(r)}>Edit</button>
              <button className="link dark" onClick={() => remove(r.id)}>Delete</button>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
