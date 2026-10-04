import { useConfig } from '../config.js';

export default function About() {
  const cfg = useConfig();
  return (
    <>
      <h2 className="sec">About us</h2>
      <p className="prewrap lead">{cfg.aboutText}</p>
      {cfg.contactEmail && <p>Contact: <a href={'mailto:' + cfg.contactEmail}>{cfg.contactEmail}</a></p>}
    </>
  );
}
