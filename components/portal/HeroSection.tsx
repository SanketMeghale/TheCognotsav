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
              <a href="#registration-panel" className="portal-front-hero__ghost-cta">
                Explore Events
                <ArrowRight size={15} />
              </a>
            </div>

            <div className="portal-prize-pool-card portal-prize-pool-card--editorial" data-reveal="fade-up">
              <div className="portal-prize-pool-card__hero">
                <div className="portal-prize-pool-card__badge portal-prize-pool-card__badge--editorial" aria-hidden="true">
                  <Trophy size={22} />
                </div>
                <div className="portal-prize-pool-card__copy">
                  <p className="portal-prize-pool-card__kicker">Prize Pool</p>
                  <p className="portal-prize-pool-card__value">
                    <span>Up to &#8377;1,00,000</span>
                  </p>
                  <div className="portal-prize-pool-card__meta portal-prize-pool-card__meta--editorial">
                    <strong>Cash Rewards</strong>
                    <span aria-hidden="true" />
                    <strong>Participation Certificates</strong>
                  </div>
                </div>
              </div>
              <div className="portal-prize-pool-card__footer">
                <div className="portal-prize-pool-card__fact">
                  <CalendarDays size={18} />
                  <div>
                    <strong>07 - 08 April 2026</strong>
                    <span>Event Dates.</span>
                  </div>
                </div>
                <div className="portal-prize-pool-card__fact">
                  <MapPin size={18} />
                  <div>
                    <strong>Dr. Vithalrao Vikhe Patil COE</strong>
                    <span>Ahilyanagar</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="portal-front-hero__visual-card portal-front-hero__visual-card--editorial" data-reveal="fade-up">
              <div className="portal-front-hero__visual-aura" aria-hidden="true" />
              <div className="portal-front-hero__visual-logo-frame portal-front-hero__visual-logo-frame--editorial">
                <img
                  src="/images/ceas-hero-emblem.png"
                  alt="CEAS COGNOTSAV crest"
                  loading="eager"
                  decoding="async"
                  className="portal-front-hero__visual-image portal-front-hero__visual-image--editorial"
                />
              </div>
              <div className="portal-front-hero__visual-copy portal-front-hero__visual-copy--editorial">
                <p className="portal-front-hero__visual-overline">Computer Engineering Association</p>
                <h2 className="portal-front-hero__visual-title">
                  <span>COGNOTSAV</span>
                  <span>2026</span>
                </h2>
              </div>
            </div>            
          </div>
        </div>
      </div>
    </section>
  );
});
