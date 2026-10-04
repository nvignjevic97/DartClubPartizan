import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, fmtDate } from '../api.js';
import { useConfig } from '../config.js';

export default function Home() {
  const cfg = useConfig();
  const [news, setNews] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [active, setActive] = useState(0);
  useEffect(() => { api.get('/news').then((l) => setNews(l.slice(0, 5))).catch(() => {}); }, []);
  useEffect(() => { api.get('/hero-images').then(setPhotos).catch(() => {}); }, []);
  useEffect(() => {
    if (photos.length < 2) return;
    const t = setInterval(() => setActive((i) => (i + 1) % photos.length), 5000);
    return () => clearInterval(t);
  }, [photos.length]);

  return (
    <>
      <section className="hero" style={!photos.length && cfg.heroImageUrl ? { backgroundImage: `linear-gradient(rgba(0,0,0,.55),rgba(0,0,0,.55)), url(${cfg.heroImageUrl})` } : undefined}>
        {photos.map((p, i) => (
          <div key={p.id} className={'hero-bg' + (i === active ? ' show' : '')} style={{ backgroundImage: `url(${p.url})` }} />
        ))}
        {photos.length > 0 && <div className="hero-dim" />}
        <h1>{cfg.clubName}</h1>
        <p>{cfg.tagline}</p>
        {photos.length > 1 && (
          <div className="hero-dots">
            {photos.map((p, i) => (
              <button key={p.id} type="button" className={i === active ? 'on' : ''} aria-label={`Photo ${i + 1}`} onClick={() => setActive(i)} />
            ))}
          </div>
        )}
      </section>

      <h2 className="sec">Latest news</h2>
      {news.length === 0 && <p className="muted">No news posted yet.</p>}
      {news.map((n) => (
        <article className="card" key={n.id}>
          {n.imageUrl && <img src={n.imageUrl} alt="" />}
          <div>
            <h3><Link to={`/news/${n.id}`}>{n.title}</Link></h3>
            <div className="muted">{fmtDate(n.createdAt)}</div>
            <p>{n.content.length > 200 ? n.content.slice(0, 200) + '…' : n.content}</p>
          </div>
        </article>
      ))}
    </>
  );
}
