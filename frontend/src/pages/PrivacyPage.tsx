import { ArrowLeft, Shield, LayoutDashboard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function PrivacyPage() {
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
              <h1 className="text-xl font-bold tracking-tight">Privacy Policy</h1>
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

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <div className="bg-white rounded-3xl p-8 sm:p-12 border border-surface-200 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary-400/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
          
          <div className="relative z-10 space-y-6">
            <div className="flex items-center gap-3 text-primary-600 mb-6">
              <div className="p-3 bg-primary-50 rounded-2xl border border-primary-100">
                <Shield size={24} />
              </div>
              <h2 className="text-2xl font-extrabold text-surface-900">Privacy Policy</h2>
            </div>
            
            <div className="prose prose-surface max-w-none text-surface-600 leading-relaxed space-y-4">
              <p><strong>Last Updated: {new Date().toLocaleDateString()}</strong></p>
              <p>
                At Smarteal, protecting your personal data is one of our top priorities. As a graduation project developed by students at the University of Jordan, this application is built with security and user privacy in mind.
              </p>
              <h3 className="text-lg font-bold text-surface-900 mt-6 mb-2">1. Information We Collect</h3>
              <p>
                We collect essential information required to personalize your nutrition experience. This includes your height, weight, age, gender, and dietary goals. We also store the meal logs and chat data you input into the application to track your progress over time.
              </p>
              <h3 className="text-lg font-bold text-surface-900 mt-6 mb-2">2. How We Use Your Information</h3>
              <p>
                The data you provide is strictly used to calculate your macronutrient targets (Calories, Protein, Carbs, Fat, Fiber, Sugar) and to provide personalized meal recommendations through our system and AI chatbot. We do not sell your personal data to any third-party advertisers.
              </p>
              <h3 className="text-lg font-bold text-surface-900 mt-6 mb-2">3. Data Security</h3>
              <p>
                Your data is stored securely using modern database solutions. While this is an academic project, we employ industry-standard practices to ensure your information is kept private and secure against unauthorized access.
              </p>
              <h3 className="text-lg font-bold text-surface-900 mt-6 mb-2">4. Your Rights</h3>
              <p>
                You have the right to request the deletion of your account and all associated data at any time. If you wish to have your data removed, please contact us.
              </p>
            </div>
            
          </div>
        </div>
      </main>
    </div>
  );
}
