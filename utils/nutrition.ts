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
  
  // Activity Level (Assuming Sedentary/Light Active for base, simplified)
  // TDEE = Total Daily Energy Expenditure
  const tdee = bmr * 1.375;

  let targetCalories = tdee;

  switch (user.goal) {
    case 'weight_loss':
      targetCalories -= 500; // Deficit
      break;
    case 'muscle_gain':
      targetCalories += 300; // Surplus
      break;
    // maintain is default
  }

  // Macro Split (Balanced: 40% Carbs, 30% Protein, 30% Fat)
  // Protein: 4kcal/g, Carbs: 4kcal/g, Fat: 9kcal/g
  
  const protein = Math.round((targetCalories * 0.30) / 4);
  const carbs = Math.round((targetCalories * 0.40) / 4);
  const fats = Math.round((targetCalories * 0.30) / 9);

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

