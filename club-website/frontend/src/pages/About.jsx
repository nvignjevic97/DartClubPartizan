import { useEffect, useState } from 'react';
import { useConfig } from '../config.js';
import { useLang } from '../i18n/index.jsx';
import { api } from '../api.js';

export default function About() {
  const { t } = useLang();
  const [tab, setTab] = useState('about');

  return (
    <div>
      <div className="tabs">
        <button className={tab === 'about' ? 'on' : ''} onClick={() => setTab('about')}>{t('about.tabAbout')}</button>
        <button className={tab === 'founders' ? 'on' : ''} onClick={() => setTab('founders')}>{t('about.tabFounders')}</button>
        <button className={tab === 'statute' ? 'on' : ''} onClick={() => setTab('statute')}>{t('about.tabStatute')}</button>
      </div>
      {tab === 'about' && <AboutUs />}
      {tab === 'founders' && <Founders />}
      {tab === 'statute' && <Statute />}
    </div>
  );
}

function AboutUs() {
  const cfg = useConfig();
  const { t } = useLang();
  return (
    <>
      <h2 className="sec">{t('about.tabAbout')}</h2>
      <p className="prewrap lead">{cfg.aboutText}</p>
      {cfg.contactEmail && <p>{t('about.contact')}: <a href={'mailto:' + cfg.contactEmail}>{cfg.contactEmail}</a></p>}
    </>
  );
}

function Founders() {
  const { t } = useLang();
  const [rows, setRows] = useState([]);
  useEffect(() => { api.get('/founders').then(setRows).catch(() => {}); }, []);
  return (
    <>
      <h2 className="sec">{t('about.tabFounders')}</h2>
      {rows.length === 0 && <p className="muted">{t('about.noFounders')}</p>}
      <div className="founders-grid">
        {rows.map((f) => (
          <div className="founder-card" key={f.id}>
            {f.imageUrl && <img src={f.imageUrl} alt="" />}
            <h3>{f.name}</h3>
            {f.text && <p className="prewrap">{f.text}</p>}
          </div>
        ))}
      </div>
    </>
  );
}

function Statute() {
  const cfg = useConfig();
  const { t } = useLang();
  return (
    <>
      <h2 className="sec">{t('about.tabStatute')}</h2>
      <p className="prewrap lead">{cfg.statuteText || t('about.statuteIntroEmpty')}</p>
      {cfg.statuteDocumentUrl
        ? <p><a className="btn" href={cfg.statuteDocumentUrl} target="_blank" rel="noreferrer">{t('about.downloadStatute')}{cfg.statuteDocumentName ? ' (' + cfg.statuteDocumentName + ')' : ''}</a></p>
        : <p className="muted">{t('about.noStatuteFile')}</p>}
    </>
  );
}
