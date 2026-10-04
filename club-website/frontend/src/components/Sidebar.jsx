import { useEffect, useState } from 'react';
import { api, fmtDate } from '../api.js';

export default function Sidebar() {
  const [next, setNext] = useState([]);
  const [past, setPast] = useState([]);
  const [table, setTable] = useState([]);

  useEffect(() => {
    api.get('/matches/upcoming').then((l) => setNext(l.slice(0, 5))).catch(() => {});
    api.get('/matches/results').then((l) => setPast(l.slice(0, 5))).catch(() => {});
    api.get('/standings').then(setTable).catch(() => {});
  }, []);

  return (
    <aside>
      <section className="box">
        <h3>Next matches</h3>
        {next.length === 0 && <p className="muted">No matches scheduled.</p>}
        {next.map((m) => (
          <div className="match" key={m.id}>
            <div className="teams">{m.homeTeam} <span>vs</span> {m.awayTeam}</div>
            <div className="muted">{fmtDate(m.kickoff)}{m.venue && ' · ' + m.venue}</div>
          </div>
        ))}
      </section>

      <section className="box">
        <h3>Latest results</h3>
        {past.length === 0 && <p className="muted">No results yet.</p>}
        {past.map((m) => (
          <div className="match" key={m.id}>
            <div className="teams">{m.homeTeam} <b className="score">{m.homeScore} : {m.awayScore}</b> {m.awayTeam}</div>
            <div className="muted">{fmtDate(m.kickoff)}</div>
          </div>
        ))}
      </section>

      <section className="box">
        <h3>League table</h3>
        {table.length === 0 ? <p className="muted">Table is empty.</p> : (
          <table className="tbl">
            <thead><tr><th>#</th><th>Team</th><th>W</th><th>L</th><th>Pts</th></tr></thead>
            <tbody>
              {table.map((s, i) => (
                <tr key={s.id}>
                  <td><span className={'rank' + (i < 3 ? ' top' : '')}>{i + 1}</span></td><td>{s.team}</td><td>{s.won}</td><td>{s.lost}</td>
                  <td><b>{s.points}</b></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </aside>
  );
}
