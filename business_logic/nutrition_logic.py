"""
CHEAT SHEET FOR PRESENTATION - `nutrition_logic.py` (Business Logic)
===========================================================
WHAT THIS FILE DOES:
This file contains the core math and science for calculating a user's daily nutritional targets (calories, protein, carbs, fats, and water) based on their body profile.

HOW IT WORKS:
1. `calculate_tdee()`: Uses the Mifflin-St Jeor equation to estimate the Basal Metabolic Rate (BMR) - how many calories the body burns at rest based on age, weight, height, and gender. It then multiplies this by their activity level (sedentary vs active) to get the Total Daily Energy Expenditure (TDEE).
2. `calculate_nutrition()`: Takes the TDEE and adjusts it based on the user's goal (subtracts calories for weight loss, adds for muscle gain). It then splits those calories into Macros:
   - Protein: Important for muscle. Usually ~30% of calories.
   - Fats: Important for hormones. Usually ~25% of calories.
   - Carbs: The remaining energy (100% - 30% - 25% = 45%).
===========================================================
"""

def calculate_nutrition(age, weight, height, goal, gender="male", target_weight=None, activity_level="sedentary"):
    # Ensure reasonable defaults if user profile is incomplete
    age = float(age) if age else 25.0
    weight = float(weight) if weight else 70.0
    height = float(height) if height else 170.0
    
    # Basic Metabolic Rate (BMR) using Mifflin-St Jeor Equation
    bmr = (10 * weight) + (6.25 * height) - (5 * age)
    
    if gender.lower() == "female":
        bmr = bmr - 161
    else:
        bmr = bmr + 5
        
    multipliers = {
        "sedentary": 1.2,
        "lightly active": 1.375,
        "moderately active": 1.55,
        "very active": 1.725,
        "extra active": 1.9
    }
    # Total Daily Energy Expenditure (TDEE) based on activity level
    tdee = bmr * multipliers.get(activity_level.lower(), 1.2)
    
    # Base split
    p_pct, c_pct, f_pct = 0.30, 0.40, 0.30
    daily_calories = tdee

    # If we have a target weight, use it to calculate calorie offset
    if target_weight is not None and float(target_weight) != float(weight):
        difference = float(target_weight) - float(weight)
        
        if difference > 0:
            # Gaining weight
            if difference >= 10:
                daily_calories = tdee + 750  # Aggressive bulk
            elif difference >= 5:
                daily_calories = tdee + 500  # Standard bulk
            else:
                daily_calories = tdee + 250  # Lean bulk
            p_pct, c_pct, f_pct = 0.30, 0.50, 0.20
        else:
            # Losing weight
            abs_diff = abs(difference)
            if abs_diff >= 10:
                daily_calories = tdee - 750  # Aggressive cut
            elif abs_diff >= 5:
                daily_calories = tdee - 500  # Standard cut
            else:
                daily_calories = tdee - 250  # Gentle cut
            p_pct, c_pct, f_pct = 0.40, 0.30, 0.30
    else:
        # Fallback to goal string if no target weight or target == current
        if goal.lower() == "lose weight":
            daily_calories = tdee - 500
            p_pct, c_pct, f_pct = 0.40, 0.30, 0.30
        elif goal.lower() == "gain muscle":
            daily_calories = tdee + 500
            p_pct, c_pct, f_pct = 0.30, 0.50, 0.20
        
    protein = (daily_calories * p_pct) / 4
    carbs = (daily_calories * c_pct) / 4
    fat = (daily_calories * f_pct) / 9
    
    # 14g of fiber per 1000 calories is the general recommendation
    fiber = (daily_calories / 1000) * 14
    # Sugar should be < 10% of total calories (1g sugar = 4 calories)
    sugar = (daily_calories * 0.10) / 4
    
    # Water recommendation: 35ml per kg of body weight
    water_ml = weight * 35

    # Baseline Micronutrient Targets
    sodium_mg = 2300
    potassium_mg = 3400
    calcium_mg = 1000
    vitamin_c_mg = 90 if gender.lower() == "male" else 75
    vitamin_d_mcg = 15
    iron_mg = 8 if gender.lower() == "male" else 18

    return {
        "calories": round(daily_calories),
        "protein_grams": round(protein),
        "carbs_grams": round(carbs),
        "fat_grams": round(fat),
        "fiber_grams": round(fiber),
        "sugar_grams": round(sugar),
        "water_ml": round(water_ml),
        "sodium_mg": sodium_mg,
        "potassium_mg": potassium_mg,
        "calcium_mg": calcium_mg,
        "vitamin_c_mg": vitamin_c_mg,
        "vitamin_d_mcg": vitamin_d_mcg,
        "iron_mg": iron_mg
    }
