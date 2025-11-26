import React, { useState, useEffect } from 'react';
import { UserProfile, Gender, FitnessGoal } from '../types';
import { Icons } from '../components/Icons';
import { motion, AnimatePresence } from 'framer-motion';
import { Check } from 'lucide-react';

interface OnboardingProps {
  onComplete: (profile: UserProfile, initialPantryItems?: string[]) => void;
  initialData?: UserProfile | null;
}

const COMMON_ALLERGIES = ['Peanuts', 'Dairy', 'Gluten', 'Shellfish', 'Eggs', 'Soy', 'Tree Nuts', 'Fish'];
const COMMON_DISLIKES = ['Mushrooms', 'Onions', 'Pork', 'Beef', 'Fish', 'Cilantro', 'Tomatoes', 'Spicy Food'];
const PANTRY_STAPLES = [
    "Salt", "Pepper", "Olive Oil", "Butter", "Eggs", "Milk", 
    "Flour", "Sugar", "Rice", "Pasta", "Garlic", "Onions", 
    "Tomatoes", "Potatoes", "Chicken Breast", "Bread"
];

export const Onboarding: React.FC<OnboardingProps> = ({ onComplete, initialData }) => {
  const [step, setStep] = useState(0); // 0 = Welcome
  const [direction, setDirection] = useState(1);
  const [isAnimating, setIsAnimating] = useState(false);

  // Form State
  const [formData, setFormData] = useState<Partial<UserProfile>>({
    name: '',
    height: 175,
    weight: 75,
    age: 30,
    gender: 'male',
    goal: 'balanced',
    activityLevel: 'moderate',
    weeklyGoal: 0,
    allergies: [],
    dislikes: [],
  });

  const [selectedStaples, setSelectedStaples] = useState<string[]>([]);

  // Load initial data
  useEffect(() => {
    if (initialData) {
      setFormData({
          ...initialData,
          // Ensure defaults if missing
          activityLevel: initialData.activityLevel || 'moderate',
          weeklyGoal: initialData.weeklyGoal || 0,
      });
      setStep(1); // Skip welcome if editing
    }
  }, [initialData]);

  const [newAllergy, setNewAllergy] = useState('');
  const [addingAllergy, setAddingAllergy] = useState(false);
  const [newDislike, setNewDislike] = useState('');
  const [addingDislike, setAddingDislike] = useState(false);

  // --- Step Logic ---
  const totalSteps = 8; // Increased to 8 (steps 0-8 is 9 screens actually, but logic uses 1-8 for progress)
  // Wait, logic:
  // 0: Welcome
  // 1: Basics
  // 2: Stats
  // 3: Activity
  // 4: Goal
  // 5: Weekly Pace
  // 6: Preferences
  // 7: Pantry Staples (New)
  // 8: AI Intro (New)

  const nextStep = () => {
    if (step < totalSteps) {
      setDirection(1);
      setStep(s => s + 1);
    } else {
      finish();
    }
  };

  const prevStep = () => {
    if (step > (initialData ? 1 : 0)) {
        setDirection(-1);
        setStep(s => s - 1);
    }
  };

  const finish = () => {
    setIsAnimating(true);
    // Simulate calculation delay for "Premium" feel
    setTimeout(() => {
        if (formData.name) {
            onComplete({
                ...formData,
                allergies: formData.allergies || [],
                dislikes: formData.dislikes || [],
                isOnboarded: true,
            } as UserProfile, selectedStaples);
        }
    }, 1500);
  };

  // --- Validation ---
  const isStepValid = () => {
      switch(step) {
          case 1: return !!formData.name?.trim() && !!formData.gender;
          case 2: return !!formData.age && !!formData.height && !!formData.weight;
          case 3: return !!formData.activityLevel;
          case 4: return !!formData.goal;
          // Step 5 (Weekly Goal) is optional/has default
          // Step 6 (Allergies) is optional
          // Step 7 (Pantry) is optional
          // Step 8 (AI Intro) is informational
          default: return true;
      }
  };

  // --- Animation Variants ---
  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 50 : -50,
      opacity: 0
    }),
    center: {
      x: 0,
      opacity: 1
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 50 : -50,
      opacity: 0
    })
  };

  // --- Helpers ---
  const toggleTag = (field: 'allergies' | 'dislikes', value: string) => {
    setFormData(prev => {
      const current = prev[field] || [];
      if (current.includes(value)) {
        return { ...prev, [field]: current.filter(item => item !== value) };
      } else {
        return { ...prev, [field]: [...current, value] };
      }
    });
  };

  const addCustomTag = (field: 'allergies' | 'dislikes', value: string) => {
      if (!value.trim()) return;
      const formattedValue = value.trim();
      setFormData(prev => {
          const current = prev[field] || [];
          if (current.some(item => item.toLowerCase() === formattedValue.toLowerCase())) return prev;
          return { ...prev, [field]: [...current, formattedValue] };
      });
  };

  const toggleStaple = (item: string) => {
      setSelectedStaples(prev => 
          prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]
      );
  };

  // --- Components ---

  const SelectionCard = ({ selected, onClick, title, description, icon: Icon, colorClass = "bg-primary" }: any) => (
      <div 
        onClick={onClick}
        className={`relative p-4 rounded-2xl border-2 transition-all duration-200 cursor-pointer flex items-center gap-4 group
            ${selected 
                ? `border-primary bg-primary/5 shadow-sm` 
                : 'border-gray-100 bg-white hover:border-primary/30 hover:shadow-md'
            }`}
      >
          <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 transition-colors
              ${selected ? 'bg-primary text-white' : 'bg-gray-100 text-gray-500 group-hover:bg-primary/10 group-hover:text-primary'}`}>
              <Icon size={24} />
          </div>
          <div className="flex-1 text-left">
              <h3 className={`font-bold text-sm ${selected ? 'text-primary' : 'text-gray-800'}`}>{title}</h3>
              {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
          </div>
          {selected && (
              <div className="absolute top-4 right-4 text-primary">
                  <Check size={18} strokeWidth={3} />
              </div>
          )}
      </div>
  );

  return (
    <div className="h-full flex flex-col bg-gray-50 overflow-hidden relative">
      {/* Background Elements */}
      <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-emerald-50/50 to-transparent pointer-events-none" />
      
      {/* Header / Progress */}
      {step > 0 && !isAnimating && (
          <div className="px-6 pt-6 pb-2 z-10">
              <div className="flex justify-between items-center mb-4">
                  <button onClick={prevStep} className="p-2 -ml-2 text-gray-400 hover:text-gray-800 transition-colors">
                      <Icons.ChevronLeft size={24} />
                  </button>
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Step {step} of {totalSteps}</span>
                  <div className="w-8" /> {/* Spacer */}
              </div>
              <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${(step / totalSteps) * 100}%` }}
                    className="h-full bg-primary rounded-full"
                    transition={{ duration: 0.5, ease: "circOut" }}
                  />
              </div>
          </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col relative overflow-hidden">
          <AnimatePresence initial={false} custom={direction} mode='wait'>
            {isAnimating ? (
                 <motion.div 
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white p-8 text-center"
                 >
                     <div className="w-24 h-24 relative mb-6">
                         <div className="absolute inset-0 border-4 border-gray-100 rounded-full"></div>
                         <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                         <Icons.ChefHat className="absolute inset-0 m-auto text-primary animate-pulse" size={32} />
                     </div>
                     <h2 className="text-2xl font-bold text-gray-800 mb-2">Creating your plan...</h2>
                     <p className="text-gray-500">We are tailoring the perfect kitchen experience for you.</p>
                 </motion.div>
            ) : (
            <motion.div
                key={step}
                custom={direction}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="absolute inset-0 w-full h-full p-6 overflow-y-auto pb-32"
            >
                {/* --- Step 0: Welcome --- */}
                {step === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-center">
                        <div className="w-24 h-24 bg-gradient-to-br from-emerald-400 to-primary rounded-[2rem] flex items-center justify-center shadow-2xl shadow-emerald-200 mb-8 rotate-3 transform hover:rotate-6 transition-transform duration-500">
                            <Icons.ChefHat size={48} className="text-white drop-shadow-md" />
                        </div>
                        <h1 className="text-3xl font-extrabold text-gray-900 mb-3 tracking-tight">Savr</h1>
                        <p className="text-lg text-gray-500 max-w-xs mx-auto mb-12">Your personal AI nutritionist and chef. Let's set up your profile.</p>
                        
                        <button onClick={nextStep} className="w-full max-w-xs py-4 bg-gray-900 text-white font-bold rounded-2xl shadow-xl shadow-gray-200 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                            Get Started <Icons.ArrowRight size={20} />
                        </button>
                    </div>
                )}

                {/* --- Step 1: Basics --- */}
                {step === 1 && (
                    <div className="flex flex-col gap-6">
                        <div className="text-center mb-4">
                            <h2 className="text-2xl font-bold text-gray-900">Let's introduce ourselves</h2>
                            <p className="text-gray-500">What should we call you?</p>
                        </div>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2 ml-1">Your Name</label>
                                <input 
                                    autoFocus
                                    type="text"
                                    value={formData.name}
                                    onChange={e => setFormData({...formData, name: e.target.value})}
                                    className="w-full p-4 text-lg bg-white border-2 border-gray-100 rounded-2xl focus:border-primary focus:ring-0 outline-none transition-colors placeholder:text-gray-300 font-semibold text-gray-800"
                                    placeholder="e.g. Alex"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2 ml-1">Gender</label>
                                <div className="grid grid-cols-3 gap-3">
                                    {['male', 'female', 'other'].map((g) => (
                                        <button
                                            key={g}
                                            onClick={() => setFormData({...formData, gender: g as Gender})}
                                            className={`py-3 rounded-xl font-bold text-sm border-2 transition-all capitalize
                                                ${formData.gender === g 
                                                    ? 'border-primary bg-primary text-white shadow-lg shadow-primary/20' 
                                                    : 'border-gray-100 bg-white text-gray-500 hover:border-gray-200'}`}
                                        >
                                            {g}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- Step 2: Stats --- */}
                {step === 2 && (
                    <div className="flex flex-col gap-8">
                         <div className="text-center mb-2">
                            <h2 className="text-2xl font-bold text-gray-900">Your Measurements</h2>
                            <p className="text-gray-500">To calculate your needs accurately.</p>
                        </div>

                        <div className="space-y-6 bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                             {/* Age */}
                             <div className="flex items-center justify-between">
                                 <label className="font-bold text-gray-700 flex items-center gap-2"><Icons.Calendar size={18} className="text-primary"/> Age</label>
                                 <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-3 py-1">
                                     <button onClick={() => setFormData(p => ({...p, age: Math.max(10, (p.age||25)-1)}))} className="w-8 h-8 rounded-lg bg-white shadow-sm text-primary flex items-center justify-center text-xl font-bold hover:bg-gray-100">-</button>
                                     <input
                                         type="number"
                                         value={formData.age === 0 ? '' : formData.age}
                                         onChange={(e) => {
                                             const val = e.target.value;
                                             if (val === '') {
                                                 setFormData(p => ({...p, age: 0}));
                                             } else {
                                                 const num = parseInt(val);
                                                 if (!isNaN(num)) setFormData(p => ({...p, age: Math.min(120, num)}));
                                             }
                                         }}
                                         onBlur={() => {
                                             if (!formData.age || formData.age < 10) setFormData(p => ({...p, age: 25}));
                                         }}
                                         placeholder="25"
                                         className="text-xl font-bold w-12 text-center bg-transparent outline-none appearance-none [&::-webkit-inner-spin-button]:appearance-none placeholder:text-gray-300"
                                     />
                                     <button onClick={() => setFormData(p => ({...p, age: Math.min(100, (p.age||25)+1)}))} className="w-8 h-8 rounded-lg bg-white shadow-sm text-primary flex items-center justify-center text-xl font-bold hover:bg-gray-100">+</button>
                                 </div>
                             </div>

                             <div className="h-px bg-gray-100" />

                             {/* Height */}
                             <div>
                                <div className="flex justify-between mb-3">
                                    <label className="font-bold text-gray-700 flex items-center gap-2"><Icons.Ruler size={18} className="text-primary"/> Height</label>
                                    <span className="text-primary font-bold bg-primary/10 px-2 py-0.5 rounded-md">{formData.height} cm</span>
                                </div>
                                <input 
                                    type="range" 
                                    min="100" max="230" 
                                    value={formData.height}
                                    onChange={e => setFormData({...formData, height: Number(e.target.value)})}
                                    className="w-full accent-primary h-2 bg-gray-100 rounded-full appearance-none cursor-pointer"
                                />
                             </div>

                             <div className="h-px bg-gray-100" />

                             {/* Weight */}
                             <div>
                                <div className="flex justify-between mb-3">
                                    <label className="font-bold text-gray-700 flex items-center gap-2"><Icons.Scale size={18} className="text-primary"/> Weight</label>
                                    <span className="text-primary font-bold bg-primary/10 px-2 py-0.5 rounded-md">{formData.weight} kg</span>
                                </div>
                                <input 
                                    type="range" 
                                    min="30" max="200" 
                                    value={formData.weight}
                                    onChange={e => setFormData({...formData, weight: Number(e.target.value)})}
                                    className="w-full accent-primary h-2 bg-gray-100 rounded-full appearance-none cursor-pointer"
                                />
                             </div>
                        </div>
                    </div>
                )}

                {/* --- Step 3: Activity Level --- */}
                {step === 3 && (
                     <div className="flex flex-col gap-4">
                        <div className="text-center mb-2">
                            <h2 className="text-2xl font-bold text-gray-900">Activity Level</h2>
                            <p className="text-gray-500">How active are you on a daily basis?</p>
                        </div>

                        <div className="flex flex-col gap-3">
                            <SelectionCard 
                                title="Sedentary"
                                description="Office job, little to no exercise."
                                icon={Icons.Armchair}
                                selected={formData.activityLevel === 'sedentary'}
                                onClick={() => setFormData({...formData, activityLevel: 'sedentary'})}
                            />
                            <SelectionCard 
                                title="Lightly Active"
                                description="Light exercise 1-3 days/week."
                                icon={Icons.Footprints}
                                selected={formData.activityLevel === 'light'}
                                onClick={() => setFormData({...formData, activityLevel: 'light'})}
                            />
                            <SelectionCard 
                                title="Moderately Active"
                                description="Moderate exercise 3-5 days/week."
                                icon={Icons.Activity}
                                selected={formData.activityLevel === 'moderate'}
                                onClick={() => setFormData({...formData, activityLevel: 'moderate'})}
                            />
                            <SelectionCard 
                                title="Very Active"
                                description="Hard exercise 6-7 days/week."
                                icon={Icons.Dumbbell}
                                selected={formData.activityLevel === 'active'}
                                onClick={() => setFormData({...formData, activityLevel: 'active'})}
                            />
                        </div>
                    </div>
                )}

                {/* --- Step 4: Goal --- */}
                {step === 4 && (
                     <div className="flex flex-col gap-4">
                        <div className="text-center mb-2">
                            <h2 className="text-2xl font-bold text-gray-900">Your Primary Goal</h2>
                            <p className="text-gray-500">We will adjust your calories accordingly.</p>
                        </div>

                        <div className="grid grid-cols-1 gap-3">
                            <SelectionCard 
                                title="Lose Weight"
                                description="Caloric deficit to burn fat."
                                icon={Icons.TrendingDown}
                                selected={formData.goal === 'weight_loss'}
                                onClick={() => setFormData({...formData, goal: 'weight_loss', weeklyGoal: -0.5})}
                            />
                            <SelectionCard 
                                title="Maintain Weight"
                                description="Stay at your current weight."
                                icon={Icons.Anchor}
                                selected={formData.goal === 'maintain'}
                                onClick={() => setFormData({...formData, goal: 'maintain', weeklyGoal: 0})}
                            />
                            <SelectionCard 
                                title="Build Muscle"
                                description="Caloric surplus to gain mass."
                                icon={Icons.BicepsFlexed}
                                selected={formData.goal === 'muscle_gain'}
                                onClick={() => setFormData({...formData, goal: 'muscle_gain', weeklyGoal: 0.25})}
                            />
                            <SelectionCard 
                                title="Eat Healthy"
                                description="Balanced macros, focus on nutrients."
                                icon={Icons.Heart}
                                selected={formData.goal === 'balanced'}
                                onClick={() => setFormData({...formData, goal: 'balanced', weeklyGoal: 0})}
                            />
                        </div>
                    </div>
                )}

                {/* --- Step 5: Weekly Goal (Conditional) --- */}
                {step === 5 && (
                    <div className="flex flex-col gap-6">
                        <div className="text-center mb-2">
                            <h2 className="text-2xl font-bold text-gray-900">Weekly Pace</h2>
                            <p className="text-gray-500">How fast do you want to progress?</p>
                        </div>

                        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col gap-6 items-center">
                            <div className="text-center">
                                <span className="text-4xl font-extrabold text-primary">
                                    {formData.weeklyGoal && formData.weeklyGoal > 0 ? '+' : ''}
                                    {formData.weeklyGoal} <span className="text-lg text-gray-400 font-medium">kg/week</span>
                                </span>
                            </div>

                            <input 
                                type="range" 
                                min={formData.goal === 'weight_loss' ? -1 : 0}
                                max={formData.goal === 'weight_loss' ? -0.1 : (formData.goal === 'muscle_gain' ? 0.5 : 0)}
                                step={0.05}
                                disabled={formData.goal === 'maintain' || formData.goal === 'balanced'}
                                value={formData.weeklyGoal}
                                onChange={e => setFormData({...formData, weeklyGoal: Number(e.target.value)})}
                                className="w-full accent-primary h-2 bg-gray-100 rounded-full appearance-none cursor-pointer"
                            />

                            <p className="text-sm text-gray-500 text-center px-4">
                                {formData.weeklyGoal === 0 
                                    ? "Maintaining current weight."
                                    : (Math.abs(formData.weeklyGoal || 0) > 0.7 
                                        ? "Aggressive pace. Ensure you consult a professional." 
                                        : "Sustainable and recommended pace.")
                                }
                            </p>
                        </div>

                         <div className="grid grid-cols-3 gap-2 mt-2">
                             {[
                                 { val: -0.25, label: "Slow" }, 
                                 { val: -0.5, label: "Normal" }, 
                                 { val: -0.8, label: "Fast" }
                             ].filter(() => formData.goal === 'weight_loss').map(opt => (
                                 <button 
                                    key={opt.val}
                                    onClick={() => setFormData({...formData, weeklyGoal: opt.val})}
                                    className={`py-2 rounded-xl text-sm font-bold border ${formData.weeklyGoal === opt.val ? 'bg-primary text-white border-primary' : 'bg-white text-gray-500 border-gray-200'}`}
                                 >
                                     {opt.label}
                                 </button>
                             ))}
                             
                             {[
                                 { val: 0.1, label: "Lean" }, 
                                 { val: 0.25, label: "Steady" }, 
                                 { val: 0.4, label: "Fast" }
                             ].filter(() => formData.goal === 'muscle_gain').map(opt => (
                                 <button 
                                    key={opt.val}
                                    onClick={() => setFormData({...formData, weeklyGoal: opt.val})}
                                    className={`py-2 rounded-xl text-sm font-bold border ${formData.weeklyGoal === opt.val ? 'bg-primary text-white border-primary' : 'bg-white text-gray-500 border-gray-200'}`}
                                 >
                                     {opt.label}
                                 </button>
                             ))}
                         </div>
                    </div>
                )}

                {/* --- Step 6: Restrictions --- */}
                {step === 6 && (
                    <div className="flex flex-col gap-6">
                        <div className="text-center mb-2">
                            <h2 className="text-2xl font-bold text-gray-900">Food Preferences</h2>
                            <p className="text-gray-500">Tap to select allergies or dislikes.</p>
                        </div>

                        {/* Allergies */}
                        <div>
                            <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2"><Icons.AlertTriangle size={18} className="text-orange-500"/> Allergies</h3>
                            <div className="flex flex-wrap gap-2">
                                {COMMON_ALLERGIES.map(item => (
                                    <button
                                        key={item}
                                        onClick={() => toggleTag('allergies', item)}
                                        className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${
                                            (formData.allergies || []).includes(item)
                                            ? 'bg-red-50 border-red-200 text-red-600 shadow-sm'
                                            : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                                        }`}
                                    >
                                        {item}
                                    </button>
                                ))}
                                {/* Custom Allergy Input */}
                                <div className="relative">
                                    <input 
                                        type="text" 
                                        placeholder="+ Add Other"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                addCustomTag('allergies', e.currentTarget.value);
                                                e.currentTarget.value = '';
                                            }
                                        }}
                                        className="px-4 py-2 rounded-full text-sm font-medium border border-dashed border-gray-300 bg-transparent outline-none focus:border-red-300 focus:ring-2 focus:ring-red-100 w-32"
                                    />
                                </div>
                            </div>
                        </div>

                         {/* Dislikes */}
                        <div>
                            <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2 mt-4"><Icons.ThumbsDown size={18} className="text-gray-500"/> I don't eat...</h3>
                            <div className="flex flex-wrap gap-2">
                                {COMMON_DISLIKES.map(item => (
                                    <button
                                        key={item}
                                        onClick={() => toggleTag('dislikes', item)}
                                        className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${
                                            (formData.dislikes || []).includes(item)
                                            ? 'bg-gray-800 border-gray-800 text-white shadow-sm'
                                            : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                                        }`}
                                    >
                                        {item}
                                    </button>
                                ))}
                                <div className="relative">
                                    <input 
                                        type="text" 
                                        placeholder="+ Add Other"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                addCustomTag('dislikes', e.currentTarget.value);
                                                e.currentTarget.value = '';
                                            }
                                        }}
                                        className="px-4 py-2 rounded-full text-sm font-medium border border-dashed border-gray-300 bg-transparent outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-200 w-32"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- Step 7: Pantry Staples (NEW) --- */}
                {step === 7 && (
                    <div className="flex flex-col gap-6">
                        <div className="text-center mb-2">
                            <h2 className="text-2xl font-bold text-gray-900">Kitchen Basics</h2>
                            <p className="text-gray-500">What do you already have? We'll create recipes from this.</p>
                        </div>

                        <div className="grid grid-cols-2 gap-3 overflow-y-visible pb-2">
                            {PANTRY_STAPLES.map(item => {
                                const isSelected = selectedStaples.includes(item);
                                return (
                                    <div 
                                        key={item}
                                        onClick={() => toggleStaple(item)}
                                        className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center gap-3 relative overflow-hidden group
                                            ${isSelected 
                                                ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm' 
                                                : 'border-gray-100 bg-white text-gray-600 hover:border-emerald-200'}`}
                                    >
                                        <div className={`w-3 h-3 rounded-full border-2 ${isSelected ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300'} flex items-center justify-center shrink-0`}></div>
                                        <span className="font-bold text-sm">{item}</span>
                                        {isSelected && <Icons.Check size={16} className="absolute top-2 right-2 text-emerald-500" />}
                                    </div>
                                );
                            })}
                        </div>
                         <div className="text-center text-xs text-gray-400 mt-2">
                            You can add more specific items later in your Pantry.
                        </div>
                    </div>
                )}

                {/* --- Step 8: AI Intro (NEW) --- */}
                {step === 8 && (
                    <div className="flex flex-col gap-8 h-full justify-center text-center px-4">
                        <div className="relative w-32 h-32 mx-auto mb-4">
                            <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping opacity-20"></div>
                            <div className="absolute inset-0 bg-gradient-to-tr from-primary to-emerald-400 rounded-full shadow-2xl flex items-center justify-center">
                                <Icons.Sparkles size={48} className="text-white" />
                            </div>
                            <div className="absolute -bottom-2 -right-2 bg-white p-2 rounded-full shadow-lg">
                                <Icons.MessageCircle size={24} className="text-primary" />
                            </div>
                        </div>

                        <div>
                            <h2 className="text-3xl font-extrabold text-gray-900 mb-4">Meet Your AI Chef</h2>
                            <p className="text-gray-500 text-lg leading-relaxed mb-8">
                                I'm always here (bottom right) to help you. Ask me to:
                            </p>
                            
                            <div className="space-y-4 text-left max-w-xs mx-auto">
                                <div className="flex items-center gap-4 p-4 bg-white rounded-2xl shadow-sm border border-gray-100">
                                    <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center shrink-0"><Icons.ChefHat size={20} /></div>
                                    <span className="font-semibold text-gray-700">"Suggest a dinner with chicken"</span>
                                </div>
                                <div className="flex items-center gap-4 p-4 bg-white rounded-2xl shadow-sm border border-gray-100">
                                    <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0"><Icons.Activity size={20} /></div>
                                    <span className="font-semibold text-gray-700">"Is this healthy?"</span>
                                </div>
                                <div className="flex items-center gap-4 p-4 bg-white rounded-2xl shadow-sm border border-gray-100">
                                    <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center shrink-0"><Icons.Edit size={20} /></div>
                                    <span className="font-semibold text-gray-700">"Make this recipe vegan"</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

            </motion.div>
            )}
          </AnimatePresence>
      </div>

      {/* Footer Buttons */}
      {step > 0 && !isAnimating && (
          <div className="p-6 pt-2 bg-white/80 backdrop-blur-md border-t border-gray-100 z-20">
              <button 
                  onClick={nextStep}
                  disabled={!isStepValid()}
                  className={`w-full py-4 text-white font-bold text-lg rounded-2xl shadow-xl transition-all transform active:scale-[0.98]
                      ${!isStepValid() 
                          ? 'bg-gray-200 text-gray-400 shadow-none cursor-not-allowed' 
                          : 'bg-primary shadow-primary/30 hover:shadow-primary/40'
                      }`}
              >
                  {step === totalSteps ? 'Start Cooking' : (step === totalSteps - 1 ? 'Next' : 'Continue')}
              </button>
          </div>
      )}
    </div>
  );
};
