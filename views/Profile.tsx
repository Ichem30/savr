
import React, { useState, useEffect } from 'react';
import { UserProfile, FitnessGoal, Gender } from '../types';
import { Icons } from '../components/Icons';
import { auth, signInGoogle, logOut } from '../services/firebase';

interface ProfileProps {
  user: UserProfile;
  onSave: (updatedProfile: UserProfile) => Promise<void>;
}

const GOAL_OPTIONS: { value: FitnessGoal; label: string; icon: any }[] = [
  { value: 'weight_loss', label: 'Lose Weight', icon: Icons.Scale },
  { value: 'muscle_gain', label: 'Build Muscle', icon: Icons.Dumbbell },
  { value: 'maintain', label: 'Maintain', icon: Icons.Leaf },
  { value: 'balanced', label: 'Eat Healthy', icon: Icons.Heart },
];

export const Profile: React.FC<ProfileProps> = ({ user, onSave }) => {
  const [formData, setFormData] = useState<UserProfile>(user);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Local inputs for tags
  const [newAllergy, setNewAllergy] = useState('');
  const [newDislike, setNewDislike] = useState('');

  // Sync state if user prop updates (e.g. remote change)
  useEffect(() => {
    setFormData(user);
    setHasChanges(false);
  }, [user]);

  const isAnonymous = auth.currentUser?.isAnonymous;

  const handleGoogleLogin = async () => {
    try {
        await signInGoogle();
    } catch (e) {
        alert("Could not sign in with Google. Please try again.");
    }
  };

  const handleChange = (field: keyof UserProfile, value: any) => {
      setFormData(prev => {
          const updated = { ...prev, [field]: value };
          return updated;
      });
      setHasChanges(true);
  };

  const handleSave = async () => {
      setIsSaving(true);
      try {
          await onSave(formData);
          setHasChanges(false);
      } catch (e) {
          console.error(e);
          alert("Failed to save profile.");
      } finally {
          setIsSaving(false);
      }
  };

  const toggleTag = (field: 'allergies' | 'dislikes', value: string) => {
      setFormData(prev => {
          const list = prev[field];
          const updatedList = list.includes(value) 
            ? list.filter(item => item !== value)
            : [...list, value];
          return { ...prev, [field]: updatedList };
      });
      setHasChanges(true);
  };

  const addTag = (field: 'allergies' | 'dislikes', value: string) => {
      if (!value.trim()) return;
      const cleanValue = value.trim();
      setFormData(prev => {
          const list = prev[field];
          if (list.some(i => i.toLowerCase() === cleanValue.toLowerCase())) return prev;
          return { ...prev, [field]: [...list, cleanValue] };
      });
      setHasChanges(true);
  };

  // Determine current goal icon
  const CurrentGoalIcon = GOAL_OPTIONS.find(g => g.value === formData.goal)?.icon || Icons.Leaf;

  return (
    <div className="flex flex-col h-full bg-gray-50 relative overflow-hidden">
      <div className="flex-1 overflow-y-auto p-6 pb-32">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Your Profile</h2>
        </div>
        
        <div className="flex justify-start mb-4">
            <button 
                onClick={() => logOut()} 
                className="text-xs text-red-400 hover:text-red-600 flex items-center gap-1 px-3 py-1 rounded-full border border-red-100 hover:bg-red-50 transition-colors"
            >
                <Icons.LogOut size={12} /> Log Out
            </button>
        </div>

        {/* Guest Warning */}
        {isAnonymous && (
            <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 mb-6 flex items-center justify-between shadow-sm">
                <div>
                    <p className="font-bold text-indigo-900 text-sm">Guest Account</p>
                    <p className="text-xs text-indigo-700">Link Google to save data permanently.</p>
                </div>
                <button onClick={handleGoogleLogin} className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg shadow-indigo-200">
                    Link Google
                </button>
            </div>
        )}

        {/* Main Profile Card */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 mb-4">
            {/* Top Row: Avatar & Name */}
            <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary shrink-0">
                    <Icons.User size={32} />
                </div>
                <div className="flex-1 min-w-0">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Name</label>
                    <input 
                        type="text" 
                        value={formData.name} 
                        onChange={e => handleChange('name', e.target.value)}
                        className="w-full bg-transparent border-b border-transparent hover:border-gray-200 focus:border-primary focus:bg-gray-50 rounded-none outline-none text-xl font-bold text-gray-800 transition-all p-0 pb-1 placeholder-gray-300"
                        placeholder="Your Name"
                    />
                </div>
            </div>

            {/* Goal Selector */}
            <div className="bg-gray-50 rounded-2xl p-4 mb-6 relative border border-gray-100">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-white rounded-full shadow-sm text-primary">
                        <CurrentGoalIcon size={20} />
                    </div>
                    <div className="flex-1">
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Current Goal</label>
                        <div className="font-bold text-gray-800 capitalize flex items-center gap-2">
                            {GOAL_OPTIONS.find(g => g.value === formData.goal)?.label}
                            <Icons.ChevronRight size={14} className="text-gray-400" />
                        </div>
                    </div>
                </div>
                <select 
                    value={formData.goal}
                    onChange={e => handleChange('goal', e.target.value)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                >
                    {GOAL_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                </select>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
                {/* Weight */}
                <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100 text-center group hover:border-primary/30 transition-colors">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Weight</label>
                    <div className="flex items-baseline justify-center gap-0.5">
                        <input 
                            type="number" 
                            value={formData.weight} 
                            onChange={e => handleChange('weight', Number(e.target.value))}
                            className="w-12 bg-transparent text-center font-bold text-gray-800 outline-none focus:text-primary p-0"
                        />
                        <span className="text-xs text-gray-500">kg</span>
                    </div>
                </div>
                
                {/* Height */}
                <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100 text-center group hover:border-primary/30 transition-colors">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Height</label>
                    <div className="flex items-baseline justify-center gap-0.5">
                        <input 
                            type="number" 
                            value={formData.height} 
                            onChange={e => handleChange('height', Number(e.target.value))}
                            className="w-12 bg-transparent text-center font-bold text-gray-800 outline-none focus:text-primary p-0"
                        />
                        <span className="text-xs text-gray-500">cm</span>
                    </div>
                </div>
                
                {/* Age */}
                <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100 text-center group hover:border-primary/30 transition-colors">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Age</label>
                    <div className="flex items-baseline justify-center gap-0.5">
                        <input 
                            type="number" 
                            value={formData.age} 
                            onChange={e => handleChange('age', Number(e.target.value))}
                            className="w-12 bg-transparent text-center font-bold text-gray-800 outline-none focus:text-primary p-0"
                        />
                        <span className="text-xs text-gray-500">yrs</span>
                    </div>
                </div>
                
                {/* Sex */}
                <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100 text-center group hover:border-primary/30 transition-colors relative">
                     <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Sex</label>
                     <div className="flex items-center justify-center gap-1">
                        <span className="font-bold text-gray-800 capitalize">{formData.gender}</span>
                        <Icons.ChevronRight size={12} className="text-gray-400" />
                    </div>
                    <select 
                        value={formData.gender}
                        onChange={e => handleChange('gender', e.target.value)}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    >
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                    </select>
                </div>
            </div>
        </div>

        {/* Allergies Card */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-4">
            <h3 className="font-bold text-gray-700 text-sm uppercase tracking-wide mb-4 flex items-center gap-2">
                <Icons.AlertCircle size={16} className="text-primary" /> Allergies
            </h3>
            <div className="flex flex-wrap gap-2">
                {formData.allergies.map(a => (
                    <button 
                        key={a} 
                        onClick={() => toggleTag('allergies', a)}
                        className="px-3 py-1.5 bg-red-50 text-red-500 border border-red-100 rounded-full text-xs font-bold flex items-center gap-1 hover:bg-red-100 transition-colors group"
                    >
                        {a}
                        <Icons.X size={12} className="opacity-50 group-hover:opacity-100" />
                    </button>
                ))}
                <div className="flex items-center bg-gray-100 rounded-full px-3 py-1.5 focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                    <input 
                        type="text" 
                        value={newAllergy}
                        onChange={e => setNewAllergy(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && (addTag('allergies', newAllergy), setNewAllergy(''))}
                        placeholder="Add allergy..."
                        className="bg-transparent outline-none text-xs w-20 text-gray-700 placeholder-gray-400"
                    />
                    <button 
                        onClick={() => { addTag('allergies', newAllergy); setNewAllergy(''); }}
                        className="text-primary hover:text-emerald-600"
                    >
                        <Icons.Plus size={14} />
                    </button>
                </div>
            </div>
        </div>

        {/* Dislikes Card */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
             <h3 className="font-bold text-gray-700 text-sm uppercase tracking-wide mb-4 flex items-center gap-2">
                <Icons.X size={16} className="text-gray-400" /> Dislikes
            </h3>
            <div className="flex flex-wrap gap-2">
                {formData.dislikes.map(a => (
                    <button 
                        key={a} 
                        onClick={() => toggleTag('dislikes', a)}
                        className="px-3 py-1.5 bg-gray-100 text-gray-600 border border-gray-200 rounded-full text-xs font-bold flex items-center gap-1 hover:bg-gray-200 transition-colors group"
                    >
                        {a}
                        <Icons.X size={12} className="opacity-50 group-hover:opacity-100" />
                    </button>
                ))}
                <div className="flex items-center bg-gray-100 rounded-full px-3 py-1.5 focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                    <input 
                        type="text" 
                        value={newDislike}
                        onChange={e => setNewDislike(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && (addTag('dislikes', newDislike), setNewDislike(''))}
                        placeholder="Add dislike..."
                        className="bg-transparent outline-none text-xs w-20 text-gray-700 placeholder-gray-400"
                    />
                    <button 
                        onClick={() => { addTag('dislikes', newDislike); setNewDislike(''); }}
                        className="text-primary hover:text-emerald-600"
                    >
                        <Icons.Plus size={14} />
                    </button>
                </div>
            </div>
        </div>

      </div>

      {/* Floating Save Button */}
      {hasChanges && (
          <div className="absolute bottom-0 left-0 w-full px-6 pb-6 pt-6 bg-gradient-to-t from-gray-50 via-gray-50 to-transparent z-20 animate-fade-in-up">
              <button 
                onClick={handleSave}
                disabled={isSaving}
                className="w-full py-4 bg-primary text-white rounded-2xl font-bold shadow-xl shadow-primary/20 hover:bg-emerald-600 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                  {isSaving ? <Icons.ChefHat className="animate-bounce w-5 h-5" /> : <Icons.Check size={20} />}
                  {isSaving ? 'Saving Changes...' : 'Save Changes'}
              </button>
          </div>
      )}
    </div>
  );
};
