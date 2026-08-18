import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import ScannerPage from './pages/ScannerPage';
import ChatPage from './pages/ChatPage';
import RecommendationsPage from './pages/RecommendationsPage';
import SettingsPage from './pages/SettingsPage';
import Footer from './components/Footer';

// Placeholder Pages
import AboutPage from './pages/AboutPage';
import ContactPage from './pages/ContactPage';
import PrivacyPage from './pages/PrivacyPage';
import TermsPage from './pages/TermsPage';

function App() {
  return (
    <Router>
      <div className="flex flex-col min-h-screen bg-surface-50 text-surface-900 transition-colors duration-300">
        <div className="flex-grow">
          <Routes>
            {/* For now, redirect home to login */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<AuthPage />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/scanner" element={<ScannerPage />} />
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/recommendations" element={<RecommendationsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            
            {/* Info Pages */}
            <Route path="/about" element={<AboutPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/terms" element={<TermsPage />} />
          </Routes>
        </div>
        <Footer />
      </div>
    </Router>
  );
}

export default App;
