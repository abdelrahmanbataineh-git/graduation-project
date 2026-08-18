import { Link, useLocation } from 'react-router-dom';
import { Leaf, Mail, Info, Shield, FileText } from 'lucide-react';

export default function Footer() {
  const location = useLocation();

  // Hide footer on specific pages where it doesn't make sense (like login or full-screen chat)
  const hiddenRoutes = ['/login', '/chat'];
  if (hiddenRoutes.includes(location.pathname)) {
    return null;
  }

  return (
    <footer className="bg-slate-900 text-slate-300 border-t border-slate-800">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-12">
          
          {/* Brand Column */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary-500/20 flex items-center justify-center text-primary-400">
                <Leaf size={20} />
              </div>
              <span className="font-extrabold text-white text-lg tracking-tight">Smarteal</span>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed max-w-xs">
              Your intelligent companion for tracking macros, analyzing meals, and achieving your dream physique with precision.
            </p>
          </div>

          {/* Quick Links Column */}
          <div className="space-y-4">
            <h4 className="font-bold text-white uppercase tracking-wider text-xs">Company</h4>
            <ul className="space-y-3">
              <li>
                <Link to="/about" className="text-slate-400 hover:text-primary-400 transition-colors text-sm flex items-center gap-2">
                  <Info size={14} /> About Us
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-slate-400 hover:text-primary-400 transition-colors text-sm flex items-center gap-2">
                  <Mail size={14} /> Contact Us
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal Column */}
          <div className="space-y-4">
            <h4 className="font-bold text-white uppercase tracking-wider text-xs">Legal</h4>
            <ul className="space-y-3">
              <li>
                <Link to="/privacy" className="text-slate-400 hover:text-primary-400 transition-colors text-sm flex items-center gap-2">
                  <Shield size={14} /> Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/terms" className="text-slate-400 hover:text-primary-400 transition-colors text-sm flex items-center gap-2">
                  <FileText size={14} /> Terms & Conditions
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-6 border-t border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-500">
            &copy; {new Date().getFullYear()} Smarteal. All rights reserved.
          </p>
          <div className="flex items-center gap-4 text-xs font-semibold text-slate-500">
            <span>Powered by advanced AI</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
