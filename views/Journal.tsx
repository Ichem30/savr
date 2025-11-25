import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Icons } from '../components/Icons';
import { UserProfile, DailyLog, ViewState, Recipe } from '../types';
import { calculateDailyTargets } from '../utils/nutrition';
import { subscribeToDailyLog, addMealToLog, deleteMealFromLog, updateMealInLog, updateWaterLog, auth } from '../services/firebase';
import { MealDetailModal } from '../components/MealDetailModal';

interface JournalProps {
  user: UserProfile | null;
  savedRecipes?: Recipe[];
  onNavigate: (view: ViewState) => void;
}

const MEAL_TYPES = [
    { id: 'breakfast', label: 'Petit déjeuner', icon: Icons.Coffee, color: 'text-amber-600 bg-amber-500' },
    { id: 'lunch', label: 'Déjeuner', icon: Icons.Utensils, color: 'text-primary bg-primary' },
    { id: 'dinner', label: 'Dîner', icon: Icons.Moon, color: 'text-indigo-500 bg-indigo-500' },
    { id: 'snack', label: 'En-cas', icon: Icons.Apple, color: 'text-rose-500 bg-rose-500' },
];

export const Journal: React.FC<JournalProps> = ({ user, savedRecipes = [], onNavigate }) => {
  // State
  const [currentDate, setCurrentDate] = useState(new Date().toISOString().split('T')[0]);
  const [logData, setLogData] = useState<DailyLog | null>(null);
  const [openedMealType, setOpenedMealType] = useState<string | null>(null);

  // Derived Targets
  const targets = user ? calculateDailyTargets(user) : { calories: 2000, protein: 150, carbs: 200, fats: 65, water: 2500 };
  
  // Subscribe to Real Data
  useEffect(() => {
      if (!auth.currentUser) return;
      const unsubscribe = subscribeToDailyLog(auth.currentUser.uid, currentDate, (data) => {
          setLogData(data as DailyLog);
      });
      return () => unsubscribe();
  }, [currentDate]);

  // Calculated Values
  const consumed = logData?.consumed || 0;
  const burned = logData?.burned || 0;
  const water = logData?.water || 0;
  const remaining = targets.calories - consumed + burned;
  const progress = Math.min(100, (consumed / targets.calories) * 100);
  
  // Streak
  const streak = user?.streak?.current || 0;

  // Handlers
  const changeDate = (offset: number) => {
      const date = new Date(currentDate);
      date.setDate(date.getDate() + offset);
      setCurrentDate(date.toISOString().split('T')[0]);
  };

  const updateWater = async (amount: number) => {
      if (!auth.currentUser) return;
      const newAmount = Math.max(0, water + amount);
      await updateWaterLog(auth.currentUser.uid, currentDate, newAmount);
  };

  const handleAddMealEntry = async (entry: any) => {
      if (!auth.currentUser) return;
      await addMealToLog(auth.currentUser.uid, currentDate, entry);
  };

  const handleUpdateMealEntry = async (entry: any) => {
      if (!auth.currentUser) return;
      await updateMealInLog(auth.currentUser.uid, currentDate, entry);
  };

  const handleRemoveMeal = async (mealId: string) => {
      if (!auth.currentUser) return;
      await deleteMealFromLog(auth.currentUser.uid, currentDate, mealId);
  };

  const isToday = currentDate === new Date().toISOString().split('T')[0];

  return (
    <div className="h-full flex flex-col bg-gray-50">
        {/* Header Sticky */}
        <div className="bg-white/80 backdrop-blur-md sticky top-0 z-20 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
            <div className="flex items-center gap-4">
                <button onClick={() => changeDate(-1)} className="p-1 hover:bg-gray-100 rounded-full text-gray-400">
                    <Icons.ChevronLeft size={20} />
                </button>
                <div className="text-center">
                    <h1 className="text-lg font-black text-gray-800 leading-none">
                        {isToday ? "Aujourd'hui" : currentDate}
                    </h1>
                </div>
                <button 
                    onClick={() => changeDate(1)} 
                    disabled={isToday}
                    className={`p-1 rounded-full ${isToday ? 'text-gray-200 cursor-not-allowed' : 'hover:bg-gray-100 text-gray-400'}`}
                >
                    <Icons.ChevronRight size={20} />
                </button>
            </div>
            
            <div className="flex gap-3">
                <div className="flex flex-col items-center">
                    <Icons.Flame 
                        size={20} 
                        className={`mb-0.5 transition-colors ${streak > 0 ? 'text-orange-500' : 'text-gray-300'}`} 
                        fill={streak > 0 ? "currentColor" : "none"} 
                    />
                    <span className={`text-xs font-bold ${streak > 0 ? 'text-orange-600' : 'text-gray-400'}`}>
                        {streak}
                    </span>
                </div>
            </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 pb-32 no-scrollbar">
            
            {/* Summary Card */}
            <div className="bg-white rounded-3xl p-6 mb-6 shadow-sm border border-gray-100 relative overflow-hidden">
                <div className="flex justify-between items-start mb-6">
                    <h2 className="font-bold text-gray-800 text-lg">Résumé</h2>
                </div>

                <div className="flex flex-col items-center mb-6">
                    {/* Ring Chart */}
                    <div className="relative w-40 h-40 flex items-center justify-center">
                        <svg className="w-full h-full transform -rotate-90">
                            <circle cx="80" cy="80" r="70" fill="transparent" stroke="#f3f4f6" strokeWidth="10" />
                            <circle
                                cx="80" cy="80" r="70"
                                fill="transparent"
                                stroke="currentColor"
                                className={remaining < 0 ? "text-red-500" : "text-primary"}
                                strokeWidth="10"
                                strokeDasharray={2 * Math.PI * 70}
                                strokeDashoffset={2 * Math.PI * 70 * (1 - progress / 100)}
                                strokeLinecap="round"
                            />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className={`text-3xl font-black tracking-tight ${remaining < 0 ? "text-red-500" : "text-gray-800"}`}>
                                {Math.round(remaining)}
                            </span>
                            <span className="text-gray-400 text-[10px] font-bold uppercase">Restantes</span>
                        </div>
                    </div>

                    <div className="flex justify-between w-full px-8 mt-4 text-center">
                        <div>
                            <span className="block text-lg font-bold text-gray-700">{consumed}</span>
                            <span className="text-xs text-gray-400 font-medium">Mangées</span>
                        </div>
                        <div>
                            <span className="block text-lg font-bold text-gray-700">{burned}</span>
                            <span className="text-xs text-gray-400 font-medium">Brûlées</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Meals List */}
            <h2 className="text-lg font-bold text-gray-800 mb-4 px-1">Alimentation</h2>
            
            {MEAL_TYPES.map((type) => {
                const meals = (logData?.meals || []).filter(m => m.type === type.id);
                const totalCals = meals.reduce((acc, m) => acc + m.calories, 0);

                return (
                    <motion.div 
                        key={type.id} 
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setOpenedMealType(type.id)}
                        className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-4 cursor-pointer hover:border-primary/30 transition-all group"
                    >
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-full ${type.color} bg-opacity-10 flex items-center justify-center text-current`}>
                                    <type.icon size={20} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-800 group-hover:text-primary transition-colors">{type.label}</h3>
                                    <p className="text-gray-400 text-xs font-bold">{totalCals} kcal</p>
                                </div>
                            </div>
                            <button className="w-8 h-8 bg-gray-50 group-hover:bg-primary group-hover:text-white rounded-full flex items-center justify-center text-primary transition-all shadow-sm">
                                <Icons.Plus size={18} />
                            </button>
                        </div>

                        {meals.length > 0 ? (
                            <div className="space-y-2 pl-14">
                                {meals.map((meal: any) => (
                                    <div key={meal.id} className="flex justify-between items-center py-1 border-b border-gray-50 last:border-0">
                                        <span className="text-gray-600 text-sm font-medium truncate pr-2">{meal.name}</span>
                                        <span className="text-gray-400 text-xs font-bold whitespace-nowrap">{meal.calories} kcal</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="pl-14 py-1 text-left w-full text-gray-300 text-xs font-medium italic">
                                Aucun aliment ajouté
                            </div>
                        )}
                    </motion.div>
                );
            })}

            {/* Water Tracker */}
            <div className="bg-blue-50 rounded-3xl p-6 mt-6 border border-blue-100">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h3 className="font-bold text-blue-900">Eau</h3>
                        <p className="text-blue-400 text-xs font-bold">Objectif: {(targets.water / 1000).toFixed(1)} L</p>
                    </div>
                    <div className="bg-blue-100 p-2 rounded-full text-blue-500">
                        <Icons.Droplet size={20} fill="currentColor" />
                    </div>
                </div>
                
                <div className="flex flex-col items-center">
                     <span className="text-3xl font-black text-blue-600 mb-6">{(water / 1000).toFixed(2)} L</span>
                     
                     <div className="flex justify-center gap-3 w-full">
                        <div className="h-2 w-full bg-blue-200 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${Math.min(100, (water / targets.water) * 100)}%` }} />
                        </div>
                     </div>
                     
                     <div className="flex items-center gap-4 mt-6">
                         <button 
                            onClick={() => updateWater(-250)}
                            disabled={water <= 0}
                            className="w-12 h-12 bg-white border border-blue-100 rounded-xl text-blue-400 flex items-center justify-center hover:bg-blue-50 hover:text-blue-600 transition-all active:scale-95 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Icons.Minus size={24} />
                         </button>
                         
                         <button 
                            onClick={() => updateWater(250)}
                            className="px-6 h-12 bg-blue-500 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-blue-600 transition-all active:scale-95 shadow-lg shadow-blue-500/20"
                        >
                            <Icons.Plus size={20} /> Ajouter 250 ml
                         </button>
                     </div>
                </div>
            </div>
        </div>

        {/* Meal Detail Full Modal */}
        <AnimatePresence>
            {openedMealType && (
                <MealDetailModal 
                    mealType={MEAL_TYPES.find(t => t.id === openedMealType)!}
                    currentDate={isToday ? "Aujourd'hui" : currentDate}
                    consumedItems={(logData?.meals || []).filter(m => m.type === openedMealType)}
                    savedRecipes={savedRecipes}
                onClose={() => setOpenedMealType(null)}
                onAddMeal={handleAddMealEntry}
                onUpdateMeal={handleUpdateMealEntry}
                onRemoveMeal={handleRemoveMeal}
            />
        )}
        </AnimatePresence>
    </div>
  );
};
