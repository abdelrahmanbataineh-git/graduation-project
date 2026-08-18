import { ArrowLeft, FileText, LayoutDashboard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function TermsPage() {
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
              <h1 className="text-xl font-bold tracking-tight">Terms & Conditions</h1>
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
                <FileText size={24} />
              </div>
              <h2 className="text-2xl font-extrabold text-surface-900">Terms & Conditions</h2>
            </div>
            
            <div className="prose prose-surface max-w-none text-surface-600 leading-relaxed space-y-4">
              <p><strong>Last Updated: {new Date().toLocaleDateString()}</strong></p>
              <p>
                Welcome to Smarteal. By accessing and using our application, you agree to the following Terms and Conditions. Please read them carefully.
              </p>
              <h3 className="text-lg font-bold text-surface-900 mt-6 mb-2">1. Educational Purpose</h3>
              <p>
                Smarteal was developed as a graduation project by four students from the University of Jordan. The information, recommendations, and calculations provided by this application are for educational and informational purposes only.
              </p>
              <h3 className="text-lg font-bold text-surface-900 mt-6 mb-2">2. Medical Disclaimer</h3>
              <p>
                This app is not a substitute for professional medical advice, diagnosis, or treatment. Always seek the advice of your physician or other qualified health provider with any questions you may have regarding a medical condition or dietary changes. Never disregard professional medical advice because of something you have read on this application.
              </p>
              <h3 className="text-lg font-bold text-surface-900 mt-6 mb-2">3. User Responsibilities</h3>
              <p>
                You are responsible for maintaining the confidentiality of your account credentials. You agree to provide accurate, current, and complete information when setting up your profile, as inaccurate data will result in incorrect nutritional targets.
              </p>
              <h3 className="text-lg font-bold text-surface-900 mt-6 mb-2">4. Limitation of Liability</h3>
              <p>
                To the maximum extent permitted by law, the developers of Smarteal shall not be liable for any indirect, incidental, or consequential damages resulting from your use of the application or your reliance on the dietary recommendations provided.
              </p>
            </div>
            
          </div>
        </div>
      </main>
    </div>
  );
}
