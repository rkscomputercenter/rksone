import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle, Phone, MapPin, Mail, Clock, ArrowUpRight } from 'lucide-react';
import { RksOneLogo, RksOneMark } from '../components/brand/Logo';

const PHONE = '9942891322';
const EMAIL = 'rksxerox@gmail.com';
const WHATSAPP = `https://wa.me/91${PHONE}`;
const MAPS = 'https://share.google/HjYj0vXmUT6mbV8ev';

// Monday–Saturday 8:00–19:00 IST, closed on Sunday
const OPEN_MIN = 8 * 60;
const CLOSE_MIN = 19 * 60;
const DAY = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const SERVICES: Array<{ name: string; ta: string; note: string }> = [
  { name: 'Xerox and printing', ta: 'ஜெராக்ஸ் & பிரிண்டிங்', note: 'Black and white, colour and photo prints' },
  { name: 'Government certificates', ta: 'அரசு சான்றிதழ்கள்', note: 'Income, community, birth and e-Sevai forms' },
  { name: 'Aadhaar and PAN', ta: 'ஆதார் & பான்', note: 'New cards and corrections' },
  { name: 'Lamination and binding', ta: 'லேமினேஷன் & பைண்டிங்', note: 'Spiral binding, ID and A4 lamination' },
  { name: 'ID and visiting cards', ta: 'ஐடி & விசிட்டிங் கார்டு', note: 'Cards, flex and banner prints' },
  { name: 'Typing', ta: 'டைப்பிங்', note: 'English and Tamil, fast and accurate' },
  { name: 'Scanning and email', ta: 'ஸ்கேன் & இமெயில்', note: 'High-resolution scans, sent where you need them' },
  { name: 'Internet and online help', ta: 'இணைய சேவை', note: 'Browsing and help with online applications' },
];

/** "Open now" or when it opens next, by the clock in India. */
function shopStatus(now = new Date()) {
  const ist = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const day = ist.getDay();
  const min = ist.getHours() * 60 + ist.getMinutes();
  if (day !== 0 && min >= OPEN_MIN && min < CLOSE_MIN) {
    return { open: true, text: 'Open now', sub: CLOSE_MIN - min <= 60 ? 'Closes soon, at 7 pm' : 'Until 7 pm today' };
  }
  if (day !== 0 && min < OPEN_MIN) return { open: false, text: 'Closed now', sub: 'Opens today at 8 am' };
  let next = (day + 1) % 7;
  if (next === 0) next = 1; // closed on Sunday
  return { open: false, text: 'Closed now', sub: `Opens ${next === (day + 1) % 7 ? 'tomorrow' : 'on ' + DAY[next]} at 8 am` };
}

export default function LandingPage() {
  const [status, setStatus] = useState(shopStatus);

  useEffect(() => {
    const timer = setInterval(() => setStatus(shopStatus()), 60_000);
    document.title = 'RKS Xerox & Computer Center, Harur';
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="shop">
      <div className="shop-night">
      <header className="shop-top">
        <div className="shop-wrap shop-top-inner">
          <a href="#top" className="shop-top-name">RKS Xerox &amp; Computer Center</a>
          <nav className="shop-nav" aria-label="Page">
            <a href="#services">Services</a>
            <a href="#visit">Visit</a>
          </nav>
          <Link to="/login" className="shop-staff">
            <RksOneMark size={22} /> Staff sign in
          </Link>
        </div>
      </header>

        <section id="top" className="shop-hero shop-wrap">
          <div className="shop-hero-text">
            <div className="shop-logo"><RksOneLogo height={104} glow /></div>
            <p className="shop-where">Opposite Taluk Office, Harur</p>
            <h1 className="shop-name">RKS Xerox<br />&amp; Computer Center</h1>
            <p className="shop-what">
              Printing, photocopies, online forms, browsing, typing and computer services, all at one counter.
            </p>
            <p className="shop-what-ta" lang="ta">ஜெராக்ஸ், பிரிண்டிங், அரசு சான்றிதழ்கள், ஆதார் மற்றும் ஆன்லைன் விண்ணப்பங்கள்.</p>
            <div className="shop-actions">
              <a href={WHATSAPP} target="_blank" rel="noreferrer" className="btn btn-lg shop-btn-whatsapp">
                <MessageCircle size={19} /> WhatsApp us
              </a>
              <a href={`tel:+91${PHONE}`} className="btn btn-lg btn-ghost"><Phone size={18} /> Call {PHONE}</a>
            </div>
          </div>

          <aside className="slip shop-slip" id="visit" aria-labelledby="visit-title">
            <div className="slip-head">
              <div>
                <h2 id="visit-title" className="slip-title">Visit us</h2>
                <div className="slip-meta">Opposite Taluk Office, Harur, Tamil Nadu 636903</div>
              </div>
              <div className={`shop-status ${status.open ? 'is-open' : 'is-closed'}`} aria-live="polite">
                <span className="dot" aria-hidden="true" />
                <span>{status.text}</span>
              </div>
            </div>
            <div className="slip-line"><span>Monday to Saturday</span><span className="num" style={{ color: 'var(--graphite)', fontWeight: 600 }}>8 am to 7 pm</span></div>
            <div className="slip-line"><span>Sunday</span><span style={{ color: 'var(--graphite)', fontWeight: 600 }}>Closed</span></div>
            <p className="text-sm text-muted" style={{ margin: '10px 0 16px' }}><Clock size={14} style={{ verticalAlign: '-2px' }} /> {status.sub}</p>
            <a href={MAPS} target="_blank" rel="noreferrer" className="btn btn-primary btn-full btn-lg"><MapPin size={18} /> Get directions</a>
            <a href={`mailto:${EMAIL}`} className="btn btn-ghost btn-full" style={{ marginTop: 8 }}><Mail size={16} /> {EMAIL}</a>
          </aside>
        </section>
      </div>

      <main>

        <section id="services" className="shop-wrap shop-services" aria-labelledby="services-title">
          <div className="shop-section-head">
            <h2 id="services-title" className="shop-h2">What we do</h2>
            <p className="text-muted">Ask at the counter for anything not listed here.</p>
          </div>
          <ul className="shop-list">
            {SERVICES.map(s => (
              <li key={s.name}>
                <div className="shop-list-name">{s.name}</div>
                <div className="shop-list-ta" lang="ta">{s.ta}</div>
                <div className="shop-list-note">{s.note}</div>
              </li>
            ))}
          </ul>
        </section>

        <section className="shop-wrap shop-about" aria-labelledby="about-title">
          <h2 id="about-title" className="shop-h2">About us</h2>
          <p>
            RKS Xerox and Computer Center is a one-stop shop for printing, scanning, lamination and a wide range of
            online computer services. We aim to be fast, reliable and affordable for your personal and business needs.
          </p>
        </section>
      </main>

      <footer className="shop-foot">
        <div className="shop-wrap shop-foot-inner">
          <div>
            <div className="shop-foot-name">RKS Xerox &amp; Computer Center</div>
            <address>Opposite Taluk Office, Harur, Tamil Nadu 636903</address>
            <div className="shop-foot-contact">
              <a href={`tel:+91${PHONE}`}>{PHONE}</a>
              <a href={`mailto:${EMAIL}`}>{EMAIL}</a>
            </div>
          </div>
          <nav className="shop-foot-links" aria-label="More">
            <Link to="/terms">Terms and rules</Link>
            <Link to="/developer">About the software</Link>
            <Link to="/login" className="shop-foot-staff">Staff sign in to RKS ONE <ArrowUpRight size={14} /></Link>
          </nav>
        </div>
      </footer>

      <style>{`
        .shop { min-height: 100vh; background: var(--paper); color: var(--graphite); }
        /* The night band: header and hero on the brand background, like sign-in and the menu */
        .shop-night { background: radial-gradient(110% 90% at 75% 20%, var(--night-1) 0%, var(--night-2) 55%, var(--night-3) 100%); color: var(--night-text); }
        .shop-night .shop-top { background: transparent; border-bottom-color: var(--night-line); }
        .shop-night .shop-top-name { color: var(--night-text); }
        .shop-night .shop-nav a { color: var(--night-muted); }
        .shop-night .shop-nav a:hover { background: var(--night-hover); color: var(--night-text); }
        .shop-night .shop-staff { color: var(--night-text); border-color: rgba(236, 234, 248, 0.25); }
        .shop-night .shop-staff:hover { border-color: rgba(236, 234, 248, 0.5); }
        .shop-logo { color: #fff; margin: 0 0 18px -14px; line-height: 0; }
        .shop-logo svg { max-width: 100%; height: auto; }
        .shop-night .shop-where { color: #C9B8FF; }
        .shop-night .shop-name { color: #fff; }
        .shop-night .shop-what { color: var(--night-muted); }
        .shop-night .shop-what-ta { color: var(--night-faint); }
        .shop-night .btn-ghost { background: transparent; color: var(--night-text); border-color: rgba(236, 234, 248, 0.28); }
        .shop-night .btn-ghost:hover { background: var(--night-hover); border-color: rgba(236, 234, 248, 0.5); }
        .shop-night .shop-slip .btn-ghost { background: var(--sheet); color: var(--graphite); border-color: var(--rule); }
        .shop-night .shop-slip { color: var(--graphite); box-shadow: 6px 6px 0 -1px #2A2466, 6px 6px 0 0 rgba(236, 234, 248, 0.12); }
        .shop-night .shop-slip::before { background: radial-gradient(circle at 7px 10px, var(--night-2) 3.2px, transparent 3.6px) 0 0 / 14px 10px repeat-x, var(--sheet); }
        .shop-wrap { max-width: 1160px; margin: 0 auto; padding: 0 24px; }
        .shop a { text-decoration: none; }

        .shop-top { position: sticky; top: 0; z-index: 10; background: var(--sheet); border-bottom: 1px solid var(--rule); padding-top: env(safe-area-inset-top, 0px); }
        .shop-top-inner { display: flex; align-items: center; gap: 20px; height: 60px; }
        .shop-top-name { font-weight: 700; font-stretch: 88%; font-size: var(--fs-lg); }
        .shop-nav { display: flex; gap: 4px; margin-left: auto; }
        .shop-nav a { padding: 6px 12px; border-radius: var(--radius-md); color: var(--graphite-2); font-weight: 550; }
        .shop-nav a:hover { background: var(--sheet-3); color: var(--graphite); }
        .shop-staff { display: inline-flex; align-items: center; gap: 8px; padding: 6px 12px 6px 6px; border: 1px solid var(--rule); border-radius: var(--radius-full); font-size: var(--fs-sm); font-weight: 600; }
        .shop-staff:hover { border-color: var(--graphite-3); }
        .shop-staff svg { border-radius: 6px; }

        .shop-hero { display: grid; grid-template-columns: minmax(0, 1.25fr) minmax(300px, 400px); gap: 56px; align-items: center; padding-top: 64px; padding-bottom: 72px; }
        .shop-where { font-size: var(--fs-md); font-weight: 600; color: var(--ink); margin-bottom: 14px; }
        .shop-name { font-size: clamp(44px, 7vw, 92px); font-weight: 700; font-stretch: 76%; line-height: 0.95; letter-spacing: -0.02em; margin-bottom: 24px; }
        .shop-what { font-size: var(--fs-xl); line-height: 1.45; color: var(--graphite-2); max-width: 30em; }
        .shop-what-ta { font-size: var(--fs-md); color: var(--graphite-3); margin-top: 8px; max-width: 36em; }
        .shop-actions { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 28px; }
        .shop-btn-whatsapp { background: #1F8F4E; color: #fff; }
        .shop-btn-whatsapp:hover { background: #18733F; }

        .shop-slip { margin: 0; }
        .shop-status { display: inline-flex; align-items: center; gap: 7px; font-size: var(--fs-sm); font-weight: 650; padding: 4px 10px; border-radius: var(--radius-full); white-space: nowrap; }
        .shop-status .dot { width: 8px; height: 8px; border-radius: 50%; background: currentColor; }
        .shop-status.is-open { background: var(--cash-wash); color: var(--cash); }
        .shop-status.is-closed { background: var(--stamp-wash); color: var(--stamp); }

        .shop-services { padding-top: 56px; padding-bottom: 56px; }
        .shop-section-head { display: flex; align-items: baseline; justify-content: space-between; gap: 16px; flex-wrap: wrap; margin-bottom: 18px; }
        .shop-h2 { font-size: var(--fs-3xl); font-weight: 650; font-stretch: 82%; letter-spacing: -0.01em; }
        .shop-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); column-gap: 48px; border-top: 2px solid var(--graphite); }
        .shop-list li { display: grid; grid-template-columns: 1fr auto; gap: 2px 16px; padding: 16px 0; border-bottom: 1px solid var(--rule); }
        .shop-list-name { font-size: var(--fs-lg); font-weight: 650; }
        .shop-list-ta { font-size: var(--fs-sm); color: var(--ink); align-self: center; text-align: right; }
        .shop-list-note { grid-column: 1 / -1; font-size: 14px; color: var(--graphite-3); }

        .shop-about { padding-top: 24px; padding-bottom: 72px; }
        .shop-about p { font-size: var(--fs-lg); line-height: 1.6; color: var(--graphite-2); max-width: 40em; margin-top: 12px; }

        .shop-foot { background: var(--sheet); border-top: 1px solid var(--rule); padding: 32px 0 calc(32px + env(safe-area-inset-bottom, 0px)); }
        .shop-foot-inner { display: flex; justify-content: space-between; gap: 32px; flex-wrap: wrap; }
        .shop-foot-name { font-weight: 700; font-stretch: 88%; font-size: var(--fs-lg); }
        .shop-foot address { font-style: normal; color: var(--graphite-3); margin-top: 2px; }
        .shop-foot-contact { display: flex; gap: 16px; margin-top: 10px; flex-wrap: wrap; }
        .shop-foot-contact a, .shop-foot-links a { color: var(--ink); font-weight: 600; }
        .shop-foot-links { display: flex; flex-direction: column; gap: 8px; align-items: flex-start; }
        .shop-foot-staff { display: inline-flex; align-items: center; gap: 4px; }

        @media (max-width: 860px) {
          .shop-hero { grid-template-columns: 1fr; gap: 36px; padding-top: 28px; padding-bottom: 40px; }
          .shop-logo svg { width: 250px; }
          .shop-list { grid-template-columns: 1fr; }
          .shop-nav { display: none; }
          .shop-top-name { font-size: var(--fs-md); }
          .shop-staff { margin-left: auto; }
        }
        @media (max-width: 480px) {
          .shop-wrap { padding: 0 16px; }
          .shop-actions .btn { flex: 1; }
          .shop-top-name { display: none; }
        }
      `}</style>
    </div>
  );
}
