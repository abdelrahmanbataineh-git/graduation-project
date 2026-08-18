import { ArrowLeft, Mail, LayoutDashboard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ContactPage() {
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
              <h1 className="text-xl font-bold tracking-tight">Contact Us</h1>
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
                <Mail size={24} />
              </div>
              <h2 className="text-2xl font-extrabold text-surface-900">Get in Touch</h2>
            </div>
            
            <div className="prose prose-surface max-w-none text-surface-600 leading-relaxed space-y-4">
              <p>
                We would love to hear from you! Whether you have feedback, questions about the application, or are interested in the technical details of our graduation project, please feel free to reach out.
              </p>
              


              <h3 className="text-lg font-bold text-surface-900 mt-6 mb-2">General Inquiries</h3>
              <p>
                For general questions regarding the Smarteal platform, bug reports, or feature suggestions, you can email our project inbox:
              </p>
              <div className="flex items-center gap-3 p-4 bg-primary-50 rounded-xl border border-primary-100 text-primary-800 font-semibold">
                <Mail size={18} className="text-primary-600" />
                smarteal.team@ju.edu.jo
              </div>
              
              <p className="text-sm text-surface-500 mt-6 italic">
                * Please note: As this is an academic graduation project, response times may vary depending on our university schedules.
              </p>
            </div>
            
          </div>
        </div>
      </main>
    </div>
  );
}
