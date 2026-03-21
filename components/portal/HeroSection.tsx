import React, { useMemo, useRef } from 'react';
import { ArrowRight, CalendarDays, MapPin, Sparkles } from 'lucide-react';

type Props = {};

export const HeroSection: React.FC<Props> = () => {
  const visualShellRef = useRef<HTMLDivElement | null>(null);
  const particles = useMemo(
    () =>
      Array.from({ length: 20 }, (_, index) => ({
        id: index,
        left: `${6 + ((index * 17) % 88)}%`,
        top: `${8 + ((index * 23) % 80)}%`,
        size: `${4 + (index % 4) * 2}px`,
        delay: `${(index % 6) * 0.7}s`,
        duration: `${10 + (index % 5) * 2}s`,
      })),
    [],
  );

  const handleTiltMove = (event: React.MouseEvent<HTMLDivElement>) => {
    const shell = visualShellRef.current;
    if (!shell || typeof window === 'undefined' || !window.matchMedia('(pointer: fine)').matches) {
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const offsetX = (event.clientX - rect.left) / rect.width - 0.5;
    const offsetY = (event.clientY - rect.top) / rect.height - 0.5;
    shell.style.transform = `perspective(1400px) rotateX(${(-offsetY * 10).toFixed(2)}deg) rotateY(${(offsetX * 12).toFixed(2)}deg)`;
  };

  const resetTilt = () => {
    if (visualShellRef.current) {
      visualShellRef.current.style.transform = 'perspective(1400px) rotateX(0deg) rotateY(0deg)';
    }
  };

  return (
    <section id="overview" className="mx-auto w-full max-w-[1320px] px-1 sm:px-5 lg:px-8 pt-3 pb-2 md:pt-5 md:pb-4">
      <div className="portal-front-hero portal-front-hero--premium">
        <div className="portal-front-hero__particles" aria-hidden="true">
          {particles.map((particle) => (
            <span
              key={particle.id}
              className="portal-front-hero__particle"
              style={{
                left: particle.left,
                top: particle.top,
                width: particle.size,
                height: particle.size,
                animationDelay: particle.delay,
                animationDuration: particle.duration,
              }}
            />
          ))}
        </div>

        <div className="portal-front-hero__content portal-front-hero__content--premium">
          <div className="portal-hero-badge" data-reveal="fade-up">
            <span className="portal-hero-badge__icon">
              <Sparkles size={14} />
            </span>
            <span>CEAS Presents</span>
          </div>

          <div className="portal-front-hero__copy" data-reveal="fade-up">
            <h1 className="portal-front-hero__headline">
              Where Engineering
              <br />
              Meets <span>Excellence</span>
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
          <div
            ref={visualShellRef}
            className="portal-front-hero__visual-shell"
            onMouseMove={handleTiltMove}
            onMouseLeave={resetTilt}
          >
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
