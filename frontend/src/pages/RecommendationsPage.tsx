import { useState } from 'react';
import { ArrowLeft, Sparkles, Plus, Search, Heart, Flame, Droplets, CheckCircle2, LayoutDashboard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

type Category = 'All' | 'Arabic' | 'Asian' | 'Italian' | 'Fast Food' | 'Shakes & Drinks' | 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';

interface Recommendation {
  id: string;
  name: string;
  category: Category[];
  description: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
}

const foodDatabase: Recommendation[] = [
  // Arabic (8 meals)
  { id: 'ar1', name: 'Lean Chicken Shawarma & Hummus', category: ['Arabic', 'Lunch', 'Dinner'], description: 'Grilled chicken breast marinated in middle-eastern spices, served with a side of light hummus and cucumber.', calories: 450, protein: 42, carbs: 25, fat: 18, fiber: 6, sugar: 3 },
  { id: 'ar2', name: 'Baked Falafel Salad', category: ['Arabic', 'Lunch', 'Snack'], description: 'Oven-baked falafel over mixed greens, tomatoes, and a light tahini lemon dressing.', calories: 380, protein: 15, carbs: 45, fat: 16, fiber: 12, sugar: 4 },
  { id: 'ar3', name: 'High-Protein Mujadara', category: ['Arabic', 'Dinner'], description: 'Lentils and brown rice topped with caramelized onions. Rich in complex carbs and plant protein.', calories: 520, protein: 24, carbs: 85, fat: 9, fiber: 18, sugar: 5 },
  { id: 'ar4', name: 'Kofta Kebab Plate', category: ['Arabic', 'Dinner'], description: 'Lean ground beef and lamb skewers grilled with middle-eastern spices, served with grilled tomatoes and onions.', calories: 480, protein: 35, carbs: 12, fat: 32, fiber: 4, sugar: 2 },
  { id: 'ar5', name: 'Shish Taouk Bowl', category: ['Arabic', 'Lunch', 'Dinner'], description: 'Garlic-lemon marinated chicken skewers over quinoa, served with a side of garlic sauce (toum).', calories: 510, protein: 45, carbs: 40, fat: 18, fiber: 8, sugar: 4 },
  { id: 'ar6', name: 'Fattoush Salad with Grilled Chicken', category: ['Arabic', 'Lunch'], description: 'Mixed greens, radishes, tomatoes, and cucumbers with toasted whole-wheat pita bread and pomegranate molasses.', calories: 390, protein: 35, carbs: 32, fat: 14, fiber: 7, sugar: 6 },
  { id: 'ar7', name: 'Lentil Soup (Shorbat Adas)', category: ['Arabic', 'Lunch', 'Dinner'], description: 'Hearty and warming yellow lentil soup flavored with cumin and turmeric, served with lemon wedges.', calories: 310, protein: 18, carbs: 45, fat: 4, fiber: 15, sugar: 3 },
  { id: 'ar8', name: 'Baba Ghanoush & Veggie Sticks', category: ['Arabic', 'Snack'], description: 'Roasted eggplant dip mixed with tahini and lemon juice, served with carrot and cucumber sticks.', calories: 250, protein: 6, carbs: 20, fat: 16, fiber: 8, sugar: 7 },
  
  // Asian (8 meals)
  { id: 'as1', name: 'Teriyaki Salmon & Jasmine Rice', category: ['Asian', 'Dinner'], description: 'Rich glazed Atlantic salmon fillet alongside steamed jasmine rice and bok choy.', calories: 650, protein: 38, carbs: 70, fat: 20, fiber: 5, sugar: 12 },
  { id: 'as2', name: 'Beef Stir-fry with Broccoli', category: ['Asian', 'Lunch', 'Dinner'], description: 'Thinly sliced lean beef stir-fried with broccoli florets in a light soy-ginger sauce.', calories: 480, protein: 35, carbs: 25, fat: 22, fiber: 6, sugar: 8 },
  { id: 'as3', name: 'Chicken Pho (Noodle Soup)', category: ['Asian', 'Lunch', 'Dinner'], description: 'Vietnamese bone broth with rice noodles, shredded chicken, bean sprouts, and fresh herbs.', calories: 420, protein: 32, carbs: 55, fat: 6, fiber: 4, sugar: 3 },
  { id: 'as4', name: 'Shrimp Pad Thai', category: ['Asian', 'Dinner'], description: 'Classic Thai rice noodles stir-fried with shrimp, eggs, peanuts, and bean sprouts in a tangy tamarind sauce.', calories: 580, protein: 30, carbs: 65, fat: 22, fiber: 5, sugar: 14 },
  { id: 'as5', name: 'Sushi Assortment (Sashimi & Rolls)', category: ['Asian', 'Lunch', 'Dinner'], description: 'Fresh salmon and tuna sashimi accompanied by a spicy tuna roll.', calories: 550, protein: 45, carbs: 60, fat: 14, fiber: 3, sugar: 8 },
  { id: 'as6', name: 'Chicken Tikka Masala', category: ['Asian', 'Dinner'], description: 'Marinated chicken chunks cooked in a creamy tomato-based sauce, served with basmati rice.', calories: 620, protein: 42, carbs: 50, fat: 28, fiber: 6, sugar: 9 },
  { id: 'as7', name: 'Tofu & Vegetable Curry', category: ['Asian', 'Lunch', 'Dinner'], description: 'Firm tofu and mixed vegetables simmered in a coconut milk-based green curry.', calories: 450, protein: 20, carbs: 35, fat: 26, fiber: 8, sugar: 6 },
  { id: 'as8', name: 'Edamame & Seaweed Salad', category: ['Asian', 'Snack'], description: 'Steamed edamame pods lightly salted, alongside a refreshing sesame seaweed salad.', calories: 220, protein: 18, carbs: 15, fat: 10, fiber: 9, sugar: 2 },

  // Italian (8 meals)
  { id: 'it1', name: 'High-Protein Chicken Alfredo', category: ['Italian', 'Dinner'], description: 'Grilled chicken strips, high-protein pasta, and a lightened cauliflower-parmesan sauce.', calories: 690, protein: 48, carbs: 72, fat: 16, fiber: 8, sugar: 4 },
  { id: 'it2', name: 'Turkey Bolognese over Zucchini Noodles', category: ['Italian', 'Dinner'], description: 'Lean ground turkey in a rich tomato basil sauce, served over fresh zucchini noodles.', calories: 350, protein: 35, carbs: 20, fat: 14, fiber: 7, sugar: 9 },
  { id: 'it3', name: 'Caprese Salad with Grilled Chicken', category: ['Italian', 'Lunch'], description: 'Fresh mozzarella, tomatoes, and basil drizzled with balsamic glaze alongside chicken breast.', calories: 410, protein: 40, carbs: 12, fat: 22, fiber: 3, sugar: 8 },
  { id: 'it4', name: 'Margherita Pizza (Cauliflower Crust)', category: ['Italian', 'Dinner'], description: 'Low-carb cauliflower crust topped with fresh tomato sauce, mozzarella, and basil.', calories: 540, protein: 28, carbs: 45, fat: 26, fiber: 10, sugar: 6 },
  { id: 'it5', name: 'Eggplant Parmesan (Baked)', category: ['Italian', 'Dinner'], description: 'Oven-baked breaded eggplant slices layered with marinara and reduced-fat mozzarella.', calories: 420, protein: 22, carbs: 48, fat: 16, fiber: 12, sugar: 11 },
  { id: 'it6', name: 'Minestrone Soup', category: ['Italian', 'Lunch', 'Dinner'], description: 'Hearty Italian vegetable soup with beans, celery, carrots, and tomatoes.', calories: 280, protein: 12, carbs: 45, fat: 5, fiber: 11, sugar: 7 },
  { id: 'it7', name: 'Shrimp Scampi with Asparagus', category: ['Italian', 'Dinner'], description: 'Succulent shrimp sautéed in a garlic, lemon, and white wine sauce over asparagus.', calories: 340, protein: 35, carbs: 10, fat: 18, fiber: 4, sugar: 2 },
  { id: 'it8', name: 'Ricotta & Spinach Stuffed Shells', category: ['Italian', 'Dinner'], description: 'Large pasta shells stuffed with a mixture of part-skim ricotta and spinach, baked in marinara.', calories: 510, protein: 26, carbs: 65, fat: 15, fiber: 6, sugar: 8 },

  // Fast Food Alternatives (8 meals)
  { id: 'ff1', name: 'Lean Bison Burger & Sweet Potato Fries', category: ['Fast Food', 'Dinner'], description: 'Lean bison patty on a whole-wheat bun, served with air-fried sweet potato wedges.', calories: 720, protein: 45, carbs: 60, fat: 24, fiber: 9, sugar: 10 },
  { id: 'ff2', name: 'Air-Fried Chicken Nuggets', category: ['Fast Food', 'Lunch', 'Snack'], description: 'Crispy panko-crusted chicken breast pieces baked in the air fryer.', calories: 380, protein: 35, carbs: 30, fat: 12, fiber: 2, sugar: 1 },
  { id: 'ff3', name: 'Healthy Turkey Wrap', category: ['Fast Food', 'Lunch'], description: 'Sliced turkey breast, light mayo, spinach, and tomato wrapped in a low-carb tortilla.', calories: 320, protein: 28, carbs: 25, fat: 12, fiber: 14, sugar: 3 },
  { id: 'ff4', name: 'Cauliflower Crust Pepperoni Pizza', category: ['Fast Food', 'Dinner'], description: 'A lower-carb alternative to traditional pizza, topped with turkey pepperoni.', calories: 580, protein: 34, carbs: 40, fat: 32, fiber: 8, sugar: 5 },
  { id: 'ff5', name: 'Grilled Chicken Sandwich', category: ['Fast Food', 'Lunch'], description: 'Marinated grilled chicken breast on a toasted whole-wheat bun with lettuce and tomato.', calories: 410, protein: 38, carbs: 42, fat: 10, fiber: 5, sugar: 6 },
  { id: 'ff6', name: 'Turkey Sausage Breakfast Sandwich', category: ['Fast Food', 'Breakfast'], description: 'Lean turkey sausage patty, egg white, and a slice of cheese on an English muffin.', calories: 330, protein: 24, carbs: 28, fat: 14, fiber: 2, sugar: 2 },
  { id: 'ff7', name: 'Baked Sweet Potato Nachos', category: ['Fast Food', 'Snack', 'Dinner'], description: 'Sweet potato slices topped with black beans, lean ground turkey, and light cheese.', calories: 490, protein: 30, carbs: 55, fat: 16, fiber: 12, sugar: 8 },
  { id: 'ff8', name: 'Homemade Baked French Fries', category: ['Fast Food', 'Snack'], description: 'Russet potatoes cut into fries, tossed with olive oil and sea salt, baked until crispy.', calories: 280, protein: 4, carbs: 52, fat: 7, fiber: 6, sugar: 2 },

  // Shakes & Drinks (8 meals)
  { id: 'sd1', name: 'Creamy Whey Protein Shake', category: ['Shakes & Drinks', 'Snack', 'Breakfast'], description: 'Fast digesting whey protein blended with frozen berries and almond milk.', calories: 320, protein: 30, carbs: 20, fat: 6, fiber: 5, sugar: 12 },
  { id: 'sd2', name: 'Green Detox Smoothie', category: ['Shakes & Drinks', 'Breakfast', 'Snack'], description: 'Spinach, kale, green apple, cucumber, and a scoop of collagen peptides.', calories: 210, protein: 15, carbs: 35, fat: 1, fiber: 8, sugar: 22 },
  { id: 'sd3', name: 'Peanut Butter Banana Mass Gainer', category: ['Shakes & Drinks', 'Snack'], description: 'Oats, peanut butter, whole milk, banana, and protein powder for serious bulking.', calories: 850, protein: 50, carbs: 90, fat: 30, fiber: 10, sugar: 25 },
  { id: 'sd4', name: 'Iced Matcha Protein Latte', category: ['Shakes & Drinks', 'Snack'], description: 'Ceremonial grade matcha blended with vanilla protein powder and oat milk.', calories: 240, protein: 25, carbs: 18, fat: 5, fiber: 2, sugar: 8 },
  { id: 'sd5', name: 'Tropical Mango Coconut Smoothie', category: ['Shakes & Drinks', 'Snack', 'Breakfast'], description: 'Frozen mango chunks, coconut water, and a scoop of unflavored protein powder.', calories: 280, protein: 22, carbs: 45, fat: 2, fiber: 4, sugar: 35 },
  { id: 'sd6', name: 'Chocolate Hazelnut Protein Shake', category: ['Shakes & Drinks', 'Snack'], description: 'Chocolate whey protein, a tablespoon of hazelnut butter, and almond milk.', calories: 360, protein: 28, carbs: 15, fat: 20, fiber: 3, sugar: 5 },
  { id: 'sd7', name: 'Cold Brew Coffee Protein Shake', category: ['Shakes & Drinks', 'Breakfast', 'Snack'], description: 'Cold brew coffee blended with ice and a scoop of chocolate protein powder.', calories: 150, protein: 25, carbs: 5, fat: 3, fiber: 1, sugar: 2 },
  { id: 'sd8', name: 'Berry Antioxidant Smoothie', category: ['Shakes & Drinks', 'Snack'], description: 'Mixed berries, flaxseeds, and a splash of pomegranate juice blended until smooth.', calories: 230, protein: 5, carbs: 42, fat: 6, fiber: 12, sugar: 28 },

  // Standard Breakfast/Snacks
  { id: 'st1', name: 'Greek Yogurt, Honey & Granola', category: ['Breakfast', 'Snack'], description: 'Creamy greek yogurt topped with clover honey and high-protein granola.', calories: 340, protein: 20, carbs: 45, fat: 8, fiber: 4, sugar: 18 },
  { id: 'st2', name: 'Oatmeal with Berries & Nuts', category: ['Breakfast'], description: 'Steel-cut oats cooked in almond milk, topped with mixed berries and walnuts.', calories: 390, protein: 12, carbs: 55, fat: 15, fiber: 10, sugar: 12 },
  { id: 'st3', name: 'Beef Jerky & Mixed Nuts', category: ['Snack'], description: 'High-protein grass-fed beef jerky paired with an antioxidant nut mix.', calories: 290, protein: 18, carbs: 10, fat: 18, fiber: 3, sugar: 4 },
  { id: 'st4', name: 'Avocado Toast with Poached Egg', category: ['Breakfast', 'Snack'], description: 'Whole-grain toast topped with mashed avocado and a perfectly poached egg.', calories: 320, protein: 14, carbs: 22, fat: 20, fiber: 7, sugar: 2 },
  { id: 'st5', name: 'Cottage Cheese & Pineapple', category: ['Breakfast', 'Snack'], description: 'Low-fat cottage cheese paired with fresh pineapple chunks.', calories: 200, protein: 24, carbs: 18, fat: 3, fiber: 2, sugar: 14 },
  { id: 'st6', name: 'Hard-Boiled Eggs & Almonds', category: ['Snack'], description: 'Two hard-boiled eggs and a small handful of raw almonds.', calories: 300, protein: 18, carbs: 5, fat: 24, fiber: 3, sugar: 1 }
];

const categories: Category[] = [
  'All', 'Arabic', 'Asian', 'Italian', 'Fast Food', 'Shakes & Drinks', 'Breakfast', 'Lunch', 'Dinner', 'Snack'
];

export default function RecommendationsPage() {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState<Category>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [loggingId, setLoggingId] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);

  const filteredFoods = foodDatabase.filter(food => {
    const matchesCategory = activeCategory === 'All' || food.category.includes(activeCategory);
    const matchesSearch = food.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          food.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleLogMeal = async (food: Recommendation) => {
    const userId = localStorage.getItem('user_id');
    if (!userId) {
      navigate('/login');
      return;
    }

    setLoggingId(food.id);
    try {
      await api.post(`/meals/${userId}`, {
        food_name: `[Recommendation] ${food.name}`,
        calories: food.calories,
        protein: food.protein,
        carbs: food.carbs,
        fat: food.fat,
        fiber: food.fiber,
        sugar: food.sugar
      });
      
      setSuccessId(food.id);
      setTimeout(() => setSuccessId(null), 2000);
    } catch (err) {
      console.error('Failed to log recommended meal', err);
      alert('Could not log meal. Please try again.');
    } finally {
      setLoggingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-surface-50 to-surface-100 text-surface-900 font-sans antialiased pb-20">
      {/* Navigation Header */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-surface-200 sticky top-0 z-20 transition-all">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => navigate('/dashboard')}
                className="p-2.5 rounded-xl hover:bg-surface-100 text-surface-500 hover:text-surface-900 transition-all border border-transparent hover:border-surface-200"
              >
                <ArrowLeft size={18} />
              </button>
              <h1 className="text-xl font-bold tracking-tight">Meal Discovery</h1>
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

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 bg-white rounded-3xl p-8 border border-surface-200 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary-400/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
          
          <div className="space-y-3 relative z-10">
            <div className="flex items-center gap-2">
              <Sparkles size={20} className="text-primary-500" />
              <h2 className="text-2xl font-extrabold text-surface-900">Global Recommendations</h2>
            </div>
            <p className="text-surface-500 max-w-lg leading-relaxed">
              Explore our extensive library of highly tailored meals. Discover Arabic, Asian, Italian, Fast Food alternatives, and powerful Shakes to match your daily macros.
            </p>
          </div>

          <div className="relative w-full md:w-72 z-10 shrink-0">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search size={16} className="text-surface-400" />
            </div>
            <input
              type="text"
              placeholder="Search recipes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-surface-50 border border-surface-200 focus:border-primary-500 focus:bg-white rounded-xl focus:outline-none focus:ring-4 focus:ring-primary-500/10 transition-all font-medium text-sm"
            />
          </div>
        </div>

        {/* Categories Horizontal Scroll */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none snap-x">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`snap-start shrink-0 px-5 py-2.5 rounded-2xl text-sm font-bold border transition-all ${
                activeCategory === cat
                  ? 'bg-surface-900 border-surface-900 text-white shadow-md shadow-surface-900/10'
                  : 'bg-white border-surface-200 text-surface-600 hover:text-surface-900 hover:bg-surface-50'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Food Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredFoods.map((food) => (
            <div key={food.id} className="bg-white border border-surface-200 rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col group relative">
              <div className="flex-1 space-y-4">
                <div className="flex gap-2 flex-wrap mb-2">
                  {food.category.filter(c => c !== 'All').slice(0, 2).map(c => (
                    <span key={c} className="text-[10px] font-extrabold uppercase tracking-widest text-primary-700 bg-primary-50 border border-primary-100 px-2 py-0.5 rounded-md">
                      {c}
                    </span>
                  ))}
                </div>
                
                <h3 className="font-bold text-lg text-surface-900 leading-tight group-hover:text-primary-600 transition-colors">
                  {food.name}
                </h3>
                <p className="text-surface-500 text-sm leading-relaxed">
                  {food.description}
                </p>
                
                <div className="grid grid-cols-3 gap-2 pt-2">
                  <div className="bg-surface-50 rounded-xl p-2.5 text-center border border-surface-100">
                    <div className="flex items-center justify-center gap-1 text-orange-500 mb-0.5">
                      <Flame size={12} />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Cal</span>
                    </div>
                    <span className="font-extrabold text-surface-900 text-sm">{food.calories}</span>
                  </div>
                  <div className="bg-surface-50 rounded-xl p-2.5 text-center border border-surface-100">
                    <div className="flex items-center justify-center gap-1 text-rose-500 mb-0.5">
                      <Heart size={12} />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Pro</span>
                    </div>
                    <span className="font-extrabold text-surface-900 text-sm">{food.protein}g</span>
                  </div>
                  <div className="bg-surface-50 rounded-xl p-2.5 text-center border border-surface-100">
                    <div className="flex items-center justify-center gap-1 text-amber-500 mb-0.5">
                      <Droplets size={12} />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Carb</span>
                    </div>
                    <span className="font-extrabold text-surface-900 text-sm">{food.carbs}g</span>
                  </div>
                </div>
                
                <div className="flex justify-center gap-6 pt-1 pb-2">
                  <div className="text-center">
                    <span className="text-[10px] font-bold text-surface-400 uppercase">Fat</span>
                    <p className="text-xs font-bold text-surface-700">{food.fat}g</p>
                  </div>
                  <div className="text-center">
                    <span className="text-[10px] font-bold text-surface-400 uppercase">Fiber</span>
                    <p className="text-xs font-bold text-surface-700">{food.fiber}g</p>
                  </div>
                  <div className="text-center">
                    <span className="text-[10px] font-bold text-surface-400 uppercase">Sugar</span>
                    <p className="text-xs font-bold text-surface-700">{food.sugar}g</p>
                  </div>
                </div>

              </div>

              <button 
                onClick={() => handleLogMeal(food)}
                disabled={loggingId === food.id || successId === food.id}
                className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 mt-4 ${
                  successId === food.id
                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                    : loggingId === food.id
                    ? 'bg-surface-100 text-surface-400 cursor-not-allowed'
                    : 'bg-primary-50 text-primary-700 hover:bg-primary-600 hover:text-white border border-primary-200 hover:border-transparent'
                }`}
              >
                {successId === food.id ? (
                  <>
                    <CheckCircle2 size={18} />
                    Logged!
                  </>
                ) : loggingId === food.id ? (
                  <div className="h-5 w-5 rounded-full border-2 border-surface-300 border-t-surface-500 animate-spin" />
                ) : (
                  <>
                    <Plus size={18} />
                    Log this Meal
                  </>
                )}
              </button>
            </div>
          ))}
        </div>

        {filteredFoods.length === 0 && (
          <div className="text-center py-20 bg-white rounded-3xl border border-surface-200">
            <Search size={48} className="mx-auto text-surface-300 mb-4" />
            <h3 className="text-lg font-bold text-surface-900 mb-1">No meals found</h3>
            <p className="text-surface-500 text-sm">Try adjusting your search or selecting a different category.</p>
          </div>
        )}

      </main>
    </div>
  );
}

