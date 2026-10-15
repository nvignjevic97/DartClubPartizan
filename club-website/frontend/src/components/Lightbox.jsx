import { useEffect } from 'react';

/** Full-size photo/video viewer, opened by clicking a thumbnail in the Gallery page or a news
 * article's extra photos. item: { type: 'PHOTO'|'VIDEO', url } or null (closed). */
export default function Lightbox({ item, onClose }) {
  useEffect(() => {
    if (!item) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [item, onClose]);

  if (!item) return null;
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal lightbox" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
        {item.type === 'VIDEO'
          ? <video src={item.url} controls autoPlay />
          : <img src={item.url} alt="" />}
      </div>
    </div>
  );
}
