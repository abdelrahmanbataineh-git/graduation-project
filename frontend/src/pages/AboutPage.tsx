import { ArrowLeft, Info, LayoutDashboard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function AboutPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-surface-50 to-surface-100 text-surface-900 font-sans antialiased">
      {/* Header */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-surface-200 sticky top-0 z-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => navigate(-1)}
                className="p-2.5 rounded-xl hover:bg-surface-100 text-surface-500 hover:text-surface-900 transition-all border border-transparent hover:border-surface-200"
              >
                <ArrowLeft size={18} />
              </button>
              <h1 className="text-xl font-bold tracking-tight">About Us</h1>
            </div>
            <button 
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-50 hover:bg-primary-100 border border-primary-200 rounded-full text-xs font-bold text-primary-700 transition-colors shadow-sm"
            >
              <LayoutDashboard size={14} />
              <span className="hidden sm:inline">Dashboard</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <div className="bg-white rounded-3xl p-8 sm:p-12 border border-surface-200 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary-400/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
          
          <div className="relative z-10 space-y-6">
            <div className="flex items-center gap-3 text-primary-600 mb-6">
              <div className="p-3 bg-primary-50 rounded-2xl border border-primary-100">
                <Info size={24} />
              </div>
              <h2 className="text-2xl font-extrabold text-surface-900">About Smarteal</h2>
            </div>
            
            <div className="prose prose-surface max-w-none text-surface-600 leading-relaxed space-y-4">
              <p>
                Welcome to Smarteal! We are a dedicated team of four students from the University of Jordan, and this application is the culmination of our hard work as our graduation project.
              </p>
              <p>
                Our mission was to create an intelligent, seamless, and highly accurate nutrition tracking companion. We realized that many existing apps are cluttered, confusing, or lack the intelligence to truly understand dietary needs. That's why we built Smarteal—a platform designed to make macro tracking, meal discovery, and goal setting effortless.
              </p>
              <p>
                As students passionate about health and technology, we wanted to bridge the gap between complex nutritional science and everyday usability. Whether you're tracking your fiber and sugar, searching for highly tailored meal recommendations, or interacting with our smart AI assistant, every feature has been meticulously crafted to help you achieve your health goals.
              </p>
              <p>
                Thank you for using Smarteal. We hope this tool empowers you on your fitness journey as much as it has empowered us in our academic careers!
              </p>
            </div>
            
          </div>
        </div>
      </main>
    </div>
  );
}
