import { useEffect, useState } from 'react';
import { api, fmtDate } from '../api.js';
import { useLang } from '../i18n/index.jsx';

export default function Sidebar() {
  const [next, setNext] = useState([]);
  const [past, setPast] = useState([]);
  const [table, setTable] = useState([]);
  const { t } = useLang();

  useEffect(() => {
    api.get('/matches/upcoming').then((l) => setNext(l.slice(0, 5))).catch(() => {});
    api.get('/matches/results').then((l) => setPast(l.slice(0, 5))).catch(() => {});
    api.get('/standings').then(setTable).catch(() => {});
  }, []);

  return (
    <aside>
      <section className="box">
        <h3>{t('sidebar.nextMatches')}</h3>
        {next.length === 0 && <p className="muted">{t('sidebar.noMatches')}</p>}
        {next.map((m) => (
          <div className="match" key={m.id}>
            <div className="teams">{m.homeTeam} <span>{t('sidebar.vs')}</span> {m.awayTeam}</div>
            <div className="muted">{fmtDate(m.kickoff)}{m.venue && ' · ' + m.venue}</div>
          </div>
        ))}
      </section>

      <section className="box">
        <h3>{t('sidebar.latestResults')}</h3>
        {past.length === 0 && <p className="muted">{t('sidebar.noResults')}</p>}
        {past.map((m) => (
          <div className="match" key={m.id}>
            <div className="teams">{m.homeTeam} <b className="score">{m.homeScore} : {m.awayScore}</b> {m.awayTeam}</div>
            <div className="muted">{fmtDate(m.kickoff)}</div>
          </div>
        ))}
      </section>

      <section className="box">
        <h3>{t('sidebar.leagueTable')}</h3>
        {table.length === 0 ? <p className="muted">{t('sidebar.tableEmpty')}</p> : (
          <table className="tbl">
            <thead><tr><th>{t('sidebar.rank')}</th><th>{t('sidebar.team')}</th><th>{t('sidebar.won')}</th><th>{t('sidebar.lost')}</th><th>{t('sidebar.points')}</th></tr></thead>
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
