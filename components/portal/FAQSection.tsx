import React, { useState } from 'react';
import { Award, CircleHelp, Plus, Users, Wallet, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { shellClassName } from './utils';

type FaqItem = {
  question: string;
  answer: string;
  tone: 'cyan' | 'amber' | 'violet' | 'pink';
  Icon: LucideIcon;
};

const faqItems: FaqItem[] = [
  {
    question: 'How can I register for multiple events?',
    answer: 'Open each competition card separately, review the event details, and submit an individual registration for every event you want to join.',
    tone: 'cyan',
    Icon: CircleHelp,
  },
  {
    question: 'Is there a registration fee?',
    answer: 'Yes. The fee depends on the selected competition and is shown clearly on every competition card and event registration page before submission.',
    tone: 'amber',
    Icon: Wallet,
  },
  {
    question: 'Can outsiders participate?',
    answer: 'Yes. Students from outside colleges can register as long as they follow the competition rules, team-size limits, and payment instructions.',
    tone: 'violet',
    Icon: Users,
  },
  {
    question: 'Will certificates be provided?',
    answer: 'Participation certificates and winner recognition are provided for the relevant competitions. Prize and certificate details are announced event-wise.',
    tone: 'pink',
    Icon: Award,
  },
];

export const FAQSection: React.FC = () => {
  const [openQuestion, setOpenQuestion] = useState(faqItems[0].question);

  return (
    <section id="faq" className={`${shellClassName} py-4 md:py-8`}>
      <div className="portal-faq-shell">
        <div className="portal-faq-shell__header">
          <div className="portal-faq-shell__badge">
            <CircleHelp size={14} />
            <span>Quick Answers</span>
          </div>
          <p className="portal-faq-shell__eyebrow">Got Questions?</p>
          <h3 className="portal-faq-shell__title">
            Frequently Asked <span>Queries</span>
          </h3>
          <p className="portal-faq-shell__intro">
            Everything you need to know before registering for COGNOTSAV 2026.
          </p>
        </div>

        <div className="portal-faq-shell__list">
          {faqItems.map(({ question, answer, Icon, tone }, index) => {
            const open = openQuestion === question;
            const answerId = `portal-faq-answer-${index}`;

            return (
              <article key={question} className={`portal-faq-shell__item portal-faq-shell__item--${tone} ${open ? 'is-open' : ''}`}>
                <button
                  type="button"
                  aria-expanded={open}
                  aria-controls={answerId}
                  onClick={() => setOpenQuestion(open ? '' : question)}
                  className="portal-faq-shell__trigger"
                >
                  <div className="portal-faq-shell__prompt">
                    <span className={`portal-faq-shell__icon portal-faq-shell__icon--${tone}`}>
                      <Icon size={18} />
                    </span>
                    <span className="portal-faq-shell__question">{question}</span>
                  </div>
                  <span className="portal-faq-shell__toggle">
                    {open ? <X size={16} /> : <Plus size={16} />}
                  </span>
                </button>

                <div id={answerId} className={`portal-faq-shell__answer-shell ${open ? 'is-open' : ''}`}>
                  <div className="portal-faq-shell__answer">
                    {answer}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default FAQSection;
