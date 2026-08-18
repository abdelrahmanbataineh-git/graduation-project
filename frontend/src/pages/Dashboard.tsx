/**
 * CHEAT SHEET FOR PRESENTATION - `Dashboard.tsx`
 * ===========================================================
 * WHAT THIS FILE DOES:
 * This is the main screen the user sees after logging in. It fetches all their data and displays it beautifully.
 * 
 * HOW IT WORKS:
 * 1. Data Fetching (`useEffect`): When the page loads, it talks to our FastAPI backend (`api.ts`) to get the user's profile, their targets (calories/macros), their meal history for the week, and today's water logs.
 * 2. State Management (`useState`): It stores all this data locally in the browser so the page updates instantly.
 * 3. Charts (`Recharts`): We use a library called Recharts to draw the interactive "Weight Projection" graph and the "Macro Breakdown" pie charts.
 * 4. Notifications (`pollNotifications`): It constantly checks the backend for new alerts (like "Drink water!") and shows a popup bell icon if there's a new message.
 * ===========================================================
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, LogOut, Flame, Cookie, Beef, Droplets, Sparkles, Dumbbell, Heart, Compass, Check, Calendar, ArrowRight, User, Trash2, Trophy, Award, TrendingUp, Utensils, Bot, Leaf, Candy, Settings, Bell } from 'lucide-react';
import { Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Line, ReferenceLine, ComposedChart } from 'recharts';
import api from '../api';
import ThemeToggle from '../components/ThemeToggle';

const parseMealName = (foodName: string) => {
  const match = foodName.match(/^\[(Breakfast|Lunch|Dinner|Snack)\]\s*(.*)/i);
  if (match) {
    return {
      type: match[1] as 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack',
      cleanName: match[2]
    };
  }
  return {
    type: null,
    cleanName: foodName
  };
};

interface Macros {
  calories: number;
  protein_grams: number;
  carbs_grams: number;
  fat_grams: number;
  fiber_grams: number;
  sugar_grams: number;
  sodium_mg: number;
  potassium_mg: number;
  calcium_mg: number;
  vitamin_c_mg: number;
  vitamin_d_mcg: number;
  iron_mg: number;
}

interface Meal {
  id: number;
  food_name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium_mg: number;
  potassium_mg: number;
  calcium_mg: number;
  vitamin_c_mg: number;
  vitamin_d_mcg: number;
  iron_mg: number;
  created_at: string;
}

interface UserProfile {
  email: string;
  full_name?: string;
  age: number;
  height: number;
  weight: number;
  target_weight: number | null;
  goal: string;
}

// Food Recommendation Type
interface Recommendation {
  name: string;
  macros: string;
  description: string;
  category: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';
}

// Removed mockWeightData

// Static list of confetti colors and stable config for animations
const confettiColors = ['bg-teal-400', 'bg-rose-400', 'bg-amber-400', 'bg-yellow-400', 'bg-emerald-400', 'bg-sky-400', 'bg-purple-400'];
const confettiParticles = Array.from({ length: 24 }).map((_, i) => ({
  id: i,
  color: confettiColors[i % confettiColors.length],
  left: `${(i * 17) % 100}%`,
  delay: `${(i * 0.25).toFixed(2)}s`,
  size: i % 3 === 0 ? 'h-2 w-2 rounded-full' : i % 3 === 1 ? 'h-3 w-1.5 rotate-45' : 'h-2 w-2 rounded-xs',
  isLeft: i % 2 === 0
}));

export default function Dashboard() {
  const navigate = useNavigate();
  const [macros, setMacros] = useState<Macros | null>(null);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('overview');


  // Water Tracker State
  const [waterGoal, setWaterGoal] = useState<number>(2500);
  const [waterIntake, setWaterIntake] = useState<number>(0);


  // Profile Menu Dropdown State
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileUpdatingError, setProfileUpdatingError] = useState<string | null>(null);
  
  // Notifications state
  interface AppNotification {
    id: number;
    message: string;
    created_at: string;
  }
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  const [tempProfile, setTempProfile] = useState({
    age: 25,
    height: 175,
    weight: 70,
    target_weight: '' as string | number,
    goal: 'maintain weight',
    gender: 'male',
    activity_level: 'sedentary'
  });

  useEffect(() => {
    const userId = localStorage.getItem('user_id');
    if (!userId) {
      navigate('/login');
      return;
    }

    const fetchData = async () => {
      try {
        const storedGender = localStorage.getItem('gender') || 'male';
        const [targetsRes, mealsRes, profileRes, waterRes] = await Promise.all([
          api.get(`/users/${userId}/targets?gender=${storedGender}`),
          api.get(`/meals/history/${userId}`),
          api.get(`/users/${userId}`),
          api.get(`/water/${userId}/today`).catch(() => ({ data: { total_ml: 0 } }))
        ]);
        setMacros(targetsRes.data);
        setMeals(mealsRes.data);
        setWaterIntake(waterRes.data.total_ml || 0);

        if (profileRes.data) {
          const storedTargetWeight = localStorage.getItem('target_weight');
          const targetWeightNum = storedTargetWeight ? parseFloat(storedTargetWeight) : null;
          
          const userDbWaterGoal = profileRes.data.water_goal_ml || 2500;
          setWaterGoal(userDbWaterGoal);
          
          setUserProfile({ ...profileRes.data, target_weight: targetWeightNum });
          setTempProfile({
            age: profileRes.data.age || 25,
            height: profileRes.data.height || 175,
            weight: profileRes.data.weight || 70,
            target_weight: targetWeightNum || '',
            goal: profileRes.data.goal || 'maintain weight',
            gender: storedGender,
            activity_level: profileRes.data.activity_level || 'sedentary'
          });
        }
      } catch (err) {
        console.error('Failed to fetch dashboard data', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Polling logic for smart notifications
    const pollNotifications = async () => {
      try {
        const localHour = new Date().getHours();
        const localDay = new Date().getDay();
        await api.get(`/notifications/${userId}/check?local_hour=${localHour}&day_of_week=${localDay}`);
        
        const notifRes = await api.get(`/notifications/${userId}`);
        setNotifications(notifRes.data);
      } catch (err) {
        console.error('Failed to poll notifications', err);
      }
    };
    pollNotifications();
    const interval = setInterval(pollNotifications, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [navigate]);

  // Handle auto scrolling to target element section
  const handleScrollTo = (sectionId: string) => {
    setActiveSection(sectionId);
    const element = document.getElementById(sectionId);
    if (element) {
      const navOffset = 120; // adjust offset for sticky navs
      const elementPosition = element.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({
        top: elementPosition - navOffset,
        behavior: 'smooth'
      });
    }
  };

  const handleAddWater = async (amount_ml: number) => {
    const userId = localStorage.getItem('user_id');
    if (!userId) return;
    try {
      await api.post(`/water/${userId}`, { amount_ml });
      setWaterIntake(prev => prev + amount_ml);
    } catch (err) {
      console.error('Failed to log water', err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user_id');
    navigate('/login');
  };

  // Handle Profile settings save updates
  const handleSaveProfile = async () => {
    setSavingProfile(true);
    setProfileUpdatingError(null);
    const userId = localStorage.getItem('user_id');
    try {
      // Save target weight and gender locally
      if (tempProfile.target_weight !== '') {
        localStorage.setItem('target_weight', tempProfile.target_weight.toString());
      } else {
        localStorage.removeItem('target_weight');
      }
      localStorage.setItem('gender', tempProfile.gender);

      const derivedGoal = tempProfile.target_weight ? (Number(tempProfile.target_weight) > Number(tempProfile.weight) ? 'gain muscle' : Number(tempProfile.target_weight) < Number(tempProfile.weight) ? 'lose weight' : 'maintain weight') : tempProfile.goal.toLowerCase();

      await api.put(`/users/${userId}`, {
        age: Number(tempProfile.age),
        height: Number(tempProfile.height),
        weight: Number(tempProfile.weight),
        goal: derivedGoal,
        activity_level: tempProfile.activity_level
      });

      // Refetch both targets (for macros recalculation) and user details
      const [targetsRes, profileRes] = await Promise.all([
        api.get(`/users/${userId}/targets?gender=${tempProfile.gender}`),
        api.get(`/users/${userId}`)
      ]);

      const storedTargetWeight = localStorage.getItem('target_weight');
      const targetWeightNum = storedTargetWeight ? parseFloat(storedTargetWeight) : null;

      setMacros(targetsRes.data);
      setUserProfile({ ...profileRes.data, target_weight: targetWeightNum });
      setShowProfileMenu(false);
    } catch (err) {
      console.error('Failed to update user profile info', err);
      setProfileUpdatingError('Failed to save updates. Please try again.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleDeleteMeal = async (mealId: number) => {
    try {
      await api.delete(`/meals/${mealId}`);
      setMeals(prevMeals => prevMeals.filter(m => m.id !== mealId));
    } catch (err) {
      console.error('Failed to delete meal', err);
    }
  };

  // New function to log a recommended meal directly
  const handleLogMeal = async (rec: Recommendation) => {
    try {
      const userId = localStorage.getItem('user_id');
      if (!userId) return;
      // Parse macros string e.g., "380 Cal • 22g P • 48g C • 8g F"
      const parts = rec.macros.split(' • ');
      const calories = parseFloat(parts[0].replace('Cal', '').trim());
      const protein = parseFloat(parts[1].replace('g P', '').trim());
      const carbs = parseFloat(parts[2].replace('g C', '').trim());
      const fat = parseFloat(parts[3].replace('g F', '').trim());

      const response = await api.post(`/meals/${userId}`, {
        food_name: `[${rec.category}] ${rec.name}`,
        calories,
        protein,
        carbs,
        fat,
      });
      // Prepend the newly logged meal to state for immediate UI update
      setMeals([...meals, response.data]);
    } catch (err) {
      console.error('Failed to log recommended meal', err);
    }
  };

  const handleDismissNotification = async (notifId: number) => {
    try {
      await api.put(`/notifications/${notifId}/read`);
      setNotifications(prev => prev.filter(n => n.id !== notifId));
    } catch (err) {
      console.error('Failed to dismiss notification', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-surface-50 to-surface-100">
        <div className="flex flex-col items-center gap-4">
          <div className="relative flex items-center justify-center">
            <div className="h-16 w-16 rounded-full border-4 border-primary-100 border-t-primary-600 animate-spin" />
            <Activity className="absolute text-primary-500 animate-pulse" size={24} />
          </div>
          <p className="text-surface-500 text-sm font-medium">Assembling your health profile...</p>
        </div>
      </div>
    );
  }

  // Calculate consumed totals for today
  const todayKey = new Date().toDateString();
  const todayMeals = meals.filter(meal => new Date(meal.created_at).toDateString() === todayKey);

  const consumed = todayMeals.reduce(
    (acc, meal) => ({
      calories: acc.calories + meal.calories,
      protein: acc.protein + meal.protein,
      carbs: acc.carbs + meal.carbs,
      fat: acc.fat + meal.fat,
      fiber: acc.fiber + (meal.fiber || 0),
      sugar: acc.sugar + (meal.sugar || 0),
      sodium: acc.sodium + (meal.sodium_mg || 0),
      potassium: acc.potassium + (meal.potassium_mg || 0),
      calcium: acc.calcium + (meal.calcium_mg || 0),
      vitC: acc.vitC + (meal.vitamin_c_mg || 0),
      vitD: acc.vitD + (meal.vitamin_d_mcg || 0),
      iron: acc.iron + (meal.iron_mg || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0, potassium: 0, calcium: 0, vitC: 0, vitD: 0, iron: 0 }
  );

  // Daily target and goal achievement calculations
  const calorieTarget = macros?.calories || 2000;
  const proteinTarget = macros?.protein_grams || 120;
  const carbsTarget = macros?.carbs_grams || 150;
  const fatTarget = macros?.fat_grams || 60;
  const fiberTarget = macros?.fiber_grams || 28;
  const sugarTarget = macros?.sugar_grams || 50;

  const goalItems = [
    { name: 'Calories', met: consumed.calories >= calorieTarget, label: 'Calories', value: Math.round(consumed.calories), target: calorieTarget, unit: ' kcal' },
    { name: 'Protein', met: consumed.protein >= proteinTarget, label: 'Protein', value: Math.round(consumed.protein), target: proteinTarget, unit: 'g' },
    { name: 'Carbs', met: consumed.carbs >= carbsTarget, label: 'Carbs', value: Math.round(consumed.carbs), target: carbsTarget, unit: 'g' },
    { name: 'Fat', met: consumed.fat >= fatTarget, label: 'Fat', value: Math.round(consumed.fat), target: fatTarget, unit: 'g' },
    { name: 'Fiber', met: consumed.fiber >= fiberTarget, label: 'Fiber', value: Math.round(consumed.fiber), target: fiberTarget, unit: 'g' },
    { name: 'Sugar', met: consumed.sugar >= sugarTarget, label: 'Sugar', value: Math.round(consumed.sugar), target: sugarTarget, unit: 'g' },
  ];

  const sodiumTarget = macros?.sodium_mg || 2300;
  const potassiumTarget = macros?.potassium_mg || 3400;
  const calciumTarget = macros?.calcium_mg || 1000;
  const vitCTarget = macros?.vitamin_c_mg || 90;
  const vitDTarget = macros?.vitamin_d_mcg || 15;
  const ironTarget = macros?.iron_mg || 8;

  const micronutrientItems = [
    { name: 'Sodium', met: consumed.sodium >= sodiumTarget, label: 'Sodium', value: Math.round(consumed.sodium), target: sodiumTarget, unit: 'mg' },
    { name: 'Potassium', met: consumed.potassium >= potassiumTarget, label: 'Potass.', value: Math.round(consumed.potassium), target: potassiumTarget, unit: 'mg' },
    { name: 'Calcium', met: consumed.calcium >= calciumTarget, label: 'Calcium', value: Math.round(consumed.calcium), target: calciumTarget, unit: 'mg' },
    { name: 'Vit C', met: consumed.vitC >= vitCTarget, label: 'Vit C', value: Math.round(consumed.vitC), target: vitCTarget, unit: 'mg' },
    { name: 'Vit D', met: consumed.vitD >= vitDTarget, label: 'Vit D', value: Math.round(consumed.vitD), target: vitDTarget, unit: 'mcg' },
    { name: 'Iron', met: consumed.iron >= ironTarget, label: 'Iron', value: Math.round(consumed.iron), target: ironTarget, unit: 'mg' },
  ];

  const completedGoalsCount = goalItems.filter(item => item.met).length;
  const progressPercent = Math.round((completedGoalsCount / 6) * 100);

  // Generate Weekly Calorie Data
  const getWeeklyCalorieData = () => {
    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const today = new Date();
    const targetCal = macros?.calories || 2000;
    const dataMap: { [key: string]: { day: string; dateStr: string; Consumed: number; Target: number } } = {};

    // Initialize the last 7 days with 0 consumed calories
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const dayName = daysOfWeek[d.getDay()];
      const dateKey = d.toDateString();

      dataMap[dateKey] = {
        day: `${dayName} ${d.getDate()}/${d.getMonth() + 1}`,
        dateStr: dateKey,
        Consumed: 0,
        Target: targetCal
      };
    }

    // Populate with actual meals from the database
    meals.forEach(meal => {
      const mealDate = new Date(meal.created_at);
      const dateKey = mealDate.toDateString();
      if (dataMap[dateKey]) {
        dataMap[dateKey].Consumed += Math.round(meal.calories);
      }
    });

    return Object.values(dataMap);
  };

  // Get food recommendations and quotes based on user goal
  const getPersonalizedInsights = () => {
    const goalLower = (userProfile?.goal || '').toLowerCase();
    
    let activeGoalTitle = 'Maintain Weight Balanced diet';
    let motivation = 'Balance your portions and fuel your body with wholesome nutrients daily.';
    let recommendations: Recommendation[] = [
      // Maintain Weight Recommendations
      { name: 'Classic Berry Protein Oats', macros: '380 Cal • 22g P • 48g C • 8g F', description: 'Creamy rolled oats mixed with vanilla whey, blueberries, and flax seeds.', category: 'Breakfast' },
      { name: 'Spinach & Feta Egg Muffin Cups', macros: '290 Cal • 18g P • 12g C • 16g F', description: 'Savory baked egg muffins stuffed with baby spinach, feta cheese, and tomatoes.', category: 'Breakfast' },
      { name: 'Granola Fruit Bowl', macros: '340 Cal • 8g P • 55g C • 10g F', description: 'Crunchy maple granola, fresh strawberries, banana slices, and unsweetened almond milk.', category: 'Breakfast' },
      { name: 'Avocado Sourdough Toast', macros: '310 Cal • 10g P • 32g C • 15g F', description: 'Sourdough toast topped with mashed avocado, cherry tomatoes, and hemp hearts.', category: 'Breakfast' },
      
      { name: 'Quinoa & Avocado Bowl', macros: '450 Cal • 12g P • 58g C • 15g F', description: 'Rich in dietary fiber and essential plant nutrients.', category: 'Lunch' },
      { name: 'Mediterranean Chickpea Wrap', macros: '410 Cal • 14g P • 52g C • 16g F', description: 'Whole wheat wrap stuffed with roasted chickpeas, cucumbers, olives, and tahini.', category: 'Lunch' },
      { name: 'Turkey & Swiss Sandwich', macros: '390 Cal • 28g P • 36g C • 12g F', description: 'Sliced deli turkey breast, Swiss cheese, honey mustard, and greens on rye.', category: 'Lunch' },
      { name: 'Superfood Kale Salad', macros: '360 Cal • 10g P • 42g C • 18g F', description: 'Shredded kale, sliced almonds, dried cranberries, and edamame tossed in vinaigrette.', category: 'Lunch' },
      
      { name: 'Lemon Herb Salmon Wrap', macros: '380 Cal • 28g P • 22g C • 12g F', description: 'Clean protein with hearty Omega-3 fatty acids.', category: 'Dinner' },
      { name: 'Pesto Chicken with Quinoa', macros: '490 Cal • 38g P • 34g C • 18g F', description: 'Baked chicken breast smothered in basil pesto, served alongside fluffy red quinoa.', category: 'Dinner' },
      { name: 'Lean Pork Chop & Roasted Potatoes', macros: '460 Cal • 32g P • 40g C • 14g F', description: 'Herb-crusted pork chop served with rosemary roasted baby potatoes and asparagus.', category: 'Dinner' },
      { name: 'Shrimp Taco Bowl', macros: '430 Cal • 26g P • 48g C • 12g F', description: 'Grilled shrimp, brown rice, black beans, topped with a vibrant mango-cilantro salsa.', category: 'Dinner' },
      
      { name: 'Greek Yogurt Parfait', macros: '210 Cal • 18g P • 14g C • 4g F', description: 'High calcium and probiotic friendly snack.', category: 'Snack' },
      { name: 'Apple Slices & Peanut Butter', macros: '220 Cal • 5g P • 25g C • 12g F', description: 'Crisp apple wedges served with all-natural creamy peanut butter.', category: 'Snack' },
      { name: 'Dark Chocolate & Almonds', macros: '190 Cal • 4g P • 15g C • 13g F', description: 'A satisfying treat of two squares of dark chocolate (70%+) and raw almonds.', category: 'Snack' },
      { name: 'Mixed Berries & Walnuts', macros: '170 Cal • 3g P • 18g C • 11g F', description: 'A handful of fresh blueberries, raspberries, and walnuts for cognitive health.', category: 'Snack' }
    ];

    if (goalLower.includes('lose') || goalLower.includes('deficit') || goalLower.includes('cut')) {
      activeGoalTitle = 'Weight Loss & Caloric Deficit';
      motivation = 'Focus on high-volume, fiber-rich foods that keep you satiated while staying in your target calorie range.';
      recommendations = [
        // Weight Loss Recommendations
        { name: 'Egg White Veggie Scramble', macros: '240 Cal • 22g P • 8g C • 4g F', description: 'Extremely lean protein source paired with spinach and bell peppers.', category: 'Breakfast' },
        { name: 'Chia Seed & Berry Pudding', macros: '180 Cal • 6g P • 18g C • 7g F', description: 'Nutrient-dense fiber-rich pudding sweetened with stevia.', category: 'Breakfast' },
        { name: 'Avocado & Poached Egg Toast', macros: '280 Cal • 12g P • 24g C • 14g F', description: 'Light whole-grain bread topped with mashed avocado and a soft-boiled egg.', category: 'Breakfast' },
        { name: 'High-Protein Green Smoothie', macros: '220 Cal • 24g P • 15g C • 2g F', description: 'Spinach, celery, and green apple blended with vanilla whey protein.', category: 'Breakfast' },
        
        { name: 'Warm Chicken Breast Salad', macros: '350 Cal • 35g P • 12g C • 8g F', description: 'Leafy green base loaded with grilled protein and cucumber.', category: 'Lunch' },
        { name: 'Tuna Salad Lettuce Wraps', macros: '280 Cal • 30g P • 6g C • 9g F', description: 'Flaked tuna mixed with greek yogurt, celery, and wrapped in romaine lettuce.', category: 'Lunch' },
        { name: 'Shrimp & Zucchini Noodles', macros: '310 Cal • 28g P • 14g C • 7g F', description: 'Low-carb zucchini spirals cooked with shrimp, garlic, and cherry tomatoes.', category: 'Lunch' },
        { name: 'Lentil Vegetable Soup', macros: '260 Cal • 15g P • 38g C • 3g F', description: 'Hearty soup filled with black lentils, carrots, celery, and mild herbs.', category: 'Lunch' },
        
        { name: 'Baked Cod with Zucchini', macros: '290 Cal • 30g P • 10g C • 5g F', description: 'Very low fat fish cooked under light olive oil mist.', category: 'Dinner' },
        { name: 'Turkey Stuffed Bell Peppers', macros: '340 Cal • 28g P • 20g C • 10g F', description: 'Lean ground turkey, cauliflower rice, and herbs baked inside sweet peppers.', category: 'Dinner' },
        { name: 'Grilled Chicken & Broccoli', macros: '320 Cal • 38g P • 12g C • 6g F', description: 'Fire-grilled chicken breast served with steamed garlic broccoli florets.', category: 'Dinner' },
        { name: 'Sirloin Steak & Asparagus', macros: '380 Cal • 35g P • 8g C • 18g F', description: 'Lean cut steak seared to medium, paired with roasted asparagus spears.', category: 'Dinner' },
        
        { name: 'Greek Yogurt & Almonds', macros: '160 Cal • 15g P • 8g C • 6g F', description: 'Plain zero-fat greek yogurt garnished with sliced raw almonds.', category: 'Snack' },
        { name: 'Air-Popped Spicy Popcorn', macros: '110 Cal • 3g P • 20g C • 1g F', description: 'Lightly misted with olive oil and dusted with cayenne pepper and sea salt.', category: 'Snack' },
        { name: 'Cucumber Slices with Hummus', macros: '130 Cal • 4g P • 12g C • 7g F', description: 'Refreshing cucumber wheels served with classic garlic hummus.', category: 'Snack' },
        { name: 'Cottage Cheese & Pineapple', macros: '140 Cal • 12g P • 10g C • 3g F', description: 'Low-fat cottage cheese paired with refreshing pineapple chunks.', category: 'Snack' }
      ];
    } else if (goalLower.includes('gain') || goalLower.includes('muscle') || goalLower.includes('bulk')) {
      activeGoalTitle = 'Muscle Building & Hypertrophy';
      motivation = 'Ensure you are hitting your protein targets and maintaining a clean caloric surplus to rebuild muscle tissues.';
      recommendations = [
        // Muscle Building Recommendations
        { name: 'Peanut Butter Banana Oatmeal', macros: '510 Cal • 16g P • 68g C • 18g F', description: 'Carbohydrate-dense oats with healthy almond/peanut butter healthy fat.', category: 'Breakfast' },
        { name: 'Whole Egg & Turkey Bacon Scramble', macros: '460 Cal • 32g P • 12g C • 22g F', description: 'Three whole eggs scrambled with lean turkey bacon and cheddar.', category: 'Breakfast' },
        { name: 'Mass Gainer Power Shake', macros: '620 Cal • 45g P • 80g C • 12g F', description: 'Oats, milk, banana, honey, and chocolate whey protein blended smooth.', category: 'Breakfast' },
        { name: 'Smoked Salmon Bagel', macros: '480 Cal • 28g P • 52g C • 15g F', description: 'Toasted whole-wheat bagel spread with light cream cheese and wild salmon.', category: 'Breakfast' },
        
        { name: 'Double Beef Quinoa Power-Bowl', macros: '680 Cal • 42g P • 62g C • 22g F', description: 'Clean red meat for iron, creatine, and protein macro synthesis.', category: 'Lunch' },
        { name: 'Honey Mustard Chicken & Rice', macros: '590 Cal • 40g P • 75g C • 10g F', description: 'Seared chicken breast glazed in honey mustard over high-quality jasmine rice.', category: 'Lunch' },
        { name: 'Tuna Pasta Salad with Peas', macros: '550 Cal • 38g P • 65g C • 12g F', description: 'Whole wheat fusilli tossed with flaked tuna, sweet peas, and light mayo.', category: 'Lunch' },
        { name: 'Sweet Potato & Turkey Chili', macros: '520 Cal • 35g P • 58g C • 14g F', description: 'Thick slow-cooked chili packed with ground turkey, black beans, and sweet potato.', category: 'Lunch' },
        
        { name: 'Teriyaki Salmon & Jasmine Rice', macros: '650 Cal • 38g P • 70g C • 20g F', description: 'Rich glazed Atlantic salmon fillet alongside steamed jasmine rice and bok choy.', category: 'Dinner' },
        { name: 'Bison Burger & Sweet Potato', macros: '720 Cal • 45g P • 60g C • 24g F', description: 'Lean bison patty on a brioche bun with home-baked sweet potato wedges.', category: 'Dinner' },
        { name: 'High-Protein Chicken Alfredo', macros: '690 Cal • 48g P • 72g C • 16g F', description: 'Grilled chicken strips, high-protein pasta, and a lightened cauliflower-parmesan sauce.', category: 'Dinner' },
        { name: 'Flank Steak & Mushroom Quinoa', macros: '630 Cal • 44g P • 50g C • 18g F', description: 'Marinated flank steak slices over mushroom quinoa and green beans.', category: 'Dinner' },
        
        { name: 'Creamy Whey protein Shake', macros: '320 Cal • 30g P • 20g C • 6g F', description: 'Fast digesting protein post-workout snack with frozen berries.', category: 'Snack' },
        { name: 'Hard Boiled Eggs & Rice Cakes', macros: '280 Cal • 14g P • 26g C • 10g F', description: 'Two large hard-boiled eggs paired with organic brown rice cakes.', category: 'Snack' },
        { name: 'Greek Yogurt, Honey & Granola', macros: '340 Cal • 20g P • 45g C • 8g F', description: 'Creamy greek yogurt topped with clover honey and high-protein granola.', category: 'Snack' },
        { name: 'Beef Jerky & Mixed Nuts', macros: '290 Cal • 18g P • 10g C • 18g F', description: 'High-protein grass-fed beef jerky paired with an antioxidant nut mix.', category: 'Snack' }
      ];
    }

    return { activeGoalTitle, motivation, recommendations };
  };

  const weeklyData = getWeeklyCalorieData();
  const insights = getPersonalizedInsights();

  const getRealWeightData = (): { name: string; Current: number | null; Predicted: number; Target: number | null }[] => {
    const currentWeight = userProfile?.weight || 70.0;
    const targetWeight = userProfile?.target_weight;



    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    if (targetWeight && targetWeight !== currentWeight) {
      // Calculate a smooth monthly progression over 6 months
      // Safe rates: ~2kg/month loss, ~1kg/month gain (healthy, realistic pace)
      const totalChange = targetWeight - currentWeight;
      const maxMonthlyChange = totalChange > 0 ? 1.0 : -2.0;
      const monthsNeeded = Math.ceil(Math.abs(totalChange) / Math.abs(maxMonthlyChange));
      const displayMonths = Math.max(Math.min(monthsNeeded, 12), 6);
      const monthlyChange = totalChange / displayMonths;

      // Generate month labels dynamically
      const now = new Date();
      const labels = Array.from({ length: displayMonths + 1 }, (_, i) => {
        if (i === 0) return 'Now';
        const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
        return d.toLocaleString('default', { month: 'short' });
      });

      return labels.map((label, i) => {
        const projected = Math.round((currentWeight + monthlyChange * i) * 10) / 10;
        return {
          name: label,
          Current: i === 0 ? currentWeight : null,
          Predicted: projected,
          Target: targetWeight,
        };
      });
    }

    // No target set — show flat current weight over 6 months
    const now = new Date();
    return monthNames.map((_, i) => {
      const displayLabel = i === 0 ? 'Now' : new Date(now.getFullYear(), now.getMonth() + i, 1).toLocaleString('default', { month: 'short' });
      return {
        name: displayLabel,
        Current: i === 0 ? currentWeight : null,
        Predicted: currentWeight,
        Target: null,
      };
    });
  };

  const realWeightData = getRealWeightData();
  const hasTargetWeight = !!(userProfile?.target_weight && userProfile.target_weight !== userProfile.weight);

  return (
    <div className="min-h-screen bg-gradient-to-b from-surface-50 to-surface-100 text-surface-900 dark:text-surface-50 font-sans antialiased transition-colors duration-300">
      {/* Top Header Navigation */}
      <nav className="bg-white/95 backdrop-blur-md border-b border-surface-200/50 sticky top-0 z-30 shadow-sm transition-all duration-300 dark:bg-surface-900/95 dark:border-surface-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20 items-center">
            <div className="flex items-center h-full">
              <img src="/logos_and_assets/logo.jpg" alt="Smarteal Logo" className="h-14 transform scale-[1.35] origin-left logo-blend object-contain" />
            </div>
            
            <div className="flex items-center gap-4 relative">
              <ThemeToggle />
              
              {/* Notifications Bell */}
              <div className="relative">
                <button 
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative text-surface-500 hover:text-surface-900 dark:text-surface-50 bg-surface-100 hover:bg-surface-200 p-2.5 rounded-full transition-all cursor-pointer border border-surface-200"
                >
                  <Bell size={18} />
                  {notifications.length > 0 && (
                    <span className="absolute top-0 right-0 w-3 h-3 bg-red-50 dark:bg-red-500/100 border-2 border-white rounded-full animate-pulse"></span>
                  )}
                </button>
                
                {showNotifications && (
                  <div className="absolute right-0 mt-3 w-80 bg-white border border-surface-200 rounded-3xl shadow-2xl p-4 z-50 transition-all origin-top-right transform scale-100 opacity-100 dark:bg-surface-50">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-extrabold text-sm text-surface-900 dark:text-surface-50">Notifications</h3>
                      <span className="bg-primary-100 text-primary-700 dark:text-primary-400 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        {notifications.length} Unread
                      </span>
                    </div>
                    <div className="max-h-80 overflow-y-auto pr-1 -mr-1 space-y-2">
                      {notifications.length === 0 ? (
                        <p className="text-xs text-surface-500 text-center py-4">You're all caught up!</p>
                      ) : (
                        notifications.map(notif => (
                          <div key={notif.id} className="flex justify-between items-start bg-surface-100 p-3 rounded-xl gap-2">
                            <div className="flex-1">
                              <p className="text-xs font-semibold text-surface-900 dark:text-surface-50">{notif.message}</p>
                              <p className="text-[9px] text-surface-400 mt-1">{new Date(notif.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                            </div>
                            <button 
                              onClick={() => handleDismissNotification(notif.id)}
                              className="text-surface-400 hover:text-red-500 p-1"
                            >
                              <Check size={14} />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="relative">
                <button 
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="text-xs font-bold bg-surface-100 hover:bg-surface-200 text-surface-700 hover:text-surface-900 dark:text-surface-50 px-3.5 py-2.5 rounded-2xl flex items-center gap-2 transition-all cursor-pointer border border-surface-200"
                >
                  <User size={14} className="text-primary-600 dark:text-primary-400" />
                  <span>{userProfile?.full_name || userProfile?.email}</span>
                </button>

                {/* Profile Edit Dropdown Menu */}
                {showProfileMenu && (
                  <div className="absolute right-0 mt-3 w-80 bg-white border border-surface-200 rounded-3xl shadow-xl p-5 z-50 space-y-4 animate-in fade-in slide-in-from-top-3 duration-200">
                    <h3 className="font-extrabold text-sm text-surface-900 dark:text-surface-50 pb-2 border-b border-surface-150">Your Health Profile</h3>
                    
                    <div className="space-y-3.5">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-bold text-surface-400 uppercase tracking-widest block mb-1">Goal Focus (Auto)</label>
                          <select 
                            value={tempProfile.target_weight ? (Number(tempProfile.target_weight) > Number(tempProfile.weight) ? 'gain muscle' : Number(tempProfile.target_weight) < Number(tempProfile.weight) ? 'lose weight' : 'maintain weight') : tempProfile.goal}
                            disabled
                            className="w-full text-xs font-semibold bg-surface-100 text-surface-500 border border-surface-200 rounded-xl p-2.5 transition-all outline-none cursor-not-allowed"
                          >
                            <option value="lose weight">Lose Weight</option>
                            <option value="gain muscle">Gain Muscle</option>
                            <option value="maintain weight">Maintain Weight</option>
                          </select>
                        </div>
                        
                        <div>
                          <label className="text-[10px] font-bold text-surface-400 uppercase tracking-widest block mb-1">Biological Sex</label>
                          <select 
                            value={tempProfile.gender}
                            onChange={(e) => setTempProfile({ ...tempProfile, gender: e.target.value })}
                            className="w-full text-xs font-semibold bg-surface-50 border border-surface-200 rounded-xl p-2.5 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all outline-none"
                          >
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                          </select>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-bold text-surface-400 uppercase tracking-widest block mb-1">Weight (kg)</label>
                          <input 
                            type="number"
                            value={tempProfile.weight}
                            onChange={(e) => setTempProfile({ ...tempProfile, weight: Number(e.target.value) })}
                            className="w-full text-xs font-semibold bg-surface-50 border border-surface-200 rounded-xl p-2.5 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-surface-400 uppercase tracking-widest block mb-1">Height (cm)</label>
                          <input 
                            type="number"
                            value={tempProfile.height}
                            onChange={(e) => setTempProfile({ ...tempProfile, height: Number(e.target.value) })}
                            className="w-full text-xs font-semibold bg-surface-50 border border-surface-200 rounded-xl p-2.5 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all outline-none"
                          />
                        </div>
                      </div>
                      
                      <div>
                        <label className="text-[10px] font-bold text-surface-400 uppercase tracking-widest block mb-1">Age (years)</label>
                        <input 
                          type="number"
                          value={tempProfile.age}
                          onChange={(e) => setTempProfile({ ...tempProfile, age: Number(e.target.value) })}
                          className="w-full text-xs font-semibold bg-surface-50 border border-surface-200 rounded-xl p-2.5 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all outline-none"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-surface-400 uppercase tracking-widest block mb-1">Activity Level</label>
                        <select 
                          value={tempProfile.activity_level}
                          onChange={(e) => setTempProfile({ ...tempProfile, activity_level: e.target.value })}
                          className="w-full text-xs font-semibold bg-surface-50 border border-surface-200 rounded-xl p-2.5 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all outline-none"
                        >
                          <option value="sedentary">Sedentary</option>
                          <option value="lightly active">Lightly Active</option>
                          <option value="moderately active">Moderately Active</option>
                          <option value="very active">Very Active</option>
                          <option value="extra active">Extra Active</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-surface-400 uppercase tracking-widest block mb-1">Target Weight (kg)</label>
                        <input 
                          type="number"
                          step="0.1"
                          placeholder="e.g. 65"
                          value={tempProfile.target_weight}
                          onChange={(e) => setTempProfile({ ...tempProfile, target_weight: e.target.value === '' ? '' : Number(e.target.value) })}
                          className="w-full text-xs font-semibold bg-surface-50 border border-surface-200 rounded-xl p-2.5 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all outline-none"
                        />
                        <p className="text-[9px] text-surface-400 mt-1">Leave empty to hide the prediction line</p>
                      </div>
                    </div>

                    {profileUpdatingError && (
                      <p className="text-[10px] text-red-500 font-semibold">{profileUpdatingError}</p>
                    )}

                    <div className="flex gap-2 pt-2 border-t border-surface-150">
                      <button 
                        onClick={() => setShowProfileMenu(false)}
                        className="flex-1 text-xs font-bold text-surface-500 hover:text-surface-900 dark:text-surface-50 bg-surface-50 dark:bg-surface-800 hover:bg-surface-100 dark:hover:bg-surface-700 py-2.5 rounded-xl border border-surface-200 transition-all"
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={handleSaveProfile}
                        disabled={savingProfile}
                        className="flex-1 text-xs font-bold text-white bg-primary-600 hover:bg-primary-700 py-2.5 rounded-xl transition-all shadow-sm disabled:opacity-50"
                      >
                        {savingProfile ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-4 pl-2 border-l border-surface-200 dark:border-surface-700">
                <button 
                  onClick={() => navigate('/settings')}
                  className="flex items-center gap-1.5 text-surface-500 hover:text-surface-900 dark:text-surface-50 dark:text-surface-400 dark:hover:text-surface-50 transition-colors font-semibold text-xs uppercase tracking-wider"
                >
                  <Settings size={14} />
                  Settings
                </button>
                <button 
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 text-red-500 hover:text-red-700 dark:text-red-400 transition-colors font-semibold text-xs uppercase tracking-wider"
                >
                <LogOut size={14} />
                Logout
              </button>
            </div>
            </div>
          </div>
        </div>
      </nav>


      {/* Sticky Secondary Scroll-Nav */}
      <div className="bg-white/80 backdrop-blur-md border-b border-surface-200 sticky top-16 z-20 shadow-xs py-1 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 overflow-x-auto py-3 scrollbar-none px-1">
            <button
              onClick={() => handleScrollTo('overview')}
              className={`text-[15px] font-bold transition-all shrink-0 px-4 py-2 rounded-full flex items-center gap-2 ${
                activeSection === 'overview' ? 'bg-primary-600 text-white shadow-md transform hover:-translate-y-0.5' : 'bg-transparent text-surface-500 hover:bg-surface-100 hover:text-surface-900 dark:text-surface-50'
              }`}
            >
              <Activity size={16} className={activeSection === 'overview' ? 'text-white' : 'text-primary-500'} />
              Overview
            </button>
            <button
              onClick={() => handleScrollTo('weekly-stats')}
              className={`text-[15px] font-bold transition-all shrink-0 px-4 py-2 rounded-full flex items-center gap-2 ${
                activeSection === 'weekly-stats' ? 'bg-primary-600 text-white shadow-md transform hover:-translate-y-0.5' : 'bg-transparent text-surface-500 hover:bg-surface-100 hover:text-surface-900 dark:text-surface-50'
              }`}
            >
              <TrendingUp size={16} className={activeSection === 'weekly-stats' ? 'text-white' : 'text-primary-500'} />
              Weekly Stats
            </button>
            <button
              onClick={() => handleScrollTo('for-you')}
              className={`text-[15px] font-bold transition-all shrink-0 px-4 py-2 rounded-full flex items-center gap-2 ${
                activeSection === 'for-you' ? 'bg-primary-600 text-white shadow-md transform hover:-translate-y-0.5' : 'bg-transparent text-surface-500 hover:bg-surface-100 hover:text-surface-900 dark:text-surface-50'
              }`}
            >
              <Sparkles size={16} className={activeSection === 'for-you' ? 'text-white' : 'text-primary-500'} />
              For You (AI recommendations)
            </button>
            <button
              onClick={() => handleScrollTo('recent-meals')}
              className={`text-[15px] font-bold transition-all shrink-0 px-4 py-2 rounded-full flex items-center gap-2 ${
                activeSection === 'recent-meals' ? 'bg-primary-600 text-white shadow-md transform hover:-translate-y-0.5' : 'bg-transparent text-surface-500 hover:bg-surface-100 hover:text-surface-900 dark:text-surface-50'
              }`}
            >
              <Utensils size={16} className={activeSection === 'recent-meals' ? 'text-white' : 'text-primary-500'} />
              Logged Meals
            </button>
            <button
              onClick={() => handleScrollTo('water-tracker')}
              className={`text-[15px] font-bold transition-all shrink-0 px-4 py-2 rounded-full flex items-center gap-2 ${
                activeSection === 'water-tracker' ? 'bg-blue-50 dark:bg-blue-500/100 text-white shadow-md transform hover:-translate-y-0.5' : 'bg-transparent text-surface-500 hover:bg-blue-50 dark:bg-blue-500/10 hover:text-blue-600 dark:text-blue-400'
              }`}
            >
              <Droplets size={16} className={activeSection === 'water-tracker' ? 'text-white' : 'text-blue-500'} />
              Water Tracker
            </button>
          </div>
        </div>
      </div>

      {/* Main Body */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
        
        {/* Water Reminder Alert */}
        {((new Date().getHours() >= 14 && (waterIntake / waterGoal) < 0.5) || 
          (new Date().getHours() >= 18 && (waterIntake / waterGoal) < 1.0)) && (
          <div className="bg-blue-50 dark:bg-blue-500/10 border-l-4 border-blue-500 p-4 rounded-r-xl shadow-sm flex items-start gap-4 animate-in fade-in slide-in-from-top-4">
            <div className="bg-blue-100 p-2 rounded-full text-blue-600 dark:text-blue-400 shrink-0">
              <Droplets size={20} />
            </div>
            <div>
              <h3 className="text-blue-900 font-bold text-sm">Hydration Reminder!</h3>
              <p className="text-blue-700 dark:text-blue-400 text-xs mt-1 font-medium">
                You've only drank {waterIntake}ml out of your {waterGoal}ml goal today. Grab a glass of water to stay hydrated!
              </p>
            </div>
          </div>
        )}

        {/* SECTION 1: OVERVIEW */}
        <section id="overview" className="space-y-6 scroll-mt-24">
          
          {/* Welcome Banner */}
          <div className="bg-gradient-to-br from-primary-900 via-primary-800 to-surface-900 text-white rounded-[2rem] p-8 sm:p-10 shadow-2xl shadow-primary-900/20 ring-1 ring-white/10 flex flex-col md:flex-row md:items-center justify-between gap-8 relative overflow-hidden group">
            {/* Decorative background glows */}
            <div className="absolute top-0 right-0 -mt-24 -mr-24 w-96 h-96 bg-primary-50 dark:bg-primary-500/100 rounded-full blur-[100px] opacity-30 mix-blend-screen pointer-events-none transition-transform duration-1000 group-hover:scale-110" />
            <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-72 h-72 bg-primary-300 rounded-full blur-[80px] opacity-10 pointer-events-none" />
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03] pointer-events-none" />
            
            <div className="space-y-3 relative z-10">
              <div className="flex items-center gap-2.5">
                <span className="bg-white/10 backdrop-blur-md border border-white/20 text-white text-xs px-3 py-1.5 rounded-lg font-bold uppercase tracking-wider shadow-sm">Active Plan</span>
                <span className="text-primary-200 text-xs font-semibold tracking-wide flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary-400 animate-pulse"></span>
                  Health Assessment Completed
                </span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-black tracking-tight leading-tight">Welcome back!</h2>
              <p className="text-primary-100/90 text-sm sm:text-base max-w-xl leading-relaxed">
                Your goals are updated to <strong className="text-white border-b border-primary-400/50 pb-0.5 capitalize">{userProfile?.goal || 'Healthy balance'}</strong>. Target calories and macronutrients have been recalibrated for optimal results.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 relative z-10 shrink-0 w-full md:w-auto mt-2 md:mt-0">
              <button 
                onClick={() => navigate('/chat')}
                className="flex-1 sm:flex-initial bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white px-7 py-3.5 rounded-2xl text-sm font-bold transition-all duration-300 flex items-center justify-center gap-2.5 hover:-translate-y-1 active:scale-95"
              >
                <Bot size={18} strokeWidth={2.5} />
                Ask AI Assistant
              </button>
              <button 
                onClick={() => navigate('/scanner')}
                className="flex-1 sm:flex-initial bg-white hover:bg-surface-50 text-primary-900 px-7 py-3.5 rounded-2xl text-sm font-extrabold transition-all duration-300 shadow-[0_8px_30px_rgb(255,255,255,0.12)] hover:shadow-[0_8px_30px_rgb(255,255,255,0.25)] flex items-center justify-center gap-2.5 hover:-translate-y-1 active:scale-95"
              >
                <Utensils size={18} strokeWidth={2.5} />
                Log a Meal
              </button>
            </div>
          </div>

          {/* Goal & Info Card Overview Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white/90 backdrop-blur-xl rounded-[1.75rem] p-6 border border-surface-200 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group dark:bg-surface-800/90 dark:border-surface-700">
              <div className="flex items-center gap-5">
                <div className="h-14 w-14 bg-gradient-to-br from-primary-50 to-primary-100/50 dark:from-primary-900/40 dark:to-primary-800/20 border border-primary-200/60 dark:border-primary-500/20 rounded-2xl flex items-center justify-center text-primary-600 dark:text-primary-400 shrink-0 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 shadow-[inset_0_2px_10px_rgba(20,184,166,0.1)] dark:shadow-none">
                  <Dumbbell size={24} strokeWidth={2.5} />
                </div>
                <div>
                  <p className="text-surface-500 text-xs font-bold uppercase tracking-widest mb-1 group-hover:text-primary-600 dark:text-primary-400 dark:group-hover:text-primary-400 transition-colors">Current Weight</p>
                  <p className="text-2xl font-black text-surface-900 dark:text-surface-50 tracking-tight">{userProfile?.weight || 70} <span className="text-base font-semibold text-surface-400">kg</span></p>
                </div>
              </div>
            </div>
            
            <div className="bg-white/90 backdrop-blur-xl rounded-[1.75rem] p-6 border border-surface-200 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group dark:bg-surface-800/90 dark:border-surface-700">
              <div className="flex items-center gap-5">
                <div className="h-14 w-14 bg-gradient-to-br from-primary-50 to-primary-100/50 dark:from-primary-900/40 dark:to-primary-800/20 border border-primary-200/60 dark:border-primary-500/20 rounded-2xl flex items-center justify-center text-primary-600 dark:text-primary-400 shrink-0 group-hover:scale-110 group-hover:-rotate-6 transition-all duration-300 shadow-[inset_0_2px_10px_rgba(20,184,166,0.1)] dark:shadow-none">
                  <Compass size={24} strokeWidth={2.5} />
                </div>
                <div>
                  <p className="text-surface-500 text-xs font-bold uppercase tracking-widest mb-1 group-hover:text-primary-600 dark:text-primary-400 dark:group-hover:text-primary-400 transition-colors">Target Focus</p>
                  <p className="text-2xl font-black text-surface-900 dark:text-surface-50 tracking-tight capitalize">{userProfile?.goal || 'Maintain'}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white/90 backdrop-blur-xl rounded-[1.75rem] p-6 border border-surface-200 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group dark:bg-surface-800/90 dark:border-surface-700">
              <div className="flex items-center gap-5">
                <div className="h-14 w-14 bg-gradient-to-br from-primary-50 to-primary-100/50 dark:from-primary-900/40 dark:to-primary-800/20 border border-primary-200/60 dark:border-primary-500/20 rounded-2xl flex items-center justify-center text-primary-600 dark:text-primary-400 shrink-0 group-hover:scale-110 group-hover:rotate-12 transition-all duration-300 shadow-[inset_0_2px_10px_rgba(20,184,166,0.1)] dark:shadow-none">
                  <Sparkles size={24} strokeWidth={2.5} />
                </div>
                <div>
                  <p className="text-surface-500 text-xs font-bold uppercase tracking-widest mb-1 group-hover:text-primary-600 dark:text-primary-400 dark:group-hover:text-primary-400 transition-colors">Daily Calorie Cap</p>
                  <p className="text-2xl font-black text-surface-900 dark:text-surface-50 tracking-tight">{macros?.calories || 2000} <span className="text-base font-semibold text-surface-400">kcal</span></p>
                </div>
              </div>
            </div>
          </div>

          {/* Daily Goal Achievement Center */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-surface-200 shadow-sm relative overflow-hidden transition-all hover:shadow-md">
            
            {/* Confetti Background elements if user met 1 or more goals */}
            {completedGoalsCount > 0 && (
              <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-45 select-none">
                {confettiParticles.slice(0, completedGoalsCount * 6).map((p) => (
                  <div
                    key={p.id}
                    className={`absolute -top-4 ${p.color} ${p.size} ${
                      p.isLeft ? 'animate-confetti-left' : 'animate-confetti-right'
                    }`}
                    style={{
                      left: p.left,
                      animationDelay: p.delay,
                    }}
                  />
                ))}
              </div>
            )}

            <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8">
              <div className="space-y-4 flex-1 w-full">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="h-9 w-9 bg-teal-50 dark:bg-teal-500/10 border border-teal-100 rounded-xl flex items-center justify-center text-teal-600 dark:text-teal-400">
                    <Trophy size={18} className={completedGoalsCount === 6 ? 'animate-bounce' : ''} />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-surface-900 dark:text-surface-50 leading-tight">Daily Target Milestone Tracker</h3>
                    <p className="text-xs text-surface-400 font-semibold">Track and conquer all six daily macronutrient targets</p>
                  </div>
                </div>

                {/* Progress bar with checkpoints */}
                <div className="space-y-2 pt-2">
                  <div className="flex justify-between items-center text-xs font-extrabold">
                    <span className="text-teal-600 dark:text-teal-400 uppercase tracking-wider">{completedGoalsCount} of 6 Goals Met</span>
                    <span className="text-surface-600">{progressPercent}% Achieved</span>
                  </div>
                  
                  <div className="relative h-4 bg-surface-100 rounded-full overflow-hidden p-0.5 border border-surface-200">
                    <div 
                      className="h-full bg-gradient-to-r from-teal-400 via-emerald-500 to-primary-600 rounded-full transition-all duration-1000 ease-out shadow-xs"
                      style={{ width: `${progressPercent}%` }}
                    />
                    
                    {/* Tick markers inside progress bar */}
                    <div className="absolute inset-0 flex justify-between px-[12%] pointer-events-none">
                      {[1, 2, 3, 4, 5].map((val) => (
                        <div key={val} className="relative h-full flex flex-col justify-center animate-pulse-soft">
                          <div className={`h-2.5 w-1 rounded-full ${completedGoalsCount >= val ? 'bg-white' : 'bg-surface-300'}`} />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Checkboxes showing individual status */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-3">
                  {goalItems.map((item) => (
                    <div 
                      key={item.name}
                      className={`flex items-center gap-3 p-3 rounded-2xl border transition-all duration-300 group hover:-translate-y-0.5 ${
                        item.met 
                          ? 'bg-emerald-50/70 border-emerald-200/50 text-emerald-950 shadow-xs' 
                          : 'bg-surface-50/80 border-surface-200/80 text-surface-500 hover:border-surface-300'
                      }`}
                    >
                      <div className={`h-6 w-6 rounded-xl flex items-center justify-center shrink-0 border transition-transform duration-300 shadow-inner ${
                        item.met ? 'bg-emerald-50 dark:bg-emerald-500/100 border-emerald-600 text-white group-hover:scale-110 group-hover:rotate-6' : 'border-surface-300 bg-white dark:bg-surface-800 group-hover:bg-surface-100 dark:group-hover:bg-surface-700'
                      }`}>
                        {item.met ? <Check size={14} strokeWidth={3} /> : <div className="h-1.5 w-1.5 rounded-full bg-surface-300" />}
                      </div>
                      <div className="min-w-0 flex-1 leading-tight">
                        <p className="text-xs font-bold truncate">{item.label}</p>
                        <p className={`text-[10px] font-semibold truncate mt-0.5 ${item.met ? 'text-emerald-700 dark:text-emerald-400' : 'text-surface-400'}`}>
                          {item.value} / {item.target}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Micronutrients Section */}
                <div className="mt-6 pt-4 border-t border-surface-100">
                  <h3 className="text-sm font-bold text-surface-900 dark:text-surface-50 mb-3 flex items-center gap-2">
                    <Sparkles size={16} className="text-primary-500" />
                    Micronutrient Goals
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-3">
                    {micronutrientItems.map((item) => (
                      <div 
                        key={item.name}
                        className={`flex items-center gap-3 p-3 rounded-2xl border transition-all duration-300 group hover:-translate-y-0.5 ${
                          item.met 
                            ? 'bg-blue-50/70 border-blue-200/50 text-blue-950 shadow-xs' 
                            : 'bg-surface-50/80 border-surface-200/80 text-surface-500 hover:border-surface-300'
                        }`}
                      >
                        <div className={`h-6 w-6 rounded-xl flex items-center justify-center shrink-0 border transition-transform duration-300 shadow-inner ${
                          item.met ? 'bg-blue-50 dark:bg-blue-500/100 border-blue-600 text-white group-hover:scale-110 group-hover:-rotate-6' : 'border-surface-300 bg-white dark:bg-surface-800 group-hover:bg-surface-100 dark:group-hover:bg-surface-700'
                        }`}>
                          {item.met ? <Check size={14} strokeWidth={3} /> : <div className="h-1.5 w-1.5 rounded-full bg-surface-300" />}
                        </div>
                        <div className="min-w-0 flex-1 leading-tight">
                          <p className="text-xs font-bold truncate">{item.label}</p>
                          <p className={`text-[10px] font-semibold truncate mt-0.5 ${item.met ? 'text-blue-700 dark:text-blue-400' : 'text-surface-400'}`}>
                            {item.value} / {item.target} <span className="opacity-75">{item.unit}</span>
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              {/* Celebration / Motivational area */}
              <div className="shrink-0 w-full lg:w-72 bg-gradient-to-br from-surface-50 to-surface-100 rounded-3xl p-5 border border-surface-200 relative overflow-hidden flex flex-col items-center text-center justify-center gap-3">
                <div className="absolute inset-0 opacity-10 bg-radial-gradient from-primary-400 to-transparent pointer-events-none" />
                
                {completedGoalsCount === 6 ? (
                  <>
                    <div className="relative flex items-center justify-center animate-float-slow">
                      <div className="absolute h-16 w-16 bg-yellow-400/20 rounded-full blur-xl animate-pulse-glow" />
                      <Trophy size={42} className="text-yellow-500" strokeWidth={2.5} />
                      <Sparkles size={16} className="absolute -top-1.5 -right-1.5 text-yellow-400 animate-pulse" />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-yellow-700 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-250 px-2 py-0.5 rounded-md uppercase tracking-wider">CRUSHED IT!</span>
                      <h4 className="font-extrabold text-sm text-surface-900 dark:text-surface-50 leading-tight">100% Targets Met!</h4>
                      <p className="text-[11px] text-surface-500 font-semibold px-2">You hit every single target today. Perfect balance of calories and macros! 🏆</p>
                    </div>
                  </>
                ) : completedGoalsCount > 0 ? (
                  <>
                    <div className="relative flex items-center justify-center">
                      <Award size={40} className="text-teal-600 dark:text-teal-400 animate-float-slow" />
                      <Sparkles size={14} className="absolute top-0 right-0 text-teal-400 animate-pulse" />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-500/10 border border-teal-200 px-2.5 py-0.5 rounded-md uppercase tracking-wider">OFF TO A GREAT START</span>
                      <h4 className="font-extrabold text-sm text-surface-900 dark:text-surface-50 leading-tight">{completedGoalsCount} Goals Achieved</h4>
                      <p className="text-[11px] text-surface-500 font-semibold px-2 font-medium">Excellent progress! Keep logging your meals to secure that perfect 6/6! 💪</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="h-10 w-10 bg-surface-200/60 rounded-full flex items-center justify-center text-surface-400">
                      <Flame size={20} />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-surface-400 bg-surface-200/40 px-2.5 py-0.5 rounded-md uppercase tracking-wider">READY FOR THE DAY</span>
                      <h4 className="font-extrabold text-sm text-surface-900 dark:text-surface-50 leading-tight">Kickstart Your Streak</h4>
                      <p className="text-[11px] text-surface-500 font-semibold px-2 font-medium">Log a meal or use the scan feature to map today's progress! 🍎</p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Todays Progress Summary */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-surface-400 uppercase tracking-widest">Today's Macronutrients Breakdown</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <MacroCard 
                title="Calories" 
                consumed={consumed.calories} 
                target={macros?.calories || 2000} 
                unit=" kcal"
                icon={<Flame size={18} className="text-orange-500" />} 
                color="bg-orange-50 dark:bg-orange-50 dark:bg-orange-500/100/10 text-orange-600 dark:text-orange-400 border-orange-100 dark:border-orange-500/20"
              />
              <MacroCard 
                title="Protein" 
                consumed={consumed.protein} 
                target={macros?.protein_grams || 120} 
                unit="g"
                icon={<Beef size={18} className="text-rose-500" />} 
                color="bg-rose-50 dark:bg-rose-50 dark:bg-rose-500/100/10 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-500/20"
              />
              <MacroCard 
                title="Carbs" 
                consumed={consumed.carbs} 
                target={macros?.carbs_grams || 150} 
                unit="g"
                icon={<Cookie size={18} className="text-amber-500" />} 
                color="bg-amber-50 dark:bg-amber-50 dark:bg-amber-500/100/10 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-500/20"
              />
              <MacroCard 
                title="Fat" 
                consumed={consumed.fat} 
                target={macros?.fat_grams || 60} 
                unit="g"
                icon={<Droplets size={18} className="text-yellow-500" />} 
                color="bg-yellow-50 dark:bg-yellow-50 dark:bg-yellow-500/100/10 text-yellow-600 dark:text-yellow-400 border-yellow-100 dark:border-yellow-500/20"
              />
              <MacroCard 
                title="Fiber" 
                consumed={consumed.fiber} 
                target={macros?.fiber_grams || 25} 
                unit="g"
                icon={<Leaf size={18} className="text-emerald-500" />} 
                color="bg-emerald-50 dark:bg-emerald-50 dark:bg-emerald-500/100/10 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-500/20"
              />
              <MacroCard 
                title="Sugar" 
                consumed={consumed.sugar} 
                target={macros?.sugar_grams || 50} 
                unit="g"
                icon={<Candy size={18} className="text-purple-500" />} 
                color="bg-purple-50 dark:bg-purple-50 dark:bg-purple-500/100/10 text-purple-600 dark:text-purple-400 border-purple-100 dark:border-purple-500/20"
              />
            </div>
          </div>

        </section>

        {/* SECTION 2: WEEKLY STATS */}
        <section id="weekly-stats" className="grid grid-cols-1 lg:grid-cols-2 gap-8 scroll-mt-24">
          
          {/* Weekly Calorie chart */}
          <div className="bg-white/90 backdrop-blur-xl rounded-[2rem] border border-surface-200/80 p-7 shadow-sm transition-all duration-300 hover:shadow-lg dark:bg-surface-800/90 dark:border-surface-700">
            <div className="flex items-center gap-2 mb-6">
              <Calendar size={18} className="text-primary-600 dark:text-primary-400" />
              <h2 className="text-lg font-extrabold text-surface-900 dark:text-surface-50">Weekly Calories Consumed</h2>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.05)' }}
                    cursor={{ fill: '#f8fafc' }}
                  />
                  <Bar dataKey="Consumed" fill="#0d9488" radius={[8, 8, 0, 0]} barSize={28} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 flex items-center justify-between text-xs text-surface-500 font-semibold bg-surface-50 p-3.5 rounded-2xl border border-surface-150">
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-md bg-primary-600 inline-block" />
                Actual Daily Intake
              </span>
              <span>Target: {macros?.calories || 2000} kcal/day</span>
            </div>
          </div>

          {/* Weight Tracking Chart */}
          <div className="bg-white/90 backdrop-blur-xl rounded-[2rem] border border-surface-200/80 p-7 shadow-sm transition-all duration-300 hover:shadow-lg dark:bg-surface-800/90 dark:border-surface-700">
            <div className="flex items-center gap-2 mb-6">
              <TrendingUp size={18} className="text-primary-600 dark:text-primary-400" />
              <h2 className="text-lg font-extrabold text-surface-900 dark:text-surface-50">6-Month Weight Projection</h2>
              {hasTargetWeight && (
                <span className="ml-auto text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-200">
                  Target: {userProfile?.target_weight}kg
                </span>
              )}
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={realWeightData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0d9488" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#0d9488" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} domain={['dataMin - 2', 'dataMax + 2']} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.05)' }}
                  />
                  {hasTargetWeight && (
                    <ReferenceLine y={userProfile?.target_weight || 0} stroke="#f59e0b" strokeDasharray="6 4" strokeWidth={2} label={{ value: 'Goal', position: 'insideTopRight', fill: '#f59e0b', fontSize: 11, fontWeight: 700 }} />
                  )}
                  <Area type="monotone" dataKey="Predicted" stroke="#0d9488" strokeWidth={3} fillOpacity={1} fill="url(#colorWeight)" connectNulls />
                  <Line type="monotone" dataKey="Current" stroke="#6366f1" strokeWidth={0} dot={{ r: 6, fill: '#6366f1', stroke: '#fff', strokeWidth: 2 }} connectNulls={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 flex justify-between text-xs text-surface-500 font-semibold bg-surface-50 p-3.5 rounded-2xl border border-surface-150">
              <span>Now: {userProfile?.weight || 70}kg</span>
              {hasTargetWeight ? (
                <span className="text-amber-600 dark:text-amber-400">Target: {userProfile?.target_weight}kg ({((userProfile?.target_weight || 0) - (userProfile?.weight || 0)) > 0 ? '+' : ''}{(((userProfile?.target_weight || 0) - (userProfile?.weight || 0))).toFixed(1)}kg)</span>
              ) : (
                <span className="text-surface-400">No target set</span>
              )}
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-primary-50 dark:bg-primary-500/100 inline-block" /> Predicted Path
              </span>
            </div>
          </div>

        </section>

        {/* SECTION 3: FOR YOU (FOOD RECOMMENDATIONS) */}
        <section id="for-you" className="bg-white/90 backdrop-blur-xl rounded-[2.5rem] border border-surface-200/80 p-8 sm:p-10 shadow-sm space-y-8 scroll-mt-24 transition-all duration-300 hover:shadow-lg dark:bg-surface-800/90 dark:border-surface-700">
          <div className="flex items-center gap-2">
            <Heart size={20} className="text-rose-500 animate-pulse" />
            <h2 className="text-xl font-extrabold text-surface-900 dark:text-surface-50">For You</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
            {/* Focus Summary */}
            <div className="md:col-span-4 bg-gradient-to-br from-primary-50 to-primary-100 rounded-2xl p-6 border border-primary-200 space-y-4">
              <div className="space-y-1">
                <span className="text-xs font-bold text-primary-600 dark:text-primary-400 uppercase tracking-widest">Selected Focus Goal</span>
                <h3 className="font-extrabold text-lg text-primary-950 capitalize">{insights.activeGoalTitle}</h3>
              </div>
              <p className="text-sm text-primary-800 leading-relaxed">
                "{insights.motivation}"
              </p>
              
              <div className="bg-white/80 rounded-xl p-4 border border-primary-200/50 flex flex-col gap-2">
                <div className="flex justify-between items-center text-xs text-surface-500 font-bold uppercase tracking-wider">
                  <span>Nutrient Caps</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-surface-800">
                  <span className="h-2 w-2 rounded-full bg-rose-50 dark:bg-rose-500/100" />
                  <span>Protein: {macros?.protein_grams}g</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-surface-800">
                  <span className="h-2 w-2 rounded-full bg-amber-50 dark:bg-amber-500/100" />
                  <span>Carbs: {macros?.carbs_grams}g</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-surface-800">
                  <span className="h-2 w-2 rounded-full bg-yellow-50 dark:bg-yellow-500/100" />
                  <span>Fat: {macros?.fat_grams}g</span>
                </div>
              </div>
            </div>

            {/* Recs Grid */}
            <div className="md:col-span-8 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-surface-150">
                <h4 className="text-sm font-bold text-surface-400 uppercase tracking-widest">Recommended Meals For Today</h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mt-4">
                {insights.recommendations.slice(0, 3).map((rec, index) => (
                    <div key={index} className="bg-white rounded-2xl p-6 border border-surface-200 hover:border-primary-300 hover:shadow-lg transition-all duration-300 flex flex-col justify-between group hover:-translate-y-1">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-500/10 border border-primary-100 px-2 py-0.5 rounded-md uppercase tracking-wider">
                            {rec.category}
                          </span>
                          <span className="text-[10px] text-surface-400 font-semibold">{rec.macros.split(' • ')[0]}</span>
                        </div>
                        <h5 className="font-extrabold text-surface-900 dark:text-surface-50 group-hover:text-primary-600 dark:text-primary-400 transition-colors text-base">{rec.name}</h5>
                        <p className="text-xs text-surface-500 leading-relaxed">{rec.description}</p>
                      </div>
                      <div className="mt-4 pt-3 border-t border-surface-150 flex items-center justify-between text-xs font-bold text-primary-600 dark:text-primary-400 cursor-pointer" onClick={() => handleLogMeal(rec)}>
                        <span>Log this meal</span>
                        <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>
                  ))}
              </div>

              <div className="mt-6 pt-6 border-t border-surface-150">
                <button 
                  onClick={() => navigate('/recommendations')}
                  className="w-full bg-surface-900 hover:bg-primary-900 text-white py-4.5 rounded-2xl font-bold transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-primary-900/20 flex items-center justify-center gap-2.5 group hover:-translate-y-1 active:scale-95"
                >
                  <Compass size={18} strokeWidth={2.5} />
                  Explore Full Meal Database (Arabic, Asian, Italian & More)
                  <ArrowRight size={18} strokeWidth={2.5} className="group-hover:translate-x-1.5 transition-transform" />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 4: LOGGED MEALS */}
        <section id="recent-meals" className="bg-white/90 backdrop-blur-xl rounded-[2.5rem] border border-surface-200/80 p-8 sm:p-10 shadow-sm space-y-8 scroll-mt-24 transition-all duration-300 hover:shadow-lg dark:bg-surface-800/90 dark:border-surface-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Beef size={20} className="text-primary-600 dark:text-primary-400" />
              <h2 className="text-xl font-extrabold text-surface-900 dark:text-surface-50">Logged Meal History</h2>
            </div>
            <button 
              onClick={() => navigate('/scanner')}
              className="text-xs font-bold text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-500/10 hover:bg-primary-100 px-4 py-2 rounded-xl transition-all border border-primary-100"
            >
              Add New Meal
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {todayMeals.length === 0 ? (
              <div className="col-span-2 text-center text-surface-500 py-12 text-sm bg-surface-50 rounded-2xl border border-dashed border-surface-200">
                No meal scan data found for today. Get started by uploading your first meal snapshot!
              </div>
            ) : (
              [...todayMeals].reverse().map((meal) => {
                const parsed = parseMealName(meal.food_name);
                const badgeStyles = {
                  Breakfast: 'bg-emerald-50 dark:bg-emerald-50 dark:bg-emerald-500/100/10 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-500/20',
                  Lunch: 'bg-teal-50 dark:bg-teal-50 dark:bg-teal-500/100/10 text-teal-700 dark:text-teal-400 border-teal-100 dark:border-teal-500/20',
                  Dinner: 'bg-indigo-50 dark:bg-indigo-50 dark:bg-indigo-500/100/10 text-indigo-700 dark:text-indigo-400 border-indigo-100 dark:border-indigo-500/20',
                  Snack: 'bg-amber-50 dark:bg-amber-50 dark:bg-amber-500/100/10 text-amber-700 dark:text-amber-400 border-amber-100 dark:border-amber-500/20',
                };
                
                return (
                  <div key={meal.id} className="flex items-center justify-between p-5 bg-white rounded-2xl border border-surface-200 hover:border-primary-300 hover:shadow-md transition-all duration-300 group/meal hover:-translate-y-0.5">
                    <div className="space-y-1.5 flex-1 min-w-0 pr-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-bold text-sm text-surface-900 dark:text-surface-50 capitalize leading-none truncate">{parsed.cleanName || 'Generic Logged Meal'}</h3>
                        {parsed.type && (
                          <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-md border leading-none tracking-wider uppercase ${badgeStyles[parsed.type]}`}>
                            {parsed.type}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-surface-400 font-semibold">
                        <span>{new Date(meal.created_at).toLocaleDateString()}</span>
                        <span>•</span>
                        <span>{new Date(meal.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right space-y-1.5">
                        <span className="inline-block bg-primary-50 dark:bg-primary-500/10 text-primary-700 dark:text-primary-400 border border-primary-100 text-xs font-extrabold px-2.5 py-0.5 rounded-md">
                          {meal.calories} kcal
                        </span>
                        <p className="text-[10px] text-surface-400 font-bold tracking-wider">
                          {meal.protein}g Protein • {meal.carbs}g Carbs • {meal.fat}g Fat
                        </p>
                      </div>
                      
                      <button 
                        onClick={() => handleDeleteMeal(meal.id)}
                        className="p-2 text-surface-400 hover:text-red-500 hover:bg-red-50/50 rounded-xl transition-all cursor-pointer opacity-0 group-hover/meal:opacity-100 focus:opacity-100"
                        title="Delete meal"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* SECTION 5: WATER TRACKER */}
        <section id="water-tracker" className="space-y-6 scroll-mt-24">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl border border-blue-100">
              <Droplets size={24} />
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-surface-900 dark:text-surface-50 tracking-tight">Water Tracker</h2>
          </div>

          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-surface-200 shadow-sm">
            <div className="flex flex-col md:flex-row items-center gap-8 justify-between">
              
              <div className="flex-1 w-full space-y-4">
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-surface-400 text-xs font-bold uppercase tracking-widest">Daily Goal</p>
                    <p className="text-3xl font-extrabold text-surface-900 dark:text-surface-50 mt-1">
                      {waterIntake} <span className="text-lg text-surface-400 font-medium">/ {waterGoal} ml</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-blue-600 dark:text-blue-400 font-bold text-xl">{Math.min(100, Math.round((waterIntake / waterGoal) * 100))}%</p>
                  </div>
                </div>

                <div className="w-full bg-surface-100 rounded-full h-4 overflow-hidden relative">
                  <div 
                    className="bg-gradient-to-r from-blue-400 to-blue-600 h-full rounded-full transition-all duration-1000 ease-out"
                    style={{ width: `${Math.min(100, (waterIntake / waterGoal) * 100)}%` }}
                  />
                  {/* Subtle water reflection effect */}
                  <div className="absolute top-0 left-0 right-0 h-1/2 bg-white/20 rounded-full" />
                </div>
              </div>

              <div className="flex gap-4 shrink-0 w-full md:w-auto">
                <button 
                  onClick={() => handleAddWater(250)}
                  className="flex-1 md:flex-initial flex flex-col items-center gap-2 p-4 rounded-2xl bg-surface-50 dark:bg-surface-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 dark:bg-blue-500/10 border border-surface-200 hover:border-blue-200 transition-all group"
                >
                  <div className="h-10 w-10 rounded-full bg-white flex items-center justify-center text-blue-500 shadow-sm group-hover:scale-110 transition-transform">
                    <Droplets size={20} />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold text-surface-900 dark:text-surface-50">+1 Cup</p>
                    <p className="text-[10px] text-surface-500 font-semibold uppercase">250 ml</p>
                  </div>
                </button>

                <button 
                  onClick={() => handleAddWater(500)}
                  className="flex-1 md:flex-initial flex flex-col items-center gap-2 p-4 rounded-2xl bg-surface-50 dark:bg-surface-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 dark:bg-blue-500/10 border border-surface-200 hover:border-blue-200 transition-all group"
                >
                  <div className="h-10 w-10 rounded-full bg-white flex items-center justify-center text-blue-500 shadow-sm group-hover:scale-110 transition-transform">
                    <Droplets size={24} />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold text-surface-900 dark:text-surface-50">+1 Bottle</p>
                    <p className="text-[10px] text-surface-500 font-semibold uppercase">500 ml</p>
                  </div>
                </button>
              </div>

            </div>
          </div>
        </section>

      </main>
    </div>
  );
}

function MacroCard({ title, consumed, target, unit = '', icon, color }: { title: string, consumed: number, target: number, unit?: string, icon: React.ReactNode, color: string }) {
  const percentage = Math.min(100, Math.round((consumed / target) * 100)) || 0;
  
  return (
    <div className="bg-white/90 backdrop-blur-md rounded-[1.5rem] border border-surface-200/80 p-5 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1 group dark:bg-surface-800/90 dark:border-surface-700">
      <div className="flex justify-between items-start mb-4">
        <div className={`p-2.5 rounded-2xl border transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3 shadow-inner dark:shadow-none ${color}`}>
          {icon}
        </div>
        <div className="text-right">
          <p className="text-surface-400 text-[10px] font-bold uppercase tracking-widest group-hover:text-surface-500 dark:group-hover:text-surface-300 transition-colors">{title}</p>
          <p className="text-xl font-black text-surface-900 dark:text-surface-50 tracking-tight mt-0.5">
            {Math.round(consumed)}{unit} <span className="text-xs font-semibold text-surface-400/80">/ {Math.round(target)}{unit}</span>
          </p>
        </div>
      </div>
      
      {/* Progress bar */}
      <div className="w-full bg-surface-100 rounded-full h-1.5 mb-1.5 overflow-hidden shadow-[inset_0_1px_2px_rgba(0,0,0,0.05)]">
        <div 
          className="bg-primary-50 dark:bg-primary-500/100 h-full rounded-full transition-all duration-1000 ease-out" 
          style={{ width: `${percentage}%` }}
        />
      </div>
      
      <div className="flex justify-between items-center text-[10px] text-surface-400 font-bold">
        <span>{percentage}% complete</span>
        {percentage >= 100 && (
          <span className="text-emerald-500 flex items-center gap-0.5 animate-in fade-in zoom-in">
            <Check size={10} strokeWidth={3} />
            Met
          </span>
        )}
      </div>
    </div>
  );
}

