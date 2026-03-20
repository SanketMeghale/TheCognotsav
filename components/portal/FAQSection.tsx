import React, { useState } from 'react';
import { CircleHelp, Plus, X } from 'lucide-react';
import { shellClassName } from './utils';

const faqItems = [
  {
    question: 'How can I register for multiple events?',
    answer: 'Open each competition card separately, review the event details, and submit an individual registration for every event you want to join.',
  },
  {
    question: 'Is there a registration fee?',
    answer: 'Yes. The fee depends on the selected competition and is shown clearly on every competition card and event registration page before submission.',
  },
  {
    question: 'Can outsiders participate?',
    answer: 'Yes. Students from outside colleges can register as long as they follow the competition rules, team-size limits, and payment instructions.',
  },
  {
    question: 'Will certificates be provided?',
    answer: 'Participation certificates and winner recognition are provided for the relevant competitions. Prize and certificate details are announced event-wise.',
  },
];

export const FAQSection: React.FC = () => {
  const [openQuestion, setOpenQuestion] = useState(faqItems[0].question);

  return (
    <section id="faq" className={`${shellClassName} py-4 md:py-8`}>
      <div className="portal-glow-card portal-glass overflow-hidden rounded-[2rem] p-4 sm:p-5 md:p-6">
        <div className="text-center">
          <p className="text-[11px] uppercase tracking-[0.28em] text-cyan-300/85">Got Questions?</p>
          <h3 className="mt-3 font-orbitron text-3xl font-black text-white sm:text-4xl">
            Frequently Asked <span className="bg-gradient-to-r from-fuchsia-400 to-violet-400 bg-clip-text text-transparent">Queries</span>
          </h3>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-slate-300">
            Everything you need to know about COGNOTSAV 2026.
          </p>
        </div>

        <div className="mt-6 space-y-3">
          {faqItems.map((item) => {
            const open = openQuestion === item.question;
            return (
              <article key={item.question} className="overflow-hidden rounded-[1.6rem] border border-white/10 bg-[rgba(14,16,20,0.92)]">
                <button
                  type="button"
                  onClick={() => setOpenQuestion(open ? '' : item.question)}
                  className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left sm:px-5"
                >
                  <div className="flex items-center gap-3">
                    <CircleHelp size={18} className="text-slate-500" />
                    <span className="text-lg font-semibold text-white">{item.question}</span>
                  </div>
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/[0.04] text-slate-200">
                    {open ? <X size={18} /> : <Plus size={18} />}
                  </span>
                </button>
                {open ? (
                  <div className="border-t border-white/8 px-4 pb-5 pt-4 text-sm leading-7 text-slate-300 sm:px-5">
                    {item.answer}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default FAQSection;
