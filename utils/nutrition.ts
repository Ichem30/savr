import { UserProfile, FitnessGoal, Gender } from '../types';

export const calculateBMR = (weight: number, height: number, age: number, gender: Gender): number => {
  // Mifflin-St Jeor Equation
  let bmr = (10 * weight) + (6.25 * height) - (5 * age);
  
  if (gender === 'male') {
    bmr += 5;
  } else {
    bmr -= 161;
  }
  
  return bmr;
};

const ACTIVITY_MULTIPLIERS = {
  'sedentary': 1.2,
  'light': 1.375,
  'moderate': 1.55,
  'active': 1.725,
  'very_active': 1.9
};

export const calculateDailyTargets = (user: UserProfile) => {
  if (!user.weight || !user.height || !user.age) {
    return {
      calories: 2000,
      protein: 150,
      carbs: 200,
      fats: 65,
      water: 2500
    };
  }

  const bmr = calculateBMR(user.weight, user.height, user.age, user.gender);
  
  // TDEE = Total Daily Energy Expenditure
  const activityMultiplier = ACTIVITY_MULTIPLIERS[user.activityLevel || 'moderate'] || 1.375;
  const tdee = bmr * activityMultiplier;

  let targetCalories = tdee;

  // Use explicit weekly goal if set, otherwise fallback to goal type presets
  if (user.weeklyGoal !== undefined) {
    // 1kg of fat ≈ 7700 kcal
    // Daily deficit/surplus = (Weekly Goal * 7700) / 7
    // Example: -0.5 kg/week => (-0.5 * 7700) / 7 = -550 kcal/day
    const dailyAdjustment = (user.weeklyGoal * 7700) / 7;
    targetCalories += dailyAdjustment;
  } else {
    switch (user.goal) {
      case 'weight_loss':
        targetCalories -= 500; // Deficit for ~0.5kg/week
        break;
      case 'muscle_gain':
        targetCalories += 300; // Surplus
        break;
      // maintain is default
    }
  }

  // Ensure safe minimums (1200 for women, 1500 for men roughly, but simpler check here)
  if (targetCalories < 1200) targetCalories = 1200;

  // Macro Split (Balanced: 40% Carbs, 30% Protein, 30% Fat)
  // Protein: 4kcal/g, Carbs: 4kcal/g, Fat: 9kcal/g
  
  let protein, carbs, fats;

  if (user.customMacros) {
    protein = user.customMacros.protein;
    carbs = user.customMacros.carbs;
    fats = user.customMacros.fats;
  } else {
    protein = Math.round((targetCalories * 0.30) / 4);
    carbs = Math.round((targetCalories * 0.40) / 4);
    fats = Math.round((targetCalories * 0.30) / 9);
  }

  // Water: Approx 35ml per kg of bodyweight
  const water = Math.round(user.weight * 35);

  return {
    calories: Math.round(targetCalories),
    protein,
    carbs,
    fats,
    water
  };
};
