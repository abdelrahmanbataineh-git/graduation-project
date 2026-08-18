import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Settings, Bell, HeartPulse, ArrowLeft, LogOut, Check, Save, Download } from 'lucide-react';
import api from '../api';
import ThemeToggle from '../components/ThemeToggle';

export default function SettingsPage() {
 const navigate = useNavigate();
 const [activeTab, setActiveTab] = useState('account');
 const [loading, setLoading] = useState(true);
 const [saving, setSaving] = useState(false);
 const [successMsg, setSuccessMsg] = useState('');
 const [errorMsg, setErrorMsg] = useState('');
 const [exporting, setExporting] = useState(false);

 const handleExport = async () => {
  setExporting(true);
  setErrorMsg('');
  setSuccessMsg('');
  try {
    const userId = localStorage.getItem('user_id');
    if (!userId) return;
    const res = await api.get(`/users/${userId}/export`);
    const targetsRes = await api.get(`/users/${userId}/targets`);
    const { user_profile, meals, water_logs, weight_logs } = res.data;
    const targets = targetsRes.data;

    const csvRows: string[] = [];

    const escapeCsvValue = (val: unknown) => {
      if (val === null || val === undefined) return '';
      let str = String(val);
      str = str.replace(/"/g, '""');
      if (str.includes(',') || str.includes('\n') || str.includes('\r') || str.includes('"')) {
        return `"${str}"`;
      }
      return str;
    };

    const actualWaterGoal = user_profile.water_goal_ml || 2500;

    // --- SECTION 1: PROFILE ---
    csvRows.push('=== USER PROFILE ===');
    csvRows.push(['Email', 'Full Name', 'Age', 'Height (cm)', 'Current Weight', 'Goal', 'Target Calories', 'Target Protein (g)', 'Target Carbs (g)', 'Target Fat (g)', 'Water Goal (ml)'].map(escapeCsvValue).join(','));
    csvRows.push([
      user_profile.email,
      user_profile.full_name || 'N/A',
      user_profile.age || 'N/A',
      user_profile.height || 'N/A',
      `${user_profile.weight || 'N/A'} ${user_profile.measurement_units === 'imperial' ? 'lbs' : 'kg'}`,
      user_profile.goal || 'N/A',
      targets.calories || 'N/A',
      targets.protein_grams || 'N/A',
      targets.carbs_grams || 'N/A',
      targets.fat_grams || 'N/A',
      actualWaterGoal
    ].map(escapeCsvValue).join(','));

    csvRows.push('');
    csvRows.push('');

    // --- SECTION 2: MEAL LOGS ---
    csvRows.push('=== MEAL LOGS (LAST 6 MONTHS) ===');
    csvRows.push(['Date', 'Time', 'Food Name', 'Calories (kcal)', 'Protein (g)', 'Carbs (g)', 'Fat (g)', 'Fiber (g)', 'Sugar (g)', 'Sodium (mg)', 'Potassium (mg)', 'Calcium (mg)', 'Vit C (mg)', 'Vit D (mcg)', 'Iron (mg)'].map(escapeCsvValue).join(','));
    if (!meals || meals.length === 0) {
      csvRows.push('No meals logged in the last 6 months');
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sortedMeals = [...(meals as any[])].sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      sortedMeals.forEach((meal: any) => {
        const dt = new Date(meal.created_at);
        csvRows.push([
          dt.toLocaleDateString(),
          dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          meal.food_name,
          meal.calories,
          meal.protein,
          meal.carbs,
          meal.fat,
          meal.fiber || 0,
          meal.sugar || 0,
          meal.sodium_mg || 0,
          meal.potassium_mg || 0,
          meal.calcium_mg || 0,
          meal.vitamin_c_mg || 0,
          meal.vitamin_d_mcg || 0,
          meal.iron_mg || 0
        ].map(escapeCsvValue).join(','));
      });
    }

    csvRows.push('');
    csvRows.push('');

    // --- SECTION 3: HYDRATION LOGS ---
    csvRows.push('=== HYDRATION LOGS (LAST 6 MONTHS) ===');
    csvRows.push(['Date', 'Time', 'Amount (ml)'].map(escapeCsvValue).join(','));
    if (!water_logs || water_logs.length === 0) {
      csvRows.push('No hydration logged in the last 6 months');
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sortedWater = [...(water_logs as any[])].sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      sortedWater.forEach((log: any) => {
        const dt = new Date(log.created_at);
        csvRows.push([
          dt.toLocaleDateString(),
          dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          log.amount_ml
        ].map(escapeCsvValue).join(','));
      });
    }

    csvRows.push('');
    csvRows.push('');

    // --- SECTION 4: WEIGHT LOGS ---
    csvRows.push('=== WEIGHT LOGS (LAST 6 MONTHS) ===');
    const weightUnit = user_profile.measurement_units === 'imperial' ? 'lbs' : 'kg';
    csvRows.push(['Date', 'Time', `Weight (${weightUnit})`].map(escapeCsvValue).join(','));
    if (!weight_logs || weight_logs.length === 0) {
      csvRows.push('No weight logged in the last 6 months');
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sortedWeights = [...(weight_logs as any[])].sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      sortedWeights.forEach((log: any) => {
        const dt = new Date(log.created_at);
        csvRows.push([
          dt.toLocaleDateString(),
          dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          log.weight
        ].map(escapeCsvValue).join(','));
      });
    }

    csvRows.push('');
    csvRows.push('');

    // --- SECTION 5: MONTHLY WEIGHT SUMMARY ---
    csvRows.push('=== MONTHLY WEIGHT SUMMARY (LAST 6 MONTHS) ===');
    csvRows.push(['Month', `Average Weight (${weightUnit})`, 'Change from Previous Month'].map(escapeCsvValue).join(','));
    if (!weight_logs || weight_logs.length === 0) {
      csvRows.push('No weight logged in the last 6 months');
    } else {
      const monthlyWeights: Record<string, number[]> = {};
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (weight_logs as any[]).forEach((log: any) => {
        const dt = new Date(log.created_at);
        const monthKey = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
        if (!monthlyWeights[monthKey]) monthlyWeights[monthKey] = [];
        monthlyWeights[monthKey].push(log.weight);
      });
      
      const sortedMonths = Object.keys(monthlyWeights).sort();
      let prevAvg: number | null = null;
      
      sortedMonths.forEach(month => {
        const weights = monthlyWeights[month];
        const avg = weights.reduce((a: number, b: number) => a + b, 0) / weights.length;
        const avgStr = avg.toFixed(1);
        let changeStr = '-';
        
        if (prevAvg !== null) {
          const diff = avg - prevAvg;
          changeStr = diff > 0 ? `+${diff.toFixed(1)}` : diff.toFixed(1);
        }
        
        const [yyyy, mm] = month.split('-');
        const dateObj = new Date(parseInt(yyyy), parseInt(mm) - 1, 1);
        const monthName = dateObj.toLocaleString('default', { month: 'short', year: 'numeric' });
        
        csvRows.push([monthName, avgStr, changeStr].map(escapeCsvValue).join(','));
        prevAvg = avg;
      });
    }

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Smarteal_Health_Data_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setSuccessMsg('Export completed successfully!');
    setTimeout(() => setSuccessMsg(''), 3000);
  } catch {
    setErrorMsg('Failed to export data.');
  } finally {
    setExporting(false);
  }
 };

 // eslint-disable-next-line @typescript-eslint/no-explicit-any
 const [profile, setProfile] = useState<any>(null);
 const [newEmail, setNewEmail] = useState('');
 const [currentPassword, setCurrentPassword] = useState('');
 const [newPassword, setNewPassword] = useState('');
 const [securitySuccess, setSecuritySuccess] = useState('');
 const [securityError, setSecurityError] = useState('');

 useEffect(() => {
 const fetchProfile = async () => {
 try {
 const userId = localStorage.getItem('user_id');
 if (!userId) {
 navigate('/login');
 return;
 }
 const res = await api.get(`/users/${userId}`);
 setProfile({
 ...res.data,
 full_name: res.data.full_name || '',
 dietary_preference: res.data.dietary_preference || 'none',
 activity_level: res.data.activity_level || 'sedentary',
 measurement_units: res.data.measurement_units || 'metric',
 water_goal_ml: res.data.water_goal_ml || 2500,
 water_reminders: res.data.water_reminders !== false, // default true
 meal_reminders: res.data.meal_reminders !== false,
 weekly_reports: res.data.weekly_reports !== false,
 });
 setNewEmail(res.data.email || '');
 } catch {
 setErrorMsg('Failed to load settings.');
 } finally {
 setLoading(false);
 }
 };
 fetchProfile();
 }, [navigate]);

 const handleSave = async () => {
 setSaving(true);
 setSuccessMsg('');
 setErrorMsg('');
 try {
 const userId = localStorage.getItem('user_id');
 await api.put(`/users/${userId}`, {
 age: profile.age,
 height: profile.height,
 weight: profile.weight,
 goal: profile.goal,
 full_name: profile.full_name,
 dietary_preference: profile.dietary_preference,
 activity_level: profile.activity_level,
 measurement_units: profile.measurement_units,
 water_goal_ml: profile.water_goal_ml,
 water_reminders: profile.water_reminders,
 meal_reminders: profile.meal_reminders,
 weekly_reports: profile.weekly_reports
 });
 setSuccessMsg('Settings saved successfully!');
 setTimeout(() => setSuccessMsg(''), 3000);
 } catch {
 setErrorMsg('Failed to save settings.');
 } finally {
 setSaving(false);
 }
 };

 const handleUpdateEmail = async () => {
 setSecurityError('');
 setSecuritySuccess('');
 try {
 const userId = localStorage.getItem('user_id');
 await api.put(`/users/${userId}/email`, { new_email: newEmail });
 setSecuritySuccess('Email updated successfully!');
 setTimeout(() => setSecuritySuccess(''), 3000);
 // eslint-disable-next-line @typescript-eslint/no-explicit-any
 // eslint-disable-next-line @typescript-eslint/no-explicit-any
 } catch (err: any) {
 setSecurityError(err.response?.data?.detail || 'Failed to update email.');
 }
 };

 const handleUpdatePassword = async () => {
 setSecurityError('');
 setSecuritySuccess('');
 if (!currentPassword || !newPassword) {
 setSecurityError('Both current and new passwords are required.');
 return;
 }
 try {
 const userId = localStorage.getItem('user_id');
 await api.put(`/users/${userId}/password`, { 
 current_password: currentPassword, 
 new_password: newPassword 
 });
 setSecuritySuccess('Password updated successfully!');
 setCurrentPassword('');
 setNewPassword('');
 setTimeout(() => setSecuritySuccess(''), 3000);
 // eslint-disable-next-line @typescript-eslint/no-explicit-any
 // eslint-disable-next-line @typescript-eslint/no-explicit-any
 } catch (err: any) {
 setSecurityError(err.response?.data?.detail || 'Failed to update password.');
 }
 };

 const handleLogout = () => {
 localStorage.clear();
 navigate('/login');
 };

  const tabs = [
  { id: 'account', label: 'Account', icon: User },
  { id: 'preferences', label: 'Preferences', icon: Settings },
  { id: 'health', label: 'Health Profile', icon: HeartPulse },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'data', label: 'Data Management', icon: Download },
  ];

 if (loading) {
 return (
 <div className="min-h-screen bg-surface-50 flex items-center justify-center">
 <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
 </div>
 );
 }

 return (
 <div className="min-h-screen bg-surface-50 text-surface-900 font-sans antialiased transition-colors duration-300">
 {/* Header */}
 <nav className="bg-white border-b border-surface-200 sticky top-0 z-30 shadow-xs">
 <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
 <div className="flex justify-between h-16 items-center">
 <div className="flex items-center gap-4">
 <button 
 onClick={() => navigate('/dashboard')}
 className="p-2 rounded-xl bg-surface-100 hover:bg-surface-200 transition-colors"
 >
 <ArrowLeft size={18} className="text-surface-600" />
 </button>
 <h1 className="font-extrabold text-lg text-surface-900">Settings</h1>
 </div>
 <ThemeToggle />
 </div>
 </div>
 </nav>

 <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
 <div className="flex flex-col md:flex-row gap-8">
 
 {/* Sidebar */}
 <div className="w-full md:w-64 shrink-0 space-y-2">
 {tabs.map(tab => (
 <button
 key={tab.id}
 onClick={() => setActiveTab(tab.id)}
 className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold transition-all text-sm ${
 activeTab === tab.id 
 ? 'bg-primary-600 text-white shadow-md' 
 : 'text-surface-600 hover:bg-surface-100 '
 }`}
 >
 <tab.icon size={18} className={activeTab === tab.id ? 'text-white' : 'text-surface-400'} />
 {tab.label}
 </button>
 ))}
 </div>

 {/* Content Area */}
 <div className="flex-1 bg-white rounded-3xl shadow-sm border border-surface-200 p-6 md:p-8">
 
 {activeTab === 'account' && (
 <div className="space-y-6">
 <div>
 <h2 className="text-xl font-extrabold text-surface-900 mb-1">Account Details</h2>
 <p className="text-sm text-surface-500">Manage your Smarteal account.</p>
 </div>
 <div className="space-y-4">
 <div>
 <label className="text-[11px] font-bold text-surface-400 uppercase tracking-widest block mb-1">Full Name</label>
 <input 
 type="text" 
 value={profile?.full_name || ''}
 onChange={(e) => setProfile({...profile, full_name: e.target.value})}
 placeholder="Your name"
 className="w-full text-sm font-semibold bg-surface-50 border border-surface-200 rounded-xl p-3 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all outline-none"
 />
 </div>
 </div>

 <div className="pt-6 mt-6 border-t border-surface-100">
 <h3 className="text-lg font-bold text-surface-900 mb-4">Security</h3>
 
 {securitySuccess && (
 <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 text-sm font-bold rounded-xl flex items-center gap-2 border border-green-200 dark:border-green-800">
 <Check size={16} /> {securitySuccess}
 </div>
 )}
 {securityError && (
 <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm font-bold rounded-xl border border-red-200 dark:border-red-800">
 {securityError}
 </div>
 )}

 <div className="space-y-4 mb-6">
 <div>
 <label className="text-[11px] font-bold text-surface-400 uppercase tracking-widest block mb-1">Email Address</label>
 <div className="flex gap-2">
 <input 
 type="email" 
 value={newEmail} 
 onChange={(e) => setNewEmail(e.target.value)}
 className="flex-1 text-sm font-semibold bg-surface-50 border border-surface-200 rounded-xl p-3 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all outline-none"
 />
 <button onClick={handleUpdateEmail} className="bg-surface-200 hover:bg-surface-300 text-surface-700 font-bold px-4 py-2 rounded-xl text-sm transition-colors">
 Update
 </button>
 </div>
 </div>
 </div>

 <div className="space-y-4">
 <div>
 <label className="text-[11px] font-bold text-surface-400 uppercase tracking-widest block mb-1">Current Password</label>
 <input 
 type="password" 
 value={currentPassword}
 onChange={(e) => setCurrentPassword(e.target.value)}
 placeholder="••••••••"
 className="w-full text-sm font-semibold bg-surface-50 border border-surface-200 rounded-xl p-3 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all outline-none"
 />
 </div>
 <div>
 <label className="text-[11px] font-bold text-surface-400 uppercase tracking-widest block mb-1">New Password</label>
 <input 
 type="password" 
 value={newPassword}
 onChange={(e) => setNewPassword(e.target.value)}
 placeholder="••••••••"
 className="w-full text-sm font-semibold bg-surface-50 border border-surface-200 rounded-xl p-3 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all outline-none"
 />
 </div>
 <button onClick={handleUpdatePassword} className="bg-surface-200 hover:bg-surface-300 text-surface-700 font-bold px-4 py-2.5 rounded-xl text-sm transition-colors w-full">
 Change Password
 </button>
 </div>
 </div>
 <div className="pt-6 mt-6 border-t border-surface-100">
 <button 
 onClick={handleLogout}
 className="flex items-center gap-2 text-sm font-bold text-red-500 hover:text-red-600 transition-colors bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 px-4 py-2.5 rounded-xl"
 >
 <LogOut size={16} /> Logout from all devices
 </button>
 </div>
 </div>
 )}

 {activeTab === 'preferences' && (
 <div className="space-y-6">
 <div>
 <h2 className="text-xl font-extrabold text-surface-900 mb-1">App Preferences</h2>
 <p className="text-sm text-surface-500">Customize how Smarteal looks and feels.</p>
 </div>
 
 <div className="space-y-6">
 <div>
 <label className="text-[11px] font-bold text-surface-400 uppercase tracking-widest block mb-2">Theme Mode</label>
 <p className="text-sm text-surface-500 mb-3">You can toggle between light and dark mode using the button in the top right corner of the navigation bar.</p>
 </div>
 
 <div>
 <label className="text-[11px] font-bold text-surface-400 uppercase tracking-widest block mb-2">Measurement Units</label>
 <div className="flex gap-3">
 <label className="flex-1 cursor-pointer relative">
 <input type="radio" name="units" className="peer sr-only" 
 checked={profile?.measurement_units === 'metric'} 
 onChange={() => setProfile({...profile, measurement_units: 'metric'})} 
 />
 <div className="p-3 bg-surface-50 border-2 border-surface-200 rounded-xl text-center font-bold text-sm text-surface-600 peer-checked:border-primary-500 peer-checked:text-primary-600 peer-checked:bg-primary-50 dark:peer-checked:bg-primary-900/20 transition-all">
 Metric (kg, ml)
 </div>
 </label>
 <label className="flex-1 cursor-pointer relative">
 <input type="radio" name="units" className="peer sr-only" 
 checked={profile?.measurement_units === 'imperial'} 
 onChange={() => setProfile({...profile, measurement_units: 'imperial'})} 
 />
 <div className="p-3 bg-surface-50 border-2 border-surface-200 rounded-xl text-center font-bold text-sm text-surface-600 peer-checked:border-primary-500 peer-checked:text-primary-600 peer-checked:bg-primary-50 dark:peer-checked:bg-primary-900/20 transition-all">
 Imperial (lbs, oz)
 </div>
 </label>
 </div>
 </div>
 </div>
 </div>
 )}

 {activeTab === 'health' && (
 <div className="space-y-6">
 <div>
 <h2 className="text-xl font-extrabold text-surface-900 mb-1">Health & Diet Profile</h2>
 <p className="text-sm text-surface-500">Help the AI tailor recommendations to your lifestyle.</p>
 </div>
 
 <div className="space-y-5">
 <div>
 <label className="text-[11px] font-bold text-surface-400 uppercase tracking-widest block mb-2">Dietary Preference</label>
 <select 
 value={profile?.dietary_preference || 'none'}
 onChange={(e) => setProfile({...profile, dietary_preference: e.target.value})}
 className="w-full text-sm font-semibold bg-surface-50 border border-surface-200 rounded-xl p-3 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all outline-none"
 >
 <option value="none">None / Balanced</option>
 <option value="vegan">Vegan</option>
 <option value="vegetarian">Vegetarian</option>
 <option value="keto">Keto (Low Carb)</option>
 <option value="paleo">Paleo</option>
 <option value="pescatarian">Pescatarian</option>
 </select>
 </div>
 
 <div>
 <label className="text-[11px] font-bold text-surface-400 uppercase tracking-widest block mb-2">Activity Level</label>
 <select 
 value={profile?.activity_level || 'sedentary'}
 onChange={(e) => setProfile({...profile, activity_level: e.target.value})}
 className="w-full text-sm font-semibold bg-surface-50 border border-surface-200 rounded-xl p-3 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all outline-none"
 >
 <option value="sedentary">Sedentary (little to no exercise)</option>
 <option value="lightly active">Lightly Active (light exercise 1-3 days/week)</option>
 <option value="moderately active">Moderately Active (moderate exercise 3-5 days/week)</option>
 <option value="very active">Very Active (hard exercise 6-7 days/week)</option>
 <option value="extra active">Extra Active (very hard exercise & physical job)</option>
 </select>
 </div>
 
 <div>
 <label className="text-[11px] font-bold text-surface-400 uppercase tracking-widest block mb-2">Daily Water Goal (ml)</label>
 <input 
 type="number" 
 value={profile?.water_goal_ml || ''}
 onChange={(e) => setProfile({...profile, water_goal_ml: parseInt(e.target.value) || 2500})}
 className="w-full text-sm font-semibold bg-surface-50 border border-surface-200 rounded-xl p-3 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all outline-none"
 />
 </div>
 
 <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
 <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">
 Note: You can update your age, weight, and height goals directly from the Dashboard profile menu!
 </p>
 </div>
 </div>
 </div>
 )}

 {activeTab === 'notifications' && (
 <div className="space-y-6">
 <div>
 <h2 className="text-xl font-extrabold text-surface-900 mb-1">Notifications</h2>
 <p className="text-sm text-surface-500">Control what alerts you receive.</p>
 </div>
 
 <div className="space-y-6">
  <label className="flex items-center justify-between p-4 bg-surface-50 border border-surface-200 rounded-xl cursor-pointer">
  <div>
  <div className="font-bold text-sm text-surface-900">Hydration Alerts</div>
  <div className="text-xs text-surface-500">Remind me to drink water every 2 hours (unless daily goal is reached).</div>
  </div>
  <div className="relative inline-flex items-center">
  <input 
  type="checkbox" 
  className="sr-only peer"
  checked={profile?.water_reminders || false}
  onChange={(e) => setProfile({...profile, water_reminders: e.target.checked})}
  />
  <div className="w-11 h-6 bg-surface-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
  </div>
  </label>

  <label className="flex items-center justify-between p-4 bg-surface-50 border border-surface-200 rounded-xl cursor-pointer">
  <div>
  <div className="font-bold text-sm text-surface-900">Meal Reminders</div>
  <div className="text-xs text-surface-500">Send a push notification or email at Breakfast, Lunch, and Dinner times (skipped if meal is already logged).</div>
  </div>
  <div className="relative inline-flex items-center">
  <input 
  type="checkbox" 
  className="sr-only peer"
  checked={profile?.meal_reminders || false}
  onChange={(e) => setProfile({...profile, meal_reminders: e.target.checked})}
  />
  <div className="w-11 h-6 bg-surface-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
  </div>
  </label>

  <label className="flex items-center justify-between p-4 bg-surface-50 border border-surface-200 rounded-xl cursor-pointer">
  <div>
  <div className="font-bold text-sm text-surface-900">Weekly Reports</div>
  <div className="text-xs text-surface-500">Receive a Weekly Stats Summary email.</div>
  </div>
  <div className="relative inline-flex items-center">
  <input 
  type="checkbox" 
  className="sr-only peer"
  checked={profile?.weekly_reports || false}
  onChange={(e) => setProfile({...profile, weekly_reports: e.target.checked})}
  />
  <div className="w-11 h-6 bg-surface-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
  </div>
  </label>
  </div>
 </div>
  )}

  {activeTab === 'data' && (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-extrabold text-surface-900 mb-1">Data Management</h2>
        <p className="text-sm text-surface-500">Take control of your personal health and nutrition records.</p>
      </div>

      <div className="bg-surface-50 border border-surface-200 rounded-3xl p-6 space-y-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 rounded-2xl">
            <Download size={24} />
          </div>
          <div>
            <h3 className="font-extrabold text-base text-surface-900 mb-1">Export Health Data</h3>
            <p className="text-sm text-surface-500">
              Download your entire health profile history from the last 6 months as a standard CSV spreadsheet file. This includes all logged meals (with macro details), daily weight measurements, and hydration logs.
            </p>
          </div>
        </div>

        <div className="pt-4 border-t border-surface-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="text-xs text-surface-400">
            CSV files can be opened instantly in Excel, Google Sheets, or Apple Numbers.
          </div>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 text-white font-bold px-6 py-3 rounded-2xl transition-all shadow-sm disabled:opacity-50 text-sm whitespace-nowrap"
          >
            <Download size={16} />
            {exporting ? 'Exporting...' : 'Export CSV Data'}
          </button>
        </div>
      </div>
    </div>
  )}

 {/* Global Save Button for active tabs */}
 {activeTab !== 'data' && (
 <div className="mt-8 pt-6 border-t border-surface-200 flex items-center justify-end gap-4">
 {successMsg && (
 <span className="text-sm font-bold text-green-500 flex items-center gap-1"><Check size={16} /> {successMsg}</span>
 )}
 {errorMsg && (
 <span className="text-sm font-bold text-red-500">{errorMsg}</span>
 )}
 <button 
 onClick={handleSave}
 disabled={saving}
 className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white font-bold px-6 py-2.5 rounded-xl transition-all shadow-sm disabled:opacity-50"
 >
 <Save size={16} />
 {saving ? 'Saving...' : 'Save Settings'}
 </button>
 </div>
 )}
 </div>
 </div>
 </div>
 </div>
 );
}

