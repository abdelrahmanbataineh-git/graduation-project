/**
 * CHEAT SHEET FOR PRESENTATION - `ScannerPage.tsx`
 * ===========================================================
 * WHAT THIS FILE DOES:
 * This handles the AI Food Scanner interface where users upload or take pictures of their meals.
 * 
 * HOW IT WORKS:
 * 1. Image Upload: Users can drag and drop a file or click to upload. 
 * 2. API Request (`handleUpload`): It packages the image file and sends a POST request to our `/ai/analyze-food` backend endpoint.
 * 3. AI Magic: The backend waits for the YOLO/Gemini models to finish analyzing the image, then sends back the results (calories, macros, and a cool summary).
 * 4. User Adjustment: We allow the user to manually tweak the serving size (using a slider) just in case the AI underestimated how big the plate was.
 * ===========================================================
 */
import React, { useState, useRef } from 'react';
import { Camera, AlertCircle, CheckCircle2, ArrowLeft, Sparkles, Plus, PieChart, Info, RefreshCw, Edit3, LayoutDashboard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

type TabType = 'ai' | 'manual';

interface ScannedFood {
  food_name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  sodium_mg?: number;
  potassium_mg?: number;
  calcium_mg?: number;
  vitamin_c_mg?: number;
  vitamin_d_mcg?: number;
  iron_mg?: number;
  serving_size: number;
}


const getDefaultMealType = (): 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack' => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 11.5) return 'Breakfast';
  if (hour >= 11.5 && hour < 16) return 'Lunch';
  if (hour >= 16 && hour < 21.5) return 'Dinner';
  return 'Snack';
};

export default function ScannerPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('ai');
  const [selectedMealType, setSelectedMealType] = useState<'Breakfast' | 'Lunch' | 'Dinner' | 'Snack'>(getDefaultMealType());
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  // Drag and drop state
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Editable analysis result
  const [scannedFood, setScannedFood] = useState({
    food_name: '',
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    fiber: 0,
    sugar: 0,
    sodium_mg: 0,
    potassium_mg: 0,
    calcium_mg: 0,
    vitamin_c_mg: 0,
    vitamin_d_mcg: 0,
    iron_mg: 0,
    serving_size: 100 // default mock size in grams
  });
  
  const [annotatedImage, setAnnotatedImage] = useState<string | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  
  // Base values to calculate scaling
  const [baseFood, setBaseFood] = useState<ScannedFood | null>(null);

  // Manual Log Form State
  const [manualFood, setManualFood] = useState({
    food_name: '',
    calories: '',
    protein: '',
    carbs: '',
    fat: '',
    fiber: '',
    sugar: '',
    sodium_mg: '',
    potassium_mg: '',
    calcium_mg: '',
    vitamin_c_mg: '',
    vitamin_d_mcg: '',
    iron_mg: '',
    consumed_grams: 100
  });

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const selectedFile = e.dataTransfer.files[0];
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
      setBaseFood(null);
      setError('');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
      setBaseFood(null);
      setError('');
    }
  };

  // Run dynamic analysis stages for better UI feedback
  const runAnalysisStages = () => {
    const stages = [
      'Uploading food snapshot...',
      'Running computer vision pipeline...',
      'Segmenting ingredients & foods...',
      'Estimating nutritional profiles...'
    ];
    let currentStageIndex = 0;
    setLoadingStage(stages[0]);

    const interval = setInterval(() => {
      currentStageIndex += 1;
      if (currentStageIndex < stages.length) {
        setLoadingStage(stages[currentStageIndex]);
      } else {
        clearInterval(interval);
      }
    }, 1200);

    return interval;
  };

  const handleAnalyze = async () => {
    if (!file) return;

    const userId = localStorage.getItem('user_id');
    if (!userId) {
      navigate('/login');
      return;
    }

    setLoading(true);
    setError('');
    const stageInterval = runAnalysisStages();

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await api.post(`/ai/analyze-food/${userId}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      const data = res.data;
      const parsedFood = {
        food_name: data.food_name || 'Delicious Meal',
        calories: Number(data.calories) || 0,
        protein: Number(data.protein) || 0,
        carbs: Number(data.carbs) || 0,
        fat: Number(data.fat) || 0,
        fiber: Number(data.fiber) || 0,
        sugar: Number(data.sugar) || 0,
        sodium_mg: Number(data.sodium_mg) || 0,
        potassium_mg: Number(data.potassium_mg) || 0,
        calcium_mg: Number(data.calcium_mg) || 0,
        vitamin_c_mg: Number(data.vitamin_c_mg) || 0,
        vitamin_d_mcg: Number(data.vitamin_d_mcg) || 0,
        iron_mg: Number(data.iron_mg) || 0,
        serving_size: 100
      };
      
      setScannedFood(parsedFood);
      setBaseFood(parsedFood);
      if (data.annotated_image) {
        setAnnotatedImage(data.annotated_image);
      }
      if (data.ai_analysis) {
        setAiAnalysis(data.ai_analysis);
      }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Our servers couldn\'t identify this image. Try another clear photo.');
    } finally {
      clearInterval(stageInterval);
      setLoading(false);
    }
  };

  // Adjust calories/macros proportionally based on grams scale
  const handleServingSizeChange = (val: number) => {
    if (!baseFood || val <= 0) return;
    const ratio = val / 100;
    setScannedFood({
      food_name: scannedFood.food_name,
      serving_size: val,
      calories: Math.round(baseFood.calories * ratio),
      protein: Math.round(baseFood.protein * ratio),
      carbs: Math.round(baseFood.carbs * ratio),
      fat: Math.round(baseFood.fat * ratio),
      fiber: Math.round((baseFood.fiber || 0) * ratio),
      sugar: Math.round((baseFood.sugar || 0) * ratio),
      sodium_mg: Math.round((baseFood.sodium_mg || 0) * ratio),
      potassium_mg: Math.round((baseFood.potassium_mg || 0) * ratio),
      calcium_mg: Math.round((baseFood.calcium_mg || 0) * ratio),
      vitamin_c_mg: Math.round((baseFood.vitamin_c_mg || 0) * ratio),
      vitamin_d_mcg: Math.round((baseFood.vitamin_d_mcg || 0) * ratio),
      iron_mg: Math.round((baseFood.iron_mg || 0) * ratio),
    });
  };

  // Log meal into the database
  const handleLogMeal = async (foodData: ScannedFood) => {
    const userId = localStorage.getItem('user_id');
    if (!userId) {
      navigate('/login');
      return;
    }

    try {
      await api.post(`/meals/${userId}`, {
        food_name: `[${selectedMealType}] ${foodData.food_name}`,
        calories: Number(foodData.calories),
        protein: Number(foodData.protein),
        carbs: Number(foodData.carbs),
        fat: Number(foodData.fat),
        fiber: Number(foodData.fiber || 0),
        sugar: Number(foodData.sugar || 0),
        sodium_mg: Number(foodData.sodium_mg || 0),
        potassium_mg: Number(foodData.potassium_mg || 0),
        calcium_mg: Number(foodData.calcium_mg || 0),
        vitamin_c_mg: Number(foodData.vitamin_c_mg || 0),
        vitamin_d_mcg: Number(foodData.vitamin_d_mcg || 0),
        iron_mg: Number(foodData.iron_mg || 0),
      });
      
      setSuccess(true);
      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);
    } catch {
      setError('Could not log this meal. Please verify the entries.');
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualFood.food_name || !manualFood.calories) {
      setError('Food name and calories are required.');
      return;
    }
    
    const mult = manualFood.consumed_grams / 100;
    handleLogMeal({
      food_name: manualFood.food_name + (mult !== 1 ? ` (${manualFood.consumed_grams}g)` : ''),
      calories: Math.round(Number(manualFood.calories) * mult),
      protein: Math.round(Number(manualFood.protein || '0') * mult),
      carbs: Math.round(Number(manualFood.carbs || '0') * mult),
      fat: Math.round(Number(manualFood.fat || '0') * mult),
      fiber: Math.round(Number(manualFood.fiber || 0) * mult),
      sugar: Math.round(Number(manualFood.sugar || 0) * mult),
      sodium_mg: Math.round(Number(manualFood.sodium_mg || 0) * mult),
      potassium_mg: Math.round(Number(manualFood.potassium_mg || 0) * mult),
      calcium_mg: Math.round(Number(manualFood.calcium_mg || 0) * mult),
      vitamin_c_mg: Math.round(Number(manualFood.vitamin_c_mg || 0) * mult),
      vitamin_d_mcg: Math.round(Number(manualFood.vitamin_d_mcg || 0) * mult),
      iron_mg: Math.round(Number(manualFood.iron_mg || 0) * mult),
      serving_size: manualFood.consumed_grams,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-surface-50 to-surface-100 text-surface-900 font-sans antialiased">
      {/* Top Navigation */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-surface-200 sticky top-0 z-20 transition-all">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => navigate('/dashboard')}
                className="p-2.5 rounded-xl hover:bg-surface-100 text-surface-500 hover:text-surface-900 transition-all border border-transparent hover:border-surface-200"
              >
                <ArrowLeft size={18} />
              </button>
              <h1 className="text-xl font-bold tracking-tight">Log a Meal</h1>
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

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        
        {/* Navigation Tabs */}
        <div className="flex bg-white p-1 rounded-xl border border-surface-200 shadow-sm max-w-sm mx-auto mb-8">
          <button
            onClick={() => { setActiveTab('ai'); setError(''); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'ai'
                ? 'bg-primary-600 text-white shadow-sm'
                : 'text-surface-600 hover:text-surface-900 hover:bg-surface-50'
            }`}
          >
            <Camera size={16} />
            AI Scanner
          </button>
          <button
            onClick={() => { setActiveTab('manual'); setError(''); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'manual'
                ? 'bg-primary-600 text-white shadow-sm'
                : 'text-surface-600 hover:text-surface-900 hover:bg-surface-50'
            }`}
          >
            <Plus size={16} />
            Quick Log
          </button>
        </div>

        {/* Global Error Banner */}
        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-red-50 text-red-700 border border-red-100 text-sm font-medium flex items-start gap-3 animate-shake">
            <AlertCircle size={20} className="shrink-0 text-red-500" />
            <p className="flex-1">{error}</p>
          </div>
        )}

        {/* Success Splash Screen */}
        {success && (
          <div className="fixed inset-0 z-50 bg-white/90 backdrop-blur-md flex flex-col items-center justify-center animate-fade-in">
            <div className="h-20 w-20 bg-green-50 rounded-full flex items-center justify-center text-green-600 border border-green-200 shadow-lg shadow-green-100 mb-6 animate-bounce">
              <CheckCircle2 size={40} />
            </div>
            <h2 className="text-2xl font-bold text-surface-900 mb-2">Meal Logged Successfully!</h2>
            <p className="text-surface-500 text-sm">Redirecting to your dashboard dashboard...</p>
          </div>
        )}

        {/* TAB 1: AI PHOTO SCANNER */}
        {activeTab === 'ai' && (
          <div className="space-y-6">
            {!preview ? (
              <div 
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-3xl p-16 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 ${
                  isDragActive 
                    ? 'border-primary-500 bg-primary-50/50 scale-[0.99] shadow-inner' 
                    : 'border-surface-200 bg-white hover:border-primary-400 hover:bg-surface-50/50 shadow-sm'
                }`}
              >
                <div className="h-20 w-20 bg-primary-50 rounded-2xl flex items-center justify-center text-primary-600 mb-6 shadow-sm border border-primary-100 group-hover:scale-105 transition-transform">
                  <Camera size={36} className="animate-pulse" />
                </div>
                <h3 className="font-bold text-lg text-surface-900 mb-2">Capture your Plate</h3>
                <p className="text-surface-500 text-sm max-w-xs text-center mb-6 leading-relaxed">
                  Drag and drop your food photo here, or browse local files. Let AI compute the macros.
                </p>
                <button className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-md shadow-primary-500/10">
                  Select Image File
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef}
                  accept="image/*" 
                  className="hidden" 
                  onChange={handleFileChange} 
                />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
                
                {/* Left side: Image and Upload Controls */}
                <div className="md:col-span-5 bg-white rounded-3xl border border-surface-200 overflow-hidden shadow-sm">
                  <div className="relative aspect-square bg-surface-900 flex items-center justify-center group">
                    <img src={annotatedImage ? `data:image/png;base64,${annotatedImage}` : (preview || '')} alt="Meal preview" className="w-full h-full object-cover" />
                    {!loading && !baseFood && (
                      <button 
                        onClick={() => { setFile(null); setPreview(null); setBaseFood(null); setAnnotatedImage(null); setAiAnalysis(''); }}
                        className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white font-medium text-sm"
                      >
                        <RefreshCw size={16} />
                        Choose Different Photo
                      </button>
                    )}
                  </div>
                  
                  {!loading && !baseFood && (
                    <div className="p-4 bg-surface-50 border-t border-surface-100 flex gap-3">
                      <button 
                        onClick={() => { setFile(null); setPreview(null); }}
                        className="flex-1 bg-white hover:bg-surface-100 border border-surface-200 text-surface-700 py-3 rounded-xl text-sm font-medium transition-all"
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={handleAnalyze}
                        className="flex-1 bg-primary-600 hover:bg-primary-700 text-white py-3 rounded-xl text-sm font-semibold transition-all shadow-md shadow-primary-500/10"
                      >
                        Analyze Photo
                      </button>
                    </div>
                  )}
                </div>

                {/* Right side: Loading or Analysis Result */}
                <div className="md:col-span-7">
                  {loading && (
                    <div className="bg-white rounded-3xl border border-surface-200 p-12 flex flex-col items-center justify-center shadow-sm h-full min-h-[300px]">
                      <div className="relative flex items-center justify-center mb-6">
                        <div className="h-16 w-16 rounded-full border-4 border-primary-100 border-t-primary-600 animate-spin" />
                        <Sparkles size={20} className="absolute text-primary-500 animate-ping" />
                      </div>
                      <h4 className="font-bold text-surface-900 mb-2">Analyzing your Food...</h4>
                      <p className="text-surface-500 text-sm animate-pulse text-center">{String(loadingStage)}</p>
                    </div>
                  )}

                  {!loading && baseFood && (
                    <div className="bg-white rounded-3xl border border-surface-200 p-6 shadow-sm space-y-6 animate-fade-in">
                      
                      {/* Title block */}
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-xs font-bold text-primary-600 uppercase tracking-widest bg-primary-50 px-2.5 py-1 rounded-md">YOLOv8 Prediction</span>
                          <div className="flex items-center gap-2 mt-2">
                            <input 
                              type="text"
                              value={scannedFood.food_name}
                              onChange={(e) => setScannedFood({ ...scannedFood, food_name: e.target.value })}
                              className="text-2xl font-extrabold text-surface-900 border-b border-transparent hover:border-surface-200 focus:border-primary-500 focus:outline-none capitalize py-0.5 bg-transparent"
                            />
                            <Edit3 size={16} className="text-surface-400" />
                          </div>
                        </div>
                         <button 
                          onClick={() => { setFile(null); setPreview(null); setBaseFood(null); setAnnotatedImage(null); setAiAnalysis(''); }}
                          className="text-xs font-medium text-surface-500 hover:text-surface-900 flex items-center gap-1 bg-surface-100 px-3 py-1.5 rounded-lg transition-colors"
                        >
                          <RefreshCw size={12} />
                          Rescan
                        </button>
                      </div>

                      {/* Serving weight slider */}
                      <div className="bg-surface-50 rounded-2xl p-5 border border-surface-100 space-y-4">
                        <div className="flex items-center justify-between">
                          <label className="text-sm font-semibold text-surface-700 flex items-center gap-1.5">
                            <PieChart size={16} className="text-surface-500" />
                            Serving Portion
                          </label>
                          <span className="font-bold text-primary-600 bg-white px-3 py-1 rounded-lg border border-surface-200 text-sm">
                            {scannedFood.serving_size}g
                          </span>
                        </div>
                        <input 
                          type="range"
                          min="50"
                          max="800"
                          step="10"
                          value={scannedFood.serving_size}
                          onChange={(e) => handleServingSizeChange(Number(e.target.value))}
                          className="w-full h-1.5 bg-surface-200 rounded-lg appearance-none cursor-pointer accent-primary-600 focus:outline-none"
                        />
                        <div className="flex justify-between text-[11px] text-surface-400 font-medium">
                          <span>50g (Light)</span>
                          <span>200g (Medium)</span>
                          <span>500g (Large)</span>
                          <span>800g (Mega)</span>
                        </div>
                      </div>

                      {/* Nutrient Macro Grid */}
                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                        <div className="bg-orange-50/50 border border-orange-100 rounded-2xl p-3.5 text-center">
                          <p className="text-[10px] font-bold text-orange-600/80 uppercase tracking-wider mb-1">Calories</p>
                          <p className="font-extrabold text-xl text-orange-600">{scannedFood.calories}</p>
                          <span className="text-[10px] text-orange-600/70 font-semibold">kcal</span>
                        </div>
                        <div className="bg-rose-50/50 border border-rose-100 rounded-2xl p-3.5 text-center">
                          <p className="text-[10px] font-bold text-rose-600/80 uppercase tracking-wider mb-1">Protein</p>
                          <p className="font-extrabold text-xl text-rose-600">{scannedFood.protein}</p>
                          <span className="text-[10px] text-rose-600/70 font-semibold">g</span>
                        </div>
                        <div className="bg-amber-50/50 border border-amber-100 rounded-2xl p-3.5 text-center">
                          <p className="text-[10px] font-bold text-amber-600/80 uppercase tracking-wider mb-1">Carbs</p>
                          <p className="font-extrabold text-xl text-amber-600">{scannedFood.carbs}</p>
                          <span className="text-[10px] text-amber-600/70 font-semibold">g</span>
                        </div>
                        <div className="bg-yellow-50/50 border border-yellow-100 rounded-2xl p-3.5 text-center">
                          <p className="text-[10px] font-bold text-yellow-600/80 uppercase tracking-wider mb-1">Fat</p>
                          <p className="font-extrabold text-xl text-yellow-600">{scannedFood.fat}</p>
                          <span className="text-[10px] text-yellow-600/70 font-semibold">g</span>
                        </div>
                        <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-3.5 text-center">
                          <p className="text-[10px] font-bold text-emerald-600/80 uppercase tracking-wider mb-1">Fiber</p>
                          <p className="font-extrabold text-xl text-emerald-600">{scannedFood.fiber}</p>
                          <span className="text-[10px] text-emerald-600/70 font-semibold">g</span>
                        </div>
                        <div className="bg-purple-50/50 border border-purple-100 rounded-2xl p-3.5 text-center">
                          <p className="text-[10px] font-bold text-purple-600/80 uppercase tracking-wider mb-1">Sugar</p>
                          <p className="font-extrabold text-xl text-purple-600">{scannedFood.sugar}</p>
                          <span className="text-[10px] text-purple-600/70 font-semibold">g</span>
                        </div>
                      </div>

                      {/* Micronutrients */}
                      <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                        <div className="bg-surface-50 border border-surface-200 rounded-xl p-2.5 text-center">
                          <p className="text-[9px] font-bold text-surface-500 uppercase mb-0.5">Sodium</p>
                          <p className="font-bold text-sm text-surface-700">{scannedFood.sodium_mg}</p>
                          <span className="text-[8px] text-surface-400 font-semibold">mg</span>
                        </div>
                        <div className="bg-surface-50 border border-surface-200 rounded-xl p-2.5 text-center">
                          <p className="text-[9px] font-bold text-surface-500 uppercase mb-0.5">Potass.</p>
                          <p className="font-bold text-sm text-surface-700">{scannedFood.potassium_mg}</p>
                          <span className="text-[8px] text-surface-400 font-semibold">mg</span>
                        </div>
                        <div className="bg-surface-50 border border-surface-200 rounded-xl p-2.5 text-center">
                          <p className="text-[9px] font-bold text-surface-500 uppercase mb-0.5">Calcium</p>
                          <p className="font-bold text-sm text-surface-700">{scannedFood.calcium_mg}</p>
                          <span className="text-[8px] text-surface-400 font-semibold">mg</span>
                        </div>
                        <div className="bg-surface-50 border border-surface-200 rounded-xl p-2.5 text-center">
                          <p className="text-[9px] font-bold text-surface-500 uppercase mb-0.5">Vit C</p>
                          <p className="font-bold text-sm text-surface-700">{scannedFood.vitamin_c_mg}</p>
                          <span className="text-[8px] text-surface-400 font-semibold">mg</span>
                        </div>
                        <div className="bg-surface-50 border border-surface-200 rounded-xl p-2.5 text-center">
                          <p className="text-[9px] font-bold text-surface-500 uppercase mb-0.5">Vit D</p>
                          <p className="font-bold text-sm text-surface-700">{scannedFood.vitamin_d_mcg}</p>
                          <span className="text-[8px] text-surface-400 font-semibold">mcg</span>
                        </div>
                        <div className="bg-surface-50 border border-surface-200 rounded-xl p-2.5 text-center">
                          <p className="text-[9px] font-bold text-surface-500 uppercase mb-0.5">Iron</p>
                          <p className="font-bold text-sm text-surface-700">{scannedFood.iron_mg}</p>
                          <span className="text-[8px] text-surface-400 font-semibold">mg</span>
                        </div>
                      </div>

                      <div className="flex items-start gap-2.5 p-3.5 bg-blue-50/40 border border-blue-100/50 rounded-2xl text-xs text-blue-800">
                        <Info size={16} className="shrink-0 text-blue-500 mt-0.5" />
                        <p className="leading-relaxed">
                          Adjusting the serving portion automatically estimates and rescales all macronutrients proportionally based on your food target parameters.
                        </p>
                      </div>

                      {aiAnalysis && (
                        <div className="bg-primary-50/50 border border-primary-100/65 rounded-2xl p-5 space-y-3 shadow-xs">
                          <div className="flex items-center gap-2 text-primary-700 font-extrabold text-sm">
                            <Sparkles size={16} />
                            <span>AI Dietitian Assessment</span>
                          </div>
                          <p className="text-surface-700 text-xs leading-relaxed font-medium whitespace-pre-line italic">
                            "{aiAnalysis}"
                          </p>
                        </div>
                      )}

                      {/* Meal Category Selector */}
                      <div className="space-y-2.5">
                        <label className="text-xs font-bold text-surface-400 uppercase tracking-widest block">Meal Category</label>
                        <div className="grid grid-cols-4 gap-1.5 bg-surface-50 p-1.5 rounded-2xl border border-surface-200">
                          {(['Breakfast', 'Lunch', 'Dinner', 'Snack'] as const).map((type) => (
                            <button
                              key={type}
                              type="button"
                              onClick={() => setSelectedMealType(type)}
                              className={`py-2.5 rounded-xl text-xs font-extrabold transition-all duration-200 cursor-pointer ${
                                selectedMealType === type
                                  ? 'bg-primary-600 text-white shadow-md shadow-primary-500/10'
                                  : 'text-surface-600 hover:text-surface-900 hover:bg-white border border-transparent'
                              }`}
                            >
                              {type}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Log Action Button */}
                      <button 
                        onClick={() => handleLogMeal(scannedFood)}
                        className="w-full bg-primary-600 hover:bg-primary-700 text-white py-4 px-4 rounded-2xl font-bold transition-all shadow-lg shadow-primary-500/25 flex items-center justify-center gap-2 group"
                      >
                        Confirm & Log Meal
                        <Plus size={18} className="group-hover:translate-x-0.5 transition-transform" />
                      </button>
                    </div>
                  )}
                </div>

              </div>
            )}
          </div>
        )}

        {/* TAB 2: QUICK LOG (MANUAL FORM) */}
        {activeTab === 'manual' && (
          <div className="max-w-xl mx-auto">
            <form onSubmit={handleManualSubmit} className="bg-white rounded-3xl border border-surface-200 p-8 shadow-sm space-y-6">
              <h3 className="font-bold text-lg text-surface-900 border-b border-surface-100 pb-4">Log Food Manually</h3>
              
              <div className="space-y-2">
                <label className="text-sm font-semibold text-surface-700">Food Name</label>
                <input 
                  type="text"
                  placeholder="e.g. Greek Yogurt, Oats, Apple"
                  value={manualFood.food_name}
                  onChange={(e) => setManualFood({ ...manualFood, food_name: e.target.value })}
                  className="w-full bg-surface-50 border border-surface-200 focus:border-primary-500 focus:bg-white text-surface-900 rounded-xl px-4 py-3 focus:outline-none focus:ring-4 focus:ring-primary-500/10 transition-all font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-surface-700">Calories (kcal)</label>
                  <input 
                    type="number"
                    placeholder="350"
                    value={manualFood.calories}
                    onChange={(e) => setManualFood({ ...manualFood, calories: e.target.value })}
                    className="w-full bg-surface-50 border border-surface-200 focus:border-primary-500 focus:bg-white text-surface-900 rounded-xl px-4 py-3 focus:outline-none focus:ring-4 focus:ring-primary-500/10 transition-all font-medium"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-surface-700">Protein (g)</label>
                  <input 
                    type="number"
                    placeholder="12"
                    value={manualFood.protein}
                    onChange={(e) => setManualFood({ ...manualFood, protein: e.target.value })}
                    className="w-full bg-surface-50 border border-surface-200 focus:border-primary-500 focus:bg-white text-surface-900 rounded-xl px-4 py-3 focus:outline-none focus:ring-4 focus:ring-primary-500/10 transition-all font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-surface-700">Carbs (g)</label>
                  <input 
                    type="number"
                    placeholder="45"
                    value={manualFood.carbs}
                    onChange={(e) => setManualFood({ ...manualFood, carbs: e.target.value })}
                    className="w-full bg-surface-50 border border-surface-200 focus:border-primary-500 focus:bg-white text-surface-900 rounded-xl px-4 py-3 focus:outline-none focus:ring-4 focus:ring-primary-500/10 transition-all font-medium"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-surface-700">Fat (g)</label>
                  <input 
                    type="number"
                    placeholder="8"
                    value={manualFood.fat}
                    onChange={(e) => setManualFood({ ...manualFood, fat: e.target.value })}
                    className="w-full bg-surface-50 border border-surface-200 focus:border-primary-500 focus:bg-white text-surface-900 rounded-xl px-4 py-3 focus:outline-none focus:ring-4 focus:ring-primary-500/10 transition-all font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-surface-700">Fiber (g)</label>
                  <input 
                    type="number"
                    placeholder="5"
                    value={manualFood.fiber}
                    onChange={(e) => setManualFood({ ...manualFood, fiber: e.target.value })}
                    className="w-full bg-surface-50 border border-surface-200 focus:border-primary-500 focus:bg-white text-surface-900 rounded-xl px-4 py-3 focus:outline-none focus:ring-4 focus:ring-primary-500/10 transition-all font-medium"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-surface-700">Sugar (g)</label>
                  <input 
                    type="number"
                    placeholder="10"
                    value={manualFood.sugar}
                    onChange={(e) => setManualFood({ ...manualFood, sugar: e.target.value })}
                    className="w-full bg-surface-50 border border-surface-200 focus:border-primary-500 focus:bg-white text-surface-900 rounded-xl px-4 py-3 focus:outline-none focus:ring-4 focus:ring-primary-500/10 transition-all font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-surface-700">Sodium (mg)</label>
                  <input 
                    type="number"
                    placeholder="450"
                    value={manualFood.sodium_mg}
                    onChange={(e) => setManualFood({ ...manualFood, sodium_mg: e.target.value })}
                    className="w-full bg-surface-50 border border-surface-200 focus:border-primary-500 focus:bg-white text-surface-900 rounded-xl px-4 py-3 focus:outline-none focus:ring-4 focus:ring-primary-500/10 transition-all font-medium"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-surface-700">Potassium (mg)</label>
                  <input 
                    type="number"
                    placeholder="200"
                    value={manualFood.potassium_mg}
                    onChange={(e) => setManualFood({ ...manualFood, potassium_mg: e.target.value })}
                    className="w-full bg-surface-50 border border-surface-200 focus:border-primary-500 focus:bg-white text-surface-900 rounded-xl px-4 py-3 focus:outline-none focus:ring-4 focus:ring-primary-500/10 transition-all font-medium"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-surface-700">Calcium (mg)</label>
                  <input 
                    type="number"
                    placeholder="40"
                    value={manualFood.calcium_mg}
                    onChange={(e) => setManualFood({ ...manualFood, calcium_mg: e.target.value })}
                    className="w-full bg-surface-50 border border-surface-200 focus:border-primary-500 focus:bg-white text-surface-900 rounded-xl px-4 py-3 focus:outline-none focus:ring-4 focus:ring-primary-500/10 transition-all font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-surface-700">Vit C (mg)</label>
                  <input 
                    type="number"
                    placeholder="5"
                    value={manualFood.vitamin_c_mg}
                    onChange={(e) => setManualFood({ ...manualFood, vitamin_c_mg: e.target.value })}
                    className="w-full bg-surface-50 border border-surface-200 focus:border-primary-500 focus:bg-white text-surface-900 rounded-xl px-4 py-3 focus:outline-none focus:ring-4 focus:ring-primary-500/10 transition-all font-medium"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-surface-700">Vit D (mcg)</label>
                  <input 
                    type="number"
                    placeholder="0"
                    value={manualFood.vitamin_d_mcg}
                    onChange={(e) => setManualFood({ ...manualFood, vitamin_d_mcg: e.target.value })}
                    className="w-full bg-surface-50 border border-surface-200 focus:border-primary-500 focus:bg-white text-surface-900 rounded-xl px-4 py-3 focus:outline-none focus:ring-4 focus:ring-primary-500/10 transition-all font-medium"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-surface-700">Iron (mg)</label>
                  <input 
                    type="number"
                    placeholder="1"
                    value={manualFood.iron_mg}
                    onChange={(e) => setManualFood({ ...manualFood, iron_mg: e.target.value })}
                    className="w-full bg-surface-50 border border-surface-200 focus:border-primary-500 focus:bg-white text-surface-900 rounded-xl px-4 py-3 focus:outline-none focus:ring-4 focus:ring-primary-500/10 transition-all font-medium"
                  />
                </div>
              </div>

              {/* Portion Scale */}
              <div className="bg-surface-50 rounded-2xl p-5 border border-surface-100 space-y-4">
                <div className="flex items-start gap-2.5 p-3 bg-blue-50/40 border border-blue-100/50 rounded-2xl text-xs text-blue-800">
                  <Info size={16} className="shrink-0 text-blue-500 mt-0.5" />
                  <p className="leading-relaxed">
                    Enter the nutritional values for <strong>100g</strong> of the food above, then use the slider below to select how many grams you actually ate.
                  </p>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <label className="text-sm font-semibold text-surface-700 flex items-center gap-1.5">
                    <PieChart size={16} className="text-surface-500" />
                    Amount Consumed
                  </label>
                  <span className="font-bold text-primary-600 bg-white px-3 py-1 rounded-lg border border-surface-200 text-sm shadow-sm">
                    {manualFood.consumed_grams}g
                  </span>
                </div>
                <input 
                  type="range"
                  min="10"
                  max="1000"
                  step="10"
                  value={manualFood.consumed_grams}
                  onChange={(e) => setManualFood({ ...manualFood, consumed_grams: Number(e.target.value) })}
                  className="w-full h-1.5 bg-surface-200 rounded-lg appearance-none cursor-pointer accent-primary-600 focus:outline-none"
                />
                <div className="flex justify-between text-[11px] text-surface-400 font-medium">
                  <span>10g</span>
                  <span>100g (Base)</span>
                  <span>1000g</span>
                </div>
                
                {manualFood.calories && manualFood.consumed_grams !== 100 && (
                  <div className="p-3 bg-primary-50 rounded-xl border border-primary-100 mt-2 flex justify-between items-center text-xs text-primary-700 font-medium animate-fade-in shadow-xs">
                    <span>Total logged calories will be:</span>
                    <span className="font-bold text-primary-800 text-sm">{Math.round(Number(manualFood.calories) * (manualFood.consumed_grams / 100))} kcal</span>
                  </div>
                )}
              </div>

              {/* Meal Category Selector */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-surface-700">Meal Category</label>
                <div className="grid grid-cols-4 gap-1.5 bg-surface-50 p-1.5 rounded-2xl border border-surface-200">
                  {(['Breakfast', 'Lunch', 'Dinner', 'Snack'] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setSelectedMealType(type)}
                      className={`py-2.5 rounded-xl text-xs font-extrabold transition-all duration-200 cursor-pointer ${
                        selectedMealType === type
                          ? 'bg-primary-600 text-white shadow-md shadow-primary-500/10'
                          : 'text-surface-600 hover:text-surface-900 hover:bg-white border border-transparent'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <button 
                type="submit"
                className="w-full bg-primary-600 hover:bg-primary-700 text-white py-4 rounded-xl font-bold transition-all shadow-lg shadow-primary-500/25 mt-4"
              >
                Log Meal to Dashboard
              </button>
            </form>
          </div>
        )}

      </main>
    </div>
  );
}

