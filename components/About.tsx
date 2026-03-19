
import React from 'react';
import { Target, Rocket } from 'lucide-react';

interface StatProps {
  label: string;
  value: string;
  sublabel: string;
}

const StatBox: React.FC<StatProps> = ({ label, value, sublabel }) => (
  <div className="p-8 rounded-3xl bg-white/5 border border-white/10 hover:border-cyan-500/50 transition-all hover:-translate-y-2">
    <h4 className="text-gray-400 uppercase tracking-widest text-xs font-bold mb-2">{label}</h4>
    <p className="font-orbitron text-4xl md:text-5xl font-black text-white mb-1">{value}</p>
    <p className="text-cyan-400 font-semibold">{sublabel}</p>
  </div>
);

const About: React.FC = () => {
  return (
    <section id="about" className="py-24 bg-[#080808] px-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-16 items-center mb-24">
          <div className="order-2 lg:order-1">
            <span className="font-orbitron text-cyan-500 font-bold uppercase tracking-[0.3em] mb-4 block">Our Legacy</span>
            <h2 className="text-4xl md:text-5xl font-black text-white mb-8 leading-tight font-orbitron">
              Where Engineering <br/>Meets <span className="text-purple-500">Excellence</span>
            </h2>
            <div className="space-y-6 text-gray-400 text-lg leading-relaxed">
              <p>
                COGNOTSAV is the flagship technical festival of the Computer Engineering Department at Dr. Vithalrao Vikhe Patil College of Engineering, Ahilyanagar. It provides a platform for students to showcase innovation, technical skills, and problem-solving abilities beyond the classroom.
              </p>
              <p>
               Through exciting competitions, esports, project exhibitions, and UTOPIA, COGNOTSAV encourages students to explore technology, collaborate with peers, and push their creative boundaries.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-6 mt-12">
              <div className="flex gap-4 items-start">
                <div className="p-3 bg-cyan-500/10 rounded-xl text-cyan-400"><Target size={24} /></div>
                <div>
                  <h5 className="text-white font-bold mb-1">Our Vision</h5>
                  <p className="text-sm text-gray-500 italic">Innovate. Compete. Excel.</p>
                </div>
              </div>
              <div className="flex gap-4 items-start">
                <div className="p-3 bg-purple-500/10 rounded-xl text-purple-400"><Rocket size={24} /></div>
                <div>
                  <h5 className="text-white font-bold mb-1">Our Mission</h5>
                  <p className="text-sm text-gray-500 italic">Code, Compete, and Conquer.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="order-1 lg:order-2 relative">
             <div className="relative z-10 rounded-3xl overflow-hidden border border-white/10 group">
                <img 
                  src="/images/ceasposter.jpeg" 
                  alt="About Us" 
                  className="w-full h-auto object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
             </div>
             {/* Decorative Blobs */}
             <div className="absolute -top-10 -right-10 w-40 h-40 bg-purple-600/30 rounded-full blur-[60px] -z-10"></div>
             <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-cyan-600/30 rounded-full blur-[60px] -z-10"></div>
          </div>
        </div>

        {/* Counters Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <StatBox label="Mega Rewards" value="₹1 LAKH+" sublabel="Prize Pool🏆" />
          <StatBox label="Total Competitions" value="SIX" sublabel="Categories" />
          <StatBox label="Expected Reach" value="1500+" sublabel="Participants" />
        </div>
      </div>
    </section>
  );
};

export default About;
