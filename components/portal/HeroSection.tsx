import React, { memo } from 'react';
import { ArrowRight, CalendarDays, MapPin, Trophy } from 'lucide-react';

type Props = {};

const heroLinks = [
  { href: '#overview', label: 'Home' },
  { href: '#registration-panel', label: 'Competitions' },
  { href: '#tracker', label: 'Tracker' },
  { href: '#timeline', label: 'Timeline' },
];

export const HeroSection: React.FC<Props> = memo(() => {
  return (
    <section id="overview" className="mx-auto w-full max-w-[1320px] px-1 pt-0 pb-2 sm:px-5 lg:px-8 md:pt-0 md:pb-4">
      <div className="portal-summit-hero">
        <div className="portal-summit-hero__rail">
          <a href="#overview" className="portal-summit-hero__brand" aria-label="CEAS home">
            <span className="portal-summit-hero__brand-badge">
              <img
                src="/images/ceasposter.jpeg"
                alt="CEAS logo"
                loading="eager"
                decoding="async"
                className="portal-summit-hero__brand-image"
              />
            </span>
            <span className="portal-summit-hero__brand-copy">
              <span className="portal-summit-hero__brand-kicker">Computer Engineering Association of Students</span>
              <span className="portal-summit-hero__brand-title">CEAS</span>
            </span>
          </a>

          <nav className="portal-summit-hero__nav" aria-label="Hero shortcuts">
            {heroLinks.map((link) => (
              <a key={link.href} href={link.href} className="portal-summit-hero__nav-link">
                {link.label}
              </a>
            ))}
          </nav>

          <a href="#registration-panel" className="portal-summit-hero__rail-cta">
            Register
            <ArrowRight size={15} />
          </a>
        </div>

        <div className="portal-summit-hero__content" data-reveal="fade-up">
          <p className="portal-summit-hero__eyebrow">CEAS Presents</p>
          <h1 className="portal-summit-hero__title">COGNOTSAV 2026</h1>
          <p className="portal-summit-hero__subtitle">A State-Level Technical &amp; Esports Event</p>
          <p className="portal-summit-hero__description">
            Where ideas turn into impact through competitions, esports &amp; innovation.
          </p>

          <div className="portal-summit-hero__actions">
            <a href="#registration-panel" className="portal-summit-hero__action portal-summit-hero__action--primary">
              Register Now
            </a>
            <a href="#registration-panel" className="portal-summit-hero__action portal-summit-hero__action--ghost">
              Explore Events
              <ArrowRight size={15} />
            </a>
          </div>

          <div className="portal-summit-hero__prize-card" data-reveal="fade-up">
            <div className="portal-summit-hero__prize-icon" aria-hidden="true">
              <Trophy size={34} />
            </div>
            <div className="portal-summit-hero__prize-copy">
              <h2 className="portal-summit-hero__prize-title">&#8377;1,00,000 Prize Pool</h2>
              <div className="portal-summit-hero__prize-meta">
                <div className="portal-summit-hero__prize-meta-item">
                  <CalendarDays size={16} />
                  <span>7-8 April 2026</span>
                </div>
                <div className="portal-summit-hero__prize-meta-item">
                  <MapPin size={16} />
                  <span>Ahilyanagar</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
});
