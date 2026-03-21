import React from 'react';
import { ArrowRight, CalendarDays, MapPin, Sparkles, Trophy } from 'lucide-react';

type Props = {};

export const HeroSection: React.FC<Props> = () => {
  return (
    <section id="overview" className="mx-auto w-full max-w-[1320px] px-1 sm:px-5 lg:px-8 pt-3 pb-2 md:pt-5 md:pb-4">
      <div className="portal-front-hero portal-front-hero--premium portal-front-hero--welcome">
        <div className="portal-front-hero__content portal-front-hero__content--premium">
          <div className="portal-hero-badge" data-reveal="fade-up">
            <span className="portal-hero-badge__icon">
              <Sparkles size={14} />
            </span>
            <span>CEAS Presents</span>
          </div>

          <div className="portal-front-hero__copy" data-reveal="fade-up">
            <p className="portal-front-hero__wordmark">COGNOTSAV</p>
            <p className="portal-front-hero__kicker">Our Legacy</p>
            <h1 className="portal-front-hero__headline">
              <span className="portal-front-hero__headline-line">Where</span>
              <span className="portal-front-hero__headline-line">Engineering</span>
              <span className="portal-front-hero__headline-line">Meets</span>
              <span className="portal-front-hero__headline-line">
                <span>Excellence</span>
              </span>
            </h1>
            <p className="portal-front-hero__description">
              A premium campus tech experience where competitions, innovation, and CEAS culture come together in one
              focused platform built for participants, teams, and organizers.
            </p>
          </div>

          <div className="portal-front-hero__cta-row" data-reveal="fade-up">
            <a href="#registration-panel" className="portal-premium-button portal-premium-button--primary">
              Register Now
              <ArrowRight size={16} />
            </a>
            <a href="#timeline" className="portal-premium-button portal-premium-button--secondary">
              View Timeline
            </a>
          </div>

          <div className="portal-prize-pool-card" data-reveal="fade-up">
            <div className="portal-prize-pool-card__badge" aria-hidden="true">
              <Trophy size={20} />
            </div>
            <p className="portal-prize-pool-card__kicker">Total Prize Pool Distributed</p>
            <p className="portal-prize-pool-card__value">
              Over
              <br />
              <span>{'₹'}1,00,000</span>
            </p>
            <div className="portal-prize-pool-card__meta">
              <strong>Cash Rewards</strong>
              <span aria-hidden="true" />
              <strong>Participation Certificates</strong>
            </div>
          </div>

          <div className="portal-front-hero__meta" data-reveal="fade-up">
            <div className="portal-front-hero__meta-item">
              <CalendarDays size={15} />
              <span>07-08 April 2026</span>
            </div>
            <div className="portal-front-hero__meta-item">
              <MapPin size={15} />
              <span>Dr. Vithalrao Vikhe Patil COE, Ahilyanagar</span>
            </div>
          </div>
        </div>

        <div className="portal-front-hero__panel portal-front-hero__panel--premium" data-reveal="fade-up">
          <div className="portal-front-hero__visual-shell">
            <div className="portal-front-hero__visual-glow" aria-hidden="true" />
            <div className="portal-front-hero__visual-ring portal-front-hero__visual-ring--outer" aria-hidden="true" />
            <div className="portal-front-hero__visual-ring portal-front-hero__visual-ring--inner" aria-hidden="true" />
            <div className="portal-front-hero__visual-card portal-front-hero__visual-card--premium">
              <div className="portal-front-hero__visual-logo-frame">
                <img src="/images/ceasposter.jpeg" alt="CEAS COGNOTSAV crest" loading="eager" decoding="async" className="portal-front-hero__visual-image" />
              </div>
              <div className="portal-front-hero__visual-copy">
                <p className="portal-front-hero__visual-overline">Computer Engineering Association</p>
                <h2 className="portal-front-hero__visual-title">CEAS COGNOTSAV 2026</h2>
                <p className="portal-front-hero__visual-note">Premium registration portal for competitions, esports, and flagship showcases.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
