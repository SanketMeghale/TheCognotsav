import React from 'react';
import { Instagram, Mail, MapPin, Phone } from 'lucide-react';
import { shellClassName } from './utils';

const FOOTER_QR_URL = 'https://res.cloudinary.com/dkxddhawc/image/upload/v1774197848/My_QR_Code_1-1024_dhiqjw.png';

export const PortalFooter: React.FC = () => {
  return (
    <footer className="portal-site-footer pb-14 pt-5 md:pb-20 md:pt-6">
      <div className={shellClassName}>
        <div className="portal-footer-shell">
          <div className="portal-footer-grid">
            <section className="portal-footer-card portal-footer-card--brand">
              <div className="portal-footer-lockup">
                <div className="portal-footer-lockup__frame">
                  <img src="/images/ceasposter.jpeg" alt="CEAS logo" className="portal-footer-lockup__image" />
                </div>
                <div>
                  <p className="portal-footer-lockup__overline">Computer Engineering Association of Students</p>
                  <p className="portal-footer-brand-title">
                    CEAS<span>/COGNOTSAV</span>
                  </p>
                  <p className="portal-footer-lockup__meta">Dr. Vithalrao Vikhe Patil College of Engineering, Ahilyanagar</p>
                </div>
              </div>
              <p className="portal-footer-description">
                Empowering innovators and shaping the future of technology through collaborative excellence and competitive spirit.
              </p>
              <div className="portal-footer-socials">
                <a
                  href="https://www.instagram.com/dvvp_computer_dept?igsh=a25ieGxjb29lcWw3"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Instagram"
                  className="magnetic-button portal-footer-social"
                >
                  <Instagram size={18} />
                </a>
                <a
                  href="mailto:ceascongnotsav@gmail.com"
                  aria-label="Email"
                  className="magnetic-button portal-footer-social"
                >
                  <Mail size={18} />
                </a>
                <a
                  href="tel:+918087379885"
                  aria-label="Phone"
                  className="magnetic-button portal-footer-social"
                >
                  <Phone size={18} />
                </a>
              </div>
            </section>

            <section className="portal-footer-card portal-footer-card--nav">
              <p className="portal-footer-card__title">Navigation</p>
              <nav className="portal-footer-links" aria-label="Footer navigation">
                <a href="#overview" className="portal-footer-link">Home</a>
                <a href="#registration-panel" className="portal-footer-link">Events</a>
                <a href="#announcement-archive" className="portal-footer-link">Updates</a>
                <a href="#faq" className="portal-footer-link">FAQ</a>
              </nav>
            </section>

            <section className="portal-footer-card portal-footer-card--reach">
              <p className="portal-footer-card__title">Reach Us</p>
              <div className="portal-footer-contact">
                <div className="portal-footer-contact__item">
                  <span className="portal-footer-contact__icon portal-footer-contact__icon--map">
                    <MapPin size={16} />
                  </span>
                  <span>Computer Engineering Department, Dr. Vithalrao Vikhe Patil College of Engineering, Ahilyanagar, Maharashtra 414001</span>
                </div>
                <a href="mailto:ceascongnotsav@gmail.com" className="portal-footer-contact__item">
                  <span className="portal-footer-contact__icon portal-footer-contact__icon--mail">
                    <Mail size={16} />
                  </span>
                  <span>ceascongnotsav@gmail.com</span>
                </a>
                <a href="tel:+918087379885" className="portal-footer-contact__item">
                  <span className="portal-footer-contact__icon portal-footer-contact__icon--phone">
                    <Phone size={16} />
                  </span>
                  <span>+91 8087379885</span>
                </a>
              </div>
            </section>

            <section className="portal-footer-card portal-footer-card--qr">
              <div className="portal-footer-qr-frame">
                <img
                  src={FOOTER_QR_URL}
                  alt="COGNOTSAV portal QR"
                  className="portal-footer-qr-image"
                />
              </div>
              <p className="portal-footer-qr-label">COGNOTSAV 2026 Portal</p>
            </section>
          </div>

          <div className="portal-footer-bottom">
            <p>&copy; 2026 CEAS COGNOTSAV. All Rights Reserved.</p>
            <p>
              Created by <span className="portal-footer-credit">Sanket Meghale</span>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default PortalFooter;
