
import React, { useState } from 'react';
import { FAQS } from '../constants';
import { Plus, Minus, HelpCircle } from 'lucide-react';

const FAQItem: React.FC<{ question: string; answer: string }> = ({ question, answer }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-b border-white/10 last:border-0 overflow-hidden">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between py-6 text-left hover:text-cyan-400 transition-colors group"
      >
        <div className="flex items-center gap-4">
          <HelpCircle className={`transition-colors duration-300 ${isOpen ? 'text-cyan-400' : 'text-gray-600'}`} size={20} />
          <h4 className="text-lg md:text-xl font-bold text-gray-200 group-hover:text-white">
            {question}
          </h4>
        </div>
        <div className={`p-2 rounded-full transition-all duration-300 ${isOpen ? 'bg-cyan-500 text-black rotate-180' : 'bg-white/5 text-gray-400'}`}>
          {isOpen ? <Minus size={18} /> : <Plus size={18} />}
        </div>
      </button>
      
      <div className={`transition-all duration-500 ease-in-out ${isOpen ? 'max-h-96 opacity-100 pb-6' : 'max-h-0 opacity-0 overflow-hidden'}`}>
        <p className="text-gray-400 leading-relaxed pl-14">
          {answer}
        </p>
      </div>
    </div>
  );
};

const FAQSection: React.FC = () => {
  return (
    <section id="faq" className="py-24 bg-[#050505] px-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <span className="font-orbitron text-cyan-500 font-bold uppercase tracking-[0.3em] mb-4 block">Got Questions?</span>
          <h2 className="text-4xl md:text-5xl font-black text-white font-orbitron mb-6">Frequently Asked <span className="text-purple-500">Queries</span></h2>
          <p className="text-gray-400">Everything you need to know about COGNOTSAV 2026</p>
        </div>

        <div className="bg-white/5 rounded-3xl p-6 md:p-12 border border-white/10 backdrop-blur-sm">
          {FAQS.map((faq, i) => (
            <FAQItem key={i} {...faq} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default FAQSection;
