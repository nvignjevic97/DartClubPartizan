import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, fmtDate } from '../api.js';
import { useLang } from '../i18n/index.jsx';

export default function NewsPage() {
  const { id } = useParams();
  const { t } = useLang();
  const [items, setItems] = useState([]);
  useEffect(() => { api.get(id ? `/news/${id}` : '/news').then((r) => setItems(id ? [r] : r)).catch(() => setItems([])); }, [id]);

  return (
    <>
      <h2 className="sec">{id ? t('news.news') : t('news.allNews')}</h2>
      {id && <p><Link to="/news">{t('news.backToAll')}</Link></p>}
      {items.map((n) => (
        <article className={id ? 'full' : 'card'} key={n.id}>
          {n.imageUrl && <img src={n.imageUrl} alt="" />}
          <div>
            <h3>{id ? n.title : <Link to={`/news/${n.id}`}>{n.title}</Link>}</h3>
            <div className="muted">{fmtDate(n.createdAt)}</div>
            <p className="prewrap">{id || n.content.length < 200 ? n.content : n.content.slice(0, 200) + '…'}</p>
          </div>
        </article>
      ))}
    </>
  );
}
