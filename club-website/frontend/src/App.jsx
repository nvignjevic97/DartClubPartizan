import { useEffect, useState } from 'react';
import { Routes, Route, NavLink, Link, Navigate, Outlet, useLocation } from 'react-router-dom';
import { api } from './api.js';
import { useAuth } from './auth.jsx';
import { ConfigCtx } from './config.js';
import Sidebar from './components/Sidebar.jsx';
import Home from './pages/Home.jsx';
import NewsPage from './pages/NewsPage.jsx';
import About from './pages/About.jsx';
import Login from './pages/Login.jsx';
import ResetPassword from './pages/ResetPassword.jsx';
import Account from './pages/Account.jsx';
import Admin from './pages/Admin.jsx';


function PublicLayout() {
  return (
    <div className="page">
      <main><Outlet /></main>
      <Sidebar />
    </div>
  );
}

function Guard({ admin, children }) {
  const { user, isAdmin } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (admin && !isAdmin) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  const [config, setConfig] = useState({});
  const [navOpen, setNavOpen] = useState(false);
  const { user, logout, isAdmin } = useAuth();
  const location = useLocation();

  useEffect(() => { api.get('/config').then(setConfig).catch(() => {}); }, []);
  // Closes the mobile nav dropdown whenever the person navigates somewhere, so it never stays
  // open over the next page.
  useEffect(() => { setNavOpen(false); }, [location.pathname]);
  useEffect(() => {
    if (config.accentColor) document.documentElement.style.setProperty('--accent', config.accentColor);
    if (config.clubName) document.title = config.clubName;
    const desc = config.tagline || config.aboutText;
    if (desc) {
      const text = desc.length > 160 ? desc.slice(0, 157) + '…' : desc;
      document.querySelectorAll('meta[name="description"], meta[property="og:description"]')
        .forEach((el) => el.setAttribute('content', text));
    }
    if (config.clubName) {
      document.querySelectorAll('meta[property="og:title"], meta[property="og:site_name"]')
        .forEach((el) => el.setAttribute('content', config.clubName));
    }
  }, [config]);

  return (
    <ConfigCtx.Provider value={{ ...config, reload: () => api.get('/config').then(setConfig) }}>
      <header className="top">
        <div className="wrap bar">
          <div className="bar-main">
            <Link to="/" className="brand">
              {config.logoUrl ? <img src={config.logoUrl} alt="" /> : <span className="crest">{(config.clubName || '?').charAt(0)}</span>}
              <span>{config.clubName}</span>
            </Link>
            <button type="button" className={'nav-toggle' + (navOpen ? ' open' : '')} aria-label={navOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={navOpen} onClick={() => setNavOpen((o) => !o)}>
              <span /><span /><span />
            </button>
            <nav className={navOpen ? 'open' : ''}>
              <NavLink to="/" end>Home</NavLink>
              <NavLink to="/news">News</NavLink>
              <NavLink to="/about">About us</NavLink>
              {user && <NavLink to="/account">My subscription</NavLink>}
              {isAdmin && <NavLink to="/admin">Admin</NavLink>}
              {user ? <button className="link" onClick={logout}>Log out</button> : <NavLink to="/login">Log in</NavLink>}
            </nav>
          </div>
        </div>
      </header>

      <div className="wrap">
        <Routes>
          <Route element={<PublicLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/news" element={<NewsPage />} />
            <Route path="/news/:id" element={<NewsPage />} />
            <Route path="/about" element={<About />} />
          </Route>
          <Route path="/login" element={<Login />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/account" element={<Guard><Account /></Guard>} />
          <Route path="/admin" element={<Guard admin><Admin /></Guard>} />
        </Routes>
      </div>

      <footer className="foot">
        <div className="wrap">{config.footerText} {config.contactEmail && <> · <a href={'mailto:' + config.contactEmail}>{config.contactEmail}</a></>}</div>
      </footer>
    </ConfigCtx.Provider>
  );
}
