import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useLang } from '../i18n/index.jsx';
import Lightbox from '../components/Lightbox.jsx';

export default function Gallery() {
  const { t } = useLang();
  const [items, setItems] = useState([]);
  const [tab, setTab] = useState('PHOTO');
  const [open, setOpen] = useState(null);
  useEffect(() => { api.get('/gallery').then(setItems).catch(() => {}); }, []);

  const shown = items.filter((i) => i.type === tab);

  return (
    <>
      <h2 className="sec">{t('gallery.title')}</h2>
      <div className="tabs">
        <button className={tab === 'PHOTO' ? 'on' : ''} onClick={() => setTab('PHOTO')}>{t('gallery.tabPhotos')}</button>
        <button className={tab === 'VIDEO' ? 'on' : ''} onClick={() => setTab('VIDEO')}>{t('gallery.tabVideos')}</button>
      </div>
      {shown.length === 0 && <p className="muted">{tab === 'PHOTO' ? t('gallery.noPhotos') : t('gallery.noVideos')}</p>}
      <div className="gallery-grid">
        {shown.map((item) => (
          tab === 'PHOTO'
            ? <img key={item.id} src={item.url} alt="" onClick={() => setOpen(item)} />
            : (
              <div key={item.id} className="video-thumb" onClick={() => setOpen(item)}>
                <video src={item.url} muted preload="metadata" />
                <span className="play-icon">▶</span>
              </div>
            )
        ))}
      </div>
      <Lightbox item={open} onClose={() => setOpen(null)} />
    </>
  );
}
