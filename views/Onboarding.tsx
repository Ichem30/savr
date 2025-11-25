import React, { useState, useEffect } from 'react';
import { UserProfile, Gender, FitnessGoal } from '../types';
import { Icons } from '../components/Icons';
import { ModernSelect } from '../components/ModernSelect';

interface OnboardingProps {
  onComplete: (profile: UserProfile) => void;
  initialData?: UserProfile | null;
}

const COMMON_ALLERGIES = ['Peanuts', 'Dairy', 'Gluten', 'Shellfish', 'Eggs', 'Soy'];
const COMMON_DISLIKES = ['Mushrooms', 'Onions', 'Pork', 'Beef', 'Fish', 'Cilantro'];

export const Onboarding: React.FC<OnboardingProps> = ({ onComplete, initialData }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<Partial<UserProfile>>({
    name: '',
    height: 170,
    weight: 70,
    age: 25,
    gender: 'male',
    goal: 'maintain',
    allergies: [],
    dislikes: [],
  });

  // Initialize form with existing data if editing
  useEffect(() => {
    if (initialData) {
        setFormData(initialData);
    }
  }, [initialData]);

  // State for custom inputs
  const [newAllergy, setNewAllergy] = useState('');
  const [addingAllergy, setAddingAllergy] = useState(false);
  const [newDislike, setNewDislike] = useState('');
  const [addingDislike, setAddingDislike] = useState(false);

  const isStepValid = () => {
    if (step === 1) {
        return formData.name?.trim() !== '' && (formData.age || 0) > 0;
    }
    return true;
  };

  const handleNext = () => {
    if (!isStepValid()) return;
    setStep(prev => prev + 1);
  };

  const handleBack = () => {
    setStep(prev => prev - 1);
  };

  const finish = () => {
    if (formData.name && formData.height && formData.weight) {
      onComplete({
        ...formData,
        allergies: formData.allergies || [],
        dislikes: formData.dislikes || [],
        isOnboarded: true,
      } as UserProfile);
    }
  };

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
          // Prevent duplicates (case-insensitive check)
          if (current.some(item => item.toLowerCase() === formattedValue.toLowerCase())) {
              return prev;
          }
          return { ...prev, [field]: [...current, formattedValue] };
      });
  };

  const GoalCard = ({ goal, title, icon }: { goal: FitnessGoal, title: string, icon: React.ReactNode }) => (
    <div 
        onClick={() => setFormData({...formData, goal})}
        className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex flex-col items-center justify-center text-center gap-2 h-32
            ${formData.goal === goal 
                ? 'border-primary bg-emerald-50 text-primary' 
                : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
            }`}
    >
        {icon}
        <span className="font-semibold text-sm">{title}</span>
    </div>
  );

  const renderTagSection = (
    title: string,
    field: 'allergies' | 'dislikes',
    commonList: string[],
    newItemValue: string,
    setNewItemValue: (s: string) => void,
    isAdding: boolean,
    setIsAdding: (b: boolean) => void
  ) => {
    const currentSelected = formData[field] || [];
    // Custom items are those selected but not in the common list
    const customItems = currentSelected.filter(item => 
        !commonList.some(common => common.toLowerCase() === item.toLowerCase())
    );

    const activeClass = field === 'allergies' 
        ? 'bg-red-50 border-red-200 text-red-600' 
        : 'bg-gray-800 border-gray-800 text-white';

    const handleAdd = () => {
        if (newItemValue.trim()) {
            addCustomTag(field, newItemValue);
        }
        setNewItemValue('');
        setIsAdding(false);
    };

    return (
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">{title}</label>
            <div className="flex flex-wrap gap-2">
                {/* Common Items */}
                {commonList.map(item => (
                    <button
                        key={item}
                        onClick={() => toggleTag(field, item)}
                        className={`px-4 py-2 rounded-full text-sm border transition-colors ${
                            currentSelected.includes(item)
                            ? activeClass
                            : 'border-gray-200 text-gray-600 hover:border-gray-300'
                        }`}
                    >
                        {item}
                    </button>
                ))}

                {/* Custom Items (Always Active) */}
                {customItems.map(item => (
                     <button
                        key={item}
                        onClick={() => toggleTag(field, item)}
                        className={`px-4 py-2 rounded-full text-sm border transition-colors flex items-center gap-1 ${activeClass}`}
                    >
                        {item}
                        <Icons.X size={14} />
                    </button>
                ))}

                {/* Add Button / Input */}
                {isAdding ? (
                    <div className="flex items-center rounded-full border border-primary px-3 py-2 bg-white w-32 shadow-sm">
                        <input
                            autoFocus
                            type="text"
                            value={newItemValue}
                            onChange={(e) => setNewItemValue(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleAdd();
                            }}
                            onBlur={handleAdd}
                            className="w-full text-sm outline-none bg-transparent text-gray-800"
                            placeholder="Type..."
                        />
                    </div>
                ) : (
                    <button
                        onClick={() => setIsAdding(true)}
                        className="px-4 py-2 rounded-full text-sm border border-dashed border-gray-300 text-gray-400 hover:border-primary hover:text-primary transition-colors flex items-center gap-1"
                    >
                        <Icons.Plus size={16} />
                    </button>
                )}
            </div>
        </div>
    );
  };

  const isEditing = !!initialData;

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Progress Bar */}
      <div className="w-full bg-gray-100 h-1.5">
        <div 
          className="bg-primary h-1.5 transition-all duration-300" 
          style={{ width: `${(step / 4) * 100}%` }}
        ></div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 flex flex-col">
        {step === 1 && (
          <div className="animate-fade-in flex flex-col items-center my-auto">
             <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-6">
                <Icons.ChefHat size={32} />
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">{isEditing ? 'Edit Profile' : "Let's get to know you"}</h1>
            <p className="text-gray-500 text-center mb-8">Tailor recipes to your body and taste.</p>
            
            <div className="w-full space-y-4">
                <input 
                  type="text" 
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full p-4 bg-gray-50 border-0 rounded-xl focus:ring-2 focus:ring-primary outline-none text-center text-lg placeholder-gray-400 text-primary font-semibold"
                  placeholder="Your Name"
                />
                
                <div className="grid grid-cols-2 gap-4">
                    <input 
                        type="number" 
                        value={formData.age}
                        onChange={e => setFormData({...formData, age: Number(e.target.value)})}
                        className="w-full p-4 bg-gray-50 border-0 rounded-xl focus:ring-2 focus:ring-primary outline-none text-center text-primary font-semibold"
                        placeholder="Age"
                    />
                    <ModernSelect
                        value={formData.gender}
                        onChange={(val) => setFormData({...formData, gender: val as Gender})}
                        placeholder="Gender"
                        options={[
                            { value: 'male', label: 'Male' },
                            { value: 'female', label: 'Female' },
                            { value: 'other', label: 'Other' }
                        ]}
                        className="w-full"
                    />
                </div>
                {!isStepValid() && (formData.name || formData.age) ? (
                   <p className="text-red-400 text-xs text-center mt-2 animate-pulse">Please enter your name and age.</p>
                ) : null}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="animate-fade-in flex flex-col h-full">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Measurements</h2>
            <p className="text-gray-500 mb-8">For accurate macro calculations.</p>
            
            <div className="space-y-8 my-auto">
              <div>
                <div className="flex justify-between mb-2">
                    <label className="font-medium text-gray-700">Height</label>
                    <span className="text-primary font-bold">{formData.height} cm</span>
                </div>
                <input 
                  type="range" 
                  min="100" 
                  max="250" 
                  value={formData.height}
                  onChange={e => setFormData({...formData, height: Number(e.target.value)})}
                  className="w-full accent-primary h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
              </div>
              
              <div>
                <div className="flex justify-between mb-2">
                    <label className="font-medium text-gray-700">Weight</label>
                    <span className="text-primary font-bold">{formData.weight} kg</span>
                </div>
                <input 
                  type="range" 
                  min="30" 
                  max="200" 
                  value={formData.weight}
                  onChange={e => setFormData({...formData, weight: Number(e.target.value)})}
                  className="w-full accent-primary h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="animate-fade-in flex flex-col">
             <h2 className="text-2xl font-bold text-gray-800 mb-2">Your Goal</h2>
             <p className="text-gray-500 mb-6">What's your main focus?</p>

            <div className="grid grid-cols-2 gap-3">
                <GoalCard 
                    goal="weight_loss" 
                    title="Lose Weight" 
                    icon={<Icons.Scale size={24} />} 
                />
                <GoalCard 
                    goal="muscle_gain" 
                    title="Build Muscle" 
                    icon={<Icons.Dumbbell size={24} />} 
                />
                <GoalCard 
                    goal="maintain" 
                    title="Maintain" 
                    icon={<Icons.Leaf size={24} />} 
                />
                <GoalCard 
                    goal="balanced" 
                    title="Eat Healthy" 
                    icon={<Icons.Heart size={24} />} 
                />
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="animate-fade-in flex flex-col">
             <h2 className="text-2xl font-bold text-gray-800 mb-2">Any Restrictions?</h2>
             <p className="text-gray-500 mb-6">Select common items or add your own.</p>

            <div className="space-y-8">
              {renderTagSection(
                  'Allergies',
                  'allergies',
                  COMMON_ALLERGIES,
                  newAllergy,
                  setNewAllergy,
                  addingAllergy,
                  setAddingAllergy
              )}

              {renderTagSection(
                  "I don't eat...",
                  'dislikes',
                  COMMON_DISLIKES,
                  newDislike,
                  setNewDislike,
                  addingDislike,
                  setAddingDislike
              )}
            </div>
          </div>
        )}
      </div>

      <div className={`p-6 mt-auto ${step === 4 ? 'pb-28' : ''}`}>
        {step === 4 ? (
            <button 
                onClick={finish}
                className="w-full py-4 bg-primary text-white font-bold rounded-2xl shadow-xl shadow-primary/20 hover:scale-[1.02] transition-transform"
            >
                {isEditing ? "Save Changes" : "Start Cooking"}
            </button>
        ) : (
            <div className="flex gap-4">
                {step > 1 && (
                    <button 
                        onClick={handleBack}
                        className="flex-1 py-4 text-gray-500 font-semibold rounded-2xl hover:bg-gray-50 transition"
                    >
                        Back
                    </button>
                )}
                <button 
                    onClick={handleNext}
                    disabled={!isStepValid()}
                    className={`flex-1 py-4 text-white font-semibold rounded-2xl shadow-lg transition ${!isStepValid() ? 'bg-gray-300 cursor-not-allowed' : 'bg-gray-900 hover:bg-gray-800'}`}
                >
                    Next
                </button>
            </div>
        )}
      </div>
    </div>
  );
};