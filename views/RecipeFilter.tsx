import React, { useState } from 'react';
import { Icons } from '../components/Icons';
import { motion } from 'framer-motion';

interface RecipeFilterProps {
  onGenerate: (strictMode: boolean, options: { mealType?: string, timeLimit?: string, skillLevel?: string }) => void;
  onBack: () => void;
}

const MEAL_TYPES = [
  { id: 'breakfast', label: 'Breakfast', icon: Icons.Sunrise },
  { id: 'lunch', label: 'Lunch', icon: Icons.Sun },
  { id: 'dinner', label: 'Dinner', icon: Icons.Moon },
  { id: 'snack', label: 'Snack', icon: Icons.Apple },
  { id: 'dessert', label: 'Dessert', icon: Icons.Cake },
  { id: 'drink', label: 'Boisson', icon: Icons.Coffee },
];

const TIME_LIMITS = [
  { id: '15 min', label: '15 min', icon: Icons.Zap },
  { id: '30 min', label: '30 min', icon: Icons.Clock },
  { id: '45 min', label: '45 min', icon: Icons.Clock },
  { id: '60 min', label: '1 hour', icon: Icons.Clock },
  { id: 'unlimited', label: 'No limit', icon: Icons.Infinity },
];

const SKILL_LEVELS = [
  { id: 'Beginner', label: 'Beginner', icon: Icons.Leaf },
  { id: 'Intermediate', label: 'Intermediate', icon: Icons.ChefHat },
  { id: 'Advanced', label: 'Pro', icon: Icons.Flame },
];

export const RecipeFilter: React.FC<RecipeFilterProps> = ({ onGenerate, onBack }) => {
  const [mealType, setMealType] = useState<string | undefined>(undefined);
  const [timeLimit, setTimeLimit] = useState<string | undefined>(undefined);
  const [skillLevel, setSkillLevel] = useState<string | undefined>(undefined);
  const [strictMode, setStrictMode] = useState(false);

  const handleGenerate = () => {
    onGenerate(strictMode, {
      mealType,
      timeLimit: timeLimit === 'unlimited' ? undefined : timeLimit,
      skillLevel
    });
  };

  const Section = ({ title, children, isGrid = false }: { title: string, children: React.ReactNode, isGrid?: boolean }) => (
    <div className="mb-8">
      <h3 className="text-lg font-bold text-gray-800 mb-4 px-1">{title}</h3>
      <div className={isGrid 
        ? "grid grid-cols-3 gap-3 px-1" 
        : "flex gap-3 overflow-x-auto pb-4 px-1 no-scrollbar snap-x"
      }>
        {children}
      </div>
    </div>
  );

  const OptionCard = ({ 
    selected, 
    onClick, 
    label, 
    icon: Icon 
  }: { 
    selected: boolean, 
    onClick: () => void, 
    label: string, 
    icon: any 
  }) => (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`
        flex flex-col items-center justify-center ${!selected ? 'w-full' : 'w-full'} h-24 rounded-2xl border-2 transition-all snap-start
        ${selected 
          ? 'border-primary bg-primary/5 text-primary shadow-md shadow-primary/10' 
          : 'border-gray-100 bg-white text-gray-500 hover:border-gray-200 hover:bg-gray-50'
        }
      `}
    >
      <Icon size={28} className={`mb-2 ${selected ? 'text-primary' : 'text-gray-400'}`} strokeWidth={selected ? 2.5 : 2} />
      <span className="text-sm font-bold">{label}</span>
    </motion.button>
  );

  const MAIN_MEALS = MEAL_TYPES.filter(m => ['breakfast', 'lunch', 'dinner', 'snack'].includes(m.id));
  const EXTRA_MEALS = MEAL_TYPES.filter(m => ['dessert', 'drink'].includes(m.id));

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white px-6 pt-6 pb-4 border-b border-gray-100 sticky top-0 z-10">
        <div className="flex items-center gap-4 mb-2">
          <button onClick={onBack} className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors">
            <Icons.ArrowLeft size={24} className="text-gray-700" />
          </button>
          <h1 className="text-2xl font-black text-gray-800">Chef's Table</h1>
        </div>
        <p className="text-gray-500">Customize your recipe generation.</p>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        
        <div className="mb-8">
          <h3 className="text-lg font-bold text-gray-800 mb-4 px-1">What kind of meal?</h3>
          
          {/* Main Meals Grid */}
          <div className="grid grid-cols-4 gap-2 mb-4 px-1">
            {MAIN_MEALS.map(type => (
              <motion.button
                key={type.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => setMealType(mealType === type.id ? undefined : type.id)}
                className={`
                  flex flex-col items-center justify-center h-20 rounded-2xl border-2 transition-all
                  ${mealType === type.id 
                    ? 'border-primary bg-primary/5 text-primary shadow-md shadow-primary/10' 
                    : 'border-gray-100 bg-white text-gray-500 hover:border-gray-200 hover:bg-gray-50'
                  }
                `}
              >
                <type.icon size={24} className={`mb-1 ${mealType === type.id ? 'text-primary' : 'text-gray-400'}`} strokeWidth={mealType === type.id ? 2.5 : 2} />
                <span className="text-[10px] font-bold truncate w-full text-center px-1">{type.label}</span>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Sweets & Drinks Section */}
        <div className="mb-8">
          <h3 className="text-lg font-bold text-gray-800 mb-4 px-1">Sweets & Drinks</h3>
          <div className="grid grid-cols-2 gap-3 px-1">
            {EXTRA_MEALS.map(type => (
              <motion.button
                key={type.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => setMealType(mealType === type.id ? undefined : type.id)}
                className={`
                  flex items-center justify-center gap-3 h-16 rounded-2xl border-2 transition-all
                  ${mealType === type.id 
                    ? 'border-primary bg-primary/5 text-primary shadow-md shadow-primary/10' 
                    : 'border-gray-100 bg-white text-gray-500 hover:border-gray-200 hover:bg-gray-50'
                  }
                `}
              >
                <type.icon size={24} className={`${mealType === type.id ? 'text-primary' : 'text-gray-400'}`} strokeWidth={mealType === type.id ? 2.5 : 2} />
                <span className="text-sm font-bold">{type.label}</span>
              </motion.button>
            ))}
          </div>
        </div>

        <Section title="How much time do you have?">
          {TIME_LIMITS.map(limit => (
            <OptionCard
              key={limit.id}
              label={limit.label}
              icon={limit.icon}
              selected={timeLimit === limit.id}
              onClick={() => setTimeLimit(timeLimit === limit.id ? undefined : limit.id)}
            />
          ))}
        </Section>

        <Section title="Skill Level">
          {SKILL_LEVELS.map(level => (
            <OptionCard
              key={level.id}
              label={level.label}
              icon={level.icon}
              selected={skillLevel === level.id}
              onClick={() => setSkillLevel(skillLevel === level.id ? undefined : level.id)}
            />
          ))}
        </Section>

        {/* Strict Mode Toggle */}
        <div 
            onClick={() => setStrictMode(!strictMode)} 
            className={`p-4 rounded-2xl border-2 flex items-center gap-4 cursor-pointer transition-all mb-8
                ${strictMode 
                    ? 'border-emerald-500 bg-emerald-50' 
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }
            `}
        >
            <div className={`p-3 rounded-full ${strictMode ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-400'}`}>
                <Icons.Refrigerator size={24} />
            </div>
            <div className="flex-1">
                <h3 className={`font-bold ${strictMode ? 'text-emerald-900' : 'text-gray-800'}`}>Strict Pantry Mode</h3>
                <p className={`text-sm ${strictMode ? 'text-emerald-700' : 'text-gray-500'}`}>
                    {strictMode ? "Only use ingredients I have." : "Allow missing ingredients."}
                </p>
            </div>
            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${strictMode ? 'border-emerald-500 bg-emerald-500' : 'border-gray-300'}`}>
                {strictMode && <Icons.Check size={14} className="text-white" strokeWidth={3} />}
            </div>
        </div>

      </div>

      {/* Bottom Action Bar */}
      <div className="p-6 bg-white border-t border-gray-100">
        <button
          onClick={handleGenerate}
          className="w-full py-4 bg-gradient-to-r from-primary to-emerald-600 text-white rounded-2xl font-bold shadow-lg shadow-primary/20 flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          <Icons.Sparkles size={20} className="fill-white/20" />
          Find Recipes
        </button>
      </div>
    </div>
  );
};

