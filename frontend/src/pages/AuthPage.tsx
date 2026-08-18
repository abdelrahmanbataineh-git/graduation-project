import { useState } from 'react';
import { Mail, Lock, ArrowRight, Ruler, Weight, Target, Calendar, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import ThemeToggle from '../components/ThemeToggle';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [view, setView] = useState<'default' | 'forgot_password' | 'reset_password'>('default');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  
  // Register specific fields
  const [fullName, setFullName] = useState('');
  const [age, setAge] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [gender, setGender] = useState('');
  const [goal, setGoal] = useState('');
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (view === 'forgot_password') {
        await api.post('/forgot-password', { email });
        setView('reset_password');
        setLoading(false);
        return;
      }

      if (view === 'reset_password') {
        await api.post('/reset-password', { email, code: resetCode, new_password: newPassword });
        setView('default');
        setIsLogin(true);
        setPassword('');
        setLoading(false);
        return;
      }

      if (isLogin) {
        const response = await api.post('/login', { email, password });
        localStorage.setItem('user_id', response.data.user_id);
        navigate('/dashboard');
      } else {
        const response = await api.post('/register', { 
          email, 
          password,
          full_name: fullName,
          age: parseInt(age),
          height: parseFloat(height),
          weight: parseFloat(weight),
          goal: goal || 'Maintain weight',
          gender: gender || 'Other'
        });
        localStorage.setItem('user_id', response.data.id);
        navigate('/dashboard');
      }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setError(err.response?.data?.detail || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-50 flex relative transition-colors duration-300">
      {/* Theme Toggle Top Right */}
      <div className="absolute top-6 right-6 z-50">
        <ThemeToggle />
      </div>

      {/* Form Section */}
      <div className="flex-1 flex flex-col justify-center px-8 sm:px-16 lg:px-24 xl:px-32 py-10 overflow-y-auto">
        <div className="mx-auto w-full max-w-md">
          {/* Logo / Brand */}
          <div className="flex items-center justify-center mb-10">
            <img src="/logos_and_assets/logo.jpg" alt="Smarteal Logo" className="h-28 object-contain logo-blend transition-all" />
          </div>

          {/* Header */}
          <h1 className="text-3xl font-extrabold text-surface-900 mb-2">
            {view === 'forgot_password' ? 'Reset password' : view === 'reset_password' ? 'New password' : isLogin ? 'Welcome back' : 'Create an account'}
          </h1>
          <p className="text-surface-500 mb-8">
            {view === 'forgot_password' ? 'Enter your email to receive a reset code.' : view === 'reset_password' ? 'Enter the reset code sent to your email and your new password.' : isLogin ? 'Enter your details to access your nutrition dashboard.' : 'Join Smarteal to track meals and get AI-driven advice.'}
          </p>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 text-red-600 border border-red-100 text-sm font-medium">
              {error}
            </div>
          )}

          {/* Form */}
          <form className="space-y-5" onSubmit={handleSubmit}>

            {(view === 'default' || view === 'forgot_password' || view === 'reset_password') && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-surface-900">Email address</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-surface-400 group-focus-within:text-primary-600 transition-colors">
                    <Mail size={20} />
                  </div>
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="jane@example.com"
                    required
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-surface-200 bg-white placeholder-surface-400 text-surface-900 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all shadow-sm"
                  />
                </div>
              </div>
            )}

            {view === 'reset_password' && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-surface-900">Reset Code</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-surface-400 group-focus-within:text-primary-600 transition-colors">
                    <Lock size={20} />
                  </div>
                  <input 
                    type="text" 
                    value={resetCode}
                    onChange={(e) => setResetCode(e.target.value)}
                    placeholder="123456"
                    required
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-surface-200 bg-white placeholder-surface-400 text-surface-900 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all shadow-sm"
                  />
                </div>
              </div>
            )}

            {(view === 'default' || view === 'reset_password') && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-surface-900">{view === 'reset_password' ? 'New Password' : 'Password'}</label>
                  {isLogin && view === 'default' && (
                    <button 
                      type="button"
                      onClick={() => setView('forgot_password')}
                      className="text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors focus:outline-none"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-surface-400 group-focus-within:text-primary-600 transition-colors">
                    <Lock size={20} />
                  </div>
                  <input 
                    type="password" 
                    value={view === 'reset_password' ? newPassword : password}
                    onChange={(e) => view === 'reset_password' ? setNewPassword(e.target.value) : setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-surface-200 bg-white placeholder-surface-400 text-surface-900 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all shadow-sm"
                  />
                </div>
              </div>
            )}

            {!isLogin && view === 'default' && (
              <>
                <div className="space-y-1.5 mb-5">
                  <label className="text-sm font-medium text-surface-900">Full Name</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-surface-400 group-focus-within:text-primary-600 transition-colors">
                      <User size={20} />
                    </div>
                    <input 
                      type="text" 
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Jane Doe"
                      required
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-surface-200 bg-white placeholder-surface-400 text-surface-900 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all shadow-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-surface-900">Age</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-surface-400 group-focus-within:text-primary-600 transition-colors">
                        <Calendar size={20} />
                      </div>
                      <input 
                        type="number" 
                        value={age}
                        onChange={(e) => setAge(e.target.value)}
                        placeholder="25"
                        required
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-surface-200 bg-white placeholder-surface-400 text-surface-900 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all shadow-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-surface-900">Gender</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-surface-400 group-focus-within:text-primary-600 transition-colors">
                        <User size={20} />
                      </div>
                      <select 
                        value={gender}
                        onChange={(e) => setGender(e.target.value)}
                        required
                        className="w-full pl-10 pr-4 py-3 appearance-none rounded-xl border border-surface-200 bg-white text-surface-900 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all shadow-sm"
                      >
                        <option value="" disabled>Select gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-surface-900">Height (cm)</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-surface-400 group-focus-within:text-primary-600 transition-colors">
                        <Ruler size={20} />
                      </div>
                      <input 
                        type="number" 
                        value={height}
                        onChange={(e) => setHeight(e.target.value)}
                        placeholder="170"
                        required
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-surface-200 bg-white placeholder-surface-400 text-surface-900 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all shadow-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-surface-900">Weight (kg)</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-surface-400 group-focus-within:text-primary-600 transition-colors">
                        <Weight size={20} />
                      </div>
                      <input 
                        type="number" 
                        value={weight}
                        onChange={(e) => setWeight(e.target.value)}
                        placeholder="65"
                        required
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-surface-200 bg-white placeholder-surface-400 text-surface-900 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all shadow-sm"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-surface-900">Goal</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-surface-400 group-focus-within:text-primary-600 transition-colors">
                      <Target size={20} />
                    </div>
                    <select 
                      value={goal}
                      onChange={(e) => setGoal(e.target.value)}
                      required
                      className="w-full pl-10 pr-4 py-3 appearance-none rounded-xl border border-surface-200 bg-white text-surface-900 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all shadow-sm"
                    >
                      <option value="" disabled>Select goal</option>
                      <option value="Lose weight">Lose weight</option>
                      <option value="Maintain weight">Maintain weight</option>
                      <option value="Gain muscle">Gain muscle</option>
                    </select>
                  </div>
                </div>
              </>
            )}

            <button 
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 disabled:cursor-not-allowed text-white py-3 px-4 rounded-xl font-medium transition-all focus:outline-none focus:ring-4 focus:ring-primary-500/30 active:scale-[0.98] shadow-md shadow-primary-500/20 mt-6"
            >
              {loading ? 'Processing...' : view === 'forgot_password' ? 'Send Reset Code' : view === 'reset_password' ? 'Reset Password' : isLogin ? 'Sign in' : 'Create account'}
              {!loading && <ArrowRight size={20} />}
            </button>
          </form>

          {/* Toggle Login/Register or Back */}
          <div className="mt-8 text-center text-sm text-surface-500">
            {view !== 'default' ? (
              <button 
                onClick={() => setView('default')}
                className="font-medium text-primary-600 hover:text-primary-700 transition-colors focus:outline-none"
              >
                Back to sign in
              </button>
            ) : (
              <>
                {isLogin ? "Don't have an account?" : "Already have an account?"}{' '}
                <button 
                  onClick={() => setIsLogin(!isLogin)}
                  className="font-medium text-primary-600 hover:text-primary-700 transition-colors focus:outline-none"
                >
                  {isLogin ? 'Sign up' : 'Sign in'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Image Section */}
      <div className="hidden lg:block lg:flex-1 relative overflow-hidden bg-primary-50">
        <img 
          src="/logos_and_assets/auth_hero_image.png" 
          alt="Abstract 3D healthcare elements floating" 
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-primary-900/10 mix-blend-multiply" />
        <div className="absolute inset-0 bg-gradient-to-t from-surface-900/60 via-transparent to-transparent" />
        
        <div className="absolute bottom-0 left-0 right-0 p-16 text-white">
          <h2 className="text-3xl font-bold mb-4">Precision Nutrition, AI-Powered.</h2>
          <p className="text-white/80 text-lg max-w-md">
            Upload your meals, track macros, and get personalized advice tailored specifically to your body's needs.
          </p>
        </div>
      </div>
    </div>
  );
}

