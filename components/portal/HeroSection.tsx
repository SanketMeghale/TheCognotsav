import React, { memo } from 'react';
import { ArrowRight, CalendarDays, MapPin, Sparkles, Trophy } from 'lucide-react';

type Props = {};

export const HeroSection: React.FC<Props> = memo(() => {
  return (
    <section id="overview" className="mx-auto w-full max-w-[1320px] px-1 pt-3 pb-2 sm:px-5 lg:px-8 md:pt-5 md:pb-4">
      <div className="portal-front-hero portal-front-hero--premium portal-front-hero--editorial">
        <div className="portal-front-hero__main portal-front-hero__main--editorial">
          <div className="portal-front-hero__content portal-front-hero__content--premium portal-front-hero__content--editorial">
            <div className="portal-hero-badge portal-hero-badge--editorial" data-reveal="fade-up">
              <span className="portal-hero-badge__icon">
                <Sparkles size={14} />
              </span>
              <span>CEAS Presents</span>
            </div>

            <div className="portal-front-hero__copy portal-front-hero__copy--editorial" data-reveal="fade-up">
              <p className="portal-front-hero__wordmark">COGNOTSAV 2026</p>
              <h1 className="portal-front-hero__headline portal-front-hero__headline--editorial">
                <span className="portal-front-hero__headline-line">Engineering.</span>
                <span className="portal-front-hero__headline-line">Innovation.</span>
                <span className="portal-front-hero__headline-line">Competition.</span>
              </h1>
              <p className="portal-front-hero__description portal-front-hero__description--editorial">
                Where ideas turn into impact through competitions, esports, and innovation on a sharp CEAS campus
                tech culture.
              </p>
            </div>

            <div className="portal-front-hero__cta-stack" data-reveal="fade-up">
              <a href="#registration-panel" className="portal-register-cta portal-register-cta--hero">
                Register Now
                <ArrowRight size={16} />
              </a>
              <a href="#registration-panel" className="portal-front-hero__inline-link">
                Explore Events
                <ArrowRight size={15} />
              </a>
            </div>

            <div className="portal-prize-pool-card portal-prize-pool-card--editorial" data-reveal="fade-up">
              <div className="portal-prize-pool-card__header">
                <div className="portal-prize-pool-card__badge" aria-hidden="true">
                  <Trophy size={18} />
                </div>
                <p className="portal-prize-pool-card__kicker">Prize Pool</p>
              </div>
              <p className="portal-prize-pool-card__value">
                <span>Up to &#8377;1,00,000</span>
              </p>
            </div>

            <div className="portal-front-hero__fact-list" data-reveal="fade-up">
              <div className="portal-front-hero__fact-item">
                <CalendarDays size={16} />
                <span>7-8 April 2026</span>
              </div>
              <div className="portal-front-hero__fact-item">
                <MapPin size={16} />
                <span>Ahilyanagar</span>
              </div>
            </div>

            <div className="portal-front-hero__section-rule" aria-hidden="true" />

            <a href="#registration-panel" className="portal-front-hero__inline-link portal-front-hero__inline-link--secondary" data-reveal="fade-up">
              Explore Events
              <ArrowRight size={15} />
            </a>
          </div>

          <div className="portal-front-hero__panel portal-front-hero__panel--premium portal-front-hero__panel--editorial" data-reveal="fade-up">
            <div className="portal-front-hero__visual-card portal-front-hero__visual-card--editorial">
              <div className="portal-front-hero__visual-aura" aria-hidden="true" />
              <div className="portal-front-hero__visual-logo-frame portal-front-hero__visual-logo-frame--editorial">
                <img
                  src="/images/ceasposter.jpeg"
                  alt="CEAS COGNOTSAV crest"
                  loading="eager"
                  decoding="async"
                  className="portal-front-hero__visual-image"
                />
              </div>
              <div className="portal-front-hero__visual-copy portal-front-hero__visual-copy--editorial">
                <p className="portal-front-hero__visual-overline">Computer Engineering Association</p>
                <h2 className="portal-front-hero__visual-title">COGNOTSAV 2026</h2>
                <p className="portal-front-hero__visual-note">Premium event registration portal</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
});
