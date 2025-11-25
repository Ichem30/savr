export type Gender = 'male' | 'female' | 'other';
export type FitnessGoal = 'weight_loss' | 'muscle_gain' | 'maintain' | 'balanced';

export interface UserProfile {
  name: string;
  height: number; // cm
  weight: number; // kg
  age: number;
  gender: Gender;
  goal: FitnessGoal;
  allergies: string[];
  dislikes: string[];
  isOnboarded: boolean;
  weightHistory?: { date: string, weight: number }[];
  streak?: {
    current: number;
    lastLogDate: string;
  };
}

export interface Ingredient {
  id: string;
  name: string;
  quantity?: string;
  isSelected?: boolean;
  isScanned?: boolean;
  brand?: string;
  image?: string;
  unit?: string;
  servingSize?: number;
  nutrition?: {
    calories?: number;
    protein?: number;
    carbs?: number;
    fats?: number;
  };
}

export interface Recipe {
  id: string;
  title: string;
  description: string;
  prepTime: string;
  cookTime: string;
  calories: number;
  macros: {
    protein: string;
    carbs: string;
    fats: string;
  };
  ingredients: string[];
  missingIngredients: string[];
  instructions: string[];
  matchPercentage: number;
  tags: string[];
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  isFunctionCall?: boolean;
}

export type ViewState = 'auth' | 'onboarding' | 'edit-profile' | 'pantry' | 'recipes' | 'recipe-detail' | 'cooking-mode' | 'profile' | 'journal';

export interface MealEntry {
  id: string;
  name: string;
  calories: number;
  type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
}

export interface DailyLog {
  date: string;
  consumed: number; // calories
  burned: number;
  water: number; // ml
  meals: MealEntry[];
  macros: {
    carbs: { current: number, target: number };
    protein: { current: number, target: number };
    fats: { current: number, target: number };
  }
}