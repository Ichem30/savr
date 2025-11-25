import React, { useState, useEffect, useRef } from 'react';
import { UserProfile, FitnessGoal, DailyLog } from '../types';
import { Icons } from '../components/Icons';
import { auth, signInGoogle, logOut, subscribeToDailyLog, uploadProfileImage } from '../services/firebase';
import { calculateDailyTargets } from '../utils/nutrition';
import { motion, AnimatePresence } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

interface ProfileProps {
  user: UserProfile;
  onSave: (updatedProfile: UserProfile) => Promise<void>;
}

// ... (Existing constants: GOAL_OPTIONS, DIET_PRESETS, ACTIVITY_LEVELS, WEEKLY_GOAL_OPTIONS, SafeIcon)
const GOAL_OPTIONS: { value: FitnessGoal; label: string; icon: any }[] = [
  { value: 'weight_loss', label: 'Perdre du poids', icon: Icons.Scale },
  { value: 'muscle_gain', label: 'Prendre du muscle', icon: Icons.Dumbbell },
  { value: 'maintain', label: 'Maintenir', icon: Icons.Leaf },
  { value: 'balanced', label: 'Manger sainement', icon: Icons.Heart },
];

const DIET_PRESETS: Record<string, { label: string; ratios: { carbs: number; protein: number; fats: number } }> = {
    'default': { label: 'Par défaut', ratios: { carbs: 0.40, protein: 0.30, fats: 0.30 } },
    'low_carb': { label: 'Low-carb', ratios: { carbs: 0.20, protein: 0.40, fats: 0.40 } },
    'high_protein': { label: 'Hyper protéiné', ratios: { carbs: 0.35, protein: 0.45, fats: 0.20 } },
    'low_fat': { label: 'Sans graisse', ratios: { carbs: 0.60, protein: 0.25, fats: 0.15 } },
};

const ACTIVITY_LEVELS = {
    'sedentary': 'Sédentaire',
    'light': 'Légèrement actif',
    'moderate': 'Modéré',
    'active': 'Actif',
    'very_active': 'Très actif'
};

const WEEKLY_GOAL_OPTIONS = [
    { value: -1, label: '-1 kg' },
    { value: -0.75, label: '-0.75 kg' },
    { value: -0.5, label: '-0.50 kg' },
    { value: -0.25, label: '-0.25 kg' },
    { value: 0, label: 'Maintenir' },
    { value: 0.25, label: '+0.25 kg' },
    { value: 0.5, label: '+0.50 kg' },
];

const SafeIcon = ({ icon: Icon, ...props }: any) => {
    if (!Icon) return null;
    return <Icon {...props} />;
};

// ... (Existing components: EditValueModal, MyGoalsPage, GoalRow, GoalItem, CalorieDistributionPage, CalorieGoalPage, DietSelectionPage, NutritionalGoalsPage)
const EditValueModal: React.FC<{ 
    title: string; 
    type: 'number' | 'select' | 'text'; 
    initialValue: string | number; 
    options?: { label: string, value: string | number }[];
    onSave: (value: any) => void; 
    onClose: () => void;
    suffix?: string;
}> = ({ title, type, initialValue, options, onSave, onClose, suffix }) => {
    const [value, setValue] = useState(initialValue);

    const handleSave = () => {
        onSave(value);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
            <motion.div 
                initial={{ scale: 0.9, opacity: 0 }} 
                animate={{ scale: 1, opacity: 1 }} 
                className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl"
            >
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-gray-800">{title}</h3>
                    <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full">
                        <SafeIcon icon={Icons.X} size={20} className="text-gray-500" />
                    </button>
                </div>

                {type === 'select' && options ? (
                    <div className="space-y-2">
                        {options.map(opt => (
                            <button
                                key={opt.value}
                                onClick={() => { setValue(opt.value); }}
                                className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all font-medium flex justify-between items-center ${
                                    value === opt.value 
                                        ? 'border-primary bg-primary/5 text-primary' 
                                        : 'border-transparent bg-gray-50 text-gray-700 hover:bg-gray-100'
                                }`}
                            >
                                {opt.label}
                                {value === opt.value && <SafeIcon icon={Icons.Check} size={20} />}
                            </button>
                        ))}
                    </div>
                ) : (
                    <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-4 py-3 border-2 border-transparent focus-within:border-primary transition-all">
                        <input
                            type={type === 'number' ? 'number' : 'text'}
                            value={value}
                            onChange={(e) => setValue(e.target.value)}
                            className="flex-1 bg-transparent outline-none font-bold text-lg text-gray-800"
                            autoFocus
                        />
                        {suffix && <span className="text-gray-500 font-medium">{suffix}</span>}
                    </div>
                )}

                <div className="mt-6">
                    <button 
                        onClick={handleSave}
                        className="w-full py-3 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all"
                    >
                        Enregistrer
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

const MyGoalsPage: React.FC<{ user: UserProfile; targets: any; onClose: () => void; onOpenCalories: () => void; onOpenNutrition: () => void; onUpdateUser: (updates: Partial<UserProfile>) => void }> = ({ user, targets, onClose, onOpenCalories, onOpenNutrition, onUpdateUser }) => {
    const [editingField, setEditingField] = useState<{
        field: string;
        title: string;
        type: 'number' | 'select' | 'text';
        initialValue: any;
        options?: { label: string, value: string | number }[];
        suffix?: string;
    } | null>(null);

    const goalLabel = GOAL_OPTIONS.find(g => g.value === user.goal)?.label || user.goal;
    const activityLabel = ACTIVITY_LEVELS[user.activityLevel || 'moderate'];
    
    // Determine weekly goal label
    let weeklyGoalLabel = "0 kg";
    if (user.weeklyGoal !== undefined) {
        if (user.weeklyGoal > 0) weeklyGoalLabel = `+${user.weeklyGoal} kg`;
        else if (user.weeklyGoal < 0) weeklyGoalLabel = `${user.weeklyGoal} kg`;
        else weeklyGoalLabel = "Maintenir";
    } else {
        // Fallback default
        if (user.goal === 'weight_loss') weeklyGoalLabel = "-0.50 kg";
        else if (user.goal === 'muscle_gain') weeklyGoalLabel = "+0.25 kg";
        else weeklyGoalLabel = "Maintenir";
    }

    const handleEdit = (field: string) => {
        switch (field) {
            case 'goal':
                setEditingField({
                    field: 'goal',
                    title: 'Modifier l\'objectif',
                    type: 'select',
                    initialValue: user.goal,
                    options: GOAL_OPTIONS.map(g => ({ label: g.label, value: g.value }))
                });
                break;
            case 'weight':
                setEditingField({
                    field: 'weight',
                    title: 'Poids de départ',
                    type: 'number',
                    initialValue: user.weight,
                    suffix: 'kg'
                });
                break;
            case 'targetWeight':
                setEditingField({
                    field: 'targetWeight',
                    title: 'Poids cible',
                    type: 'number',
                    initialValue: user.targetWeight || 72.0,
                    suffix: 'kg'
                });
                break;
            case 'activityLevel':
                setEditingField({
                    field: 'activityLevel',
                    title: 'Niveau d\'activité',
                    type: 'select',
                    initialValue: user.activityLevel || 'moderate',
                    options: Object.entries(ACTIVITY_LEVELS).map(([val, label]) => ({ label, value: val }))
                });
                break;
            case 'weeklyGoal':
                setEditingField({
                    field: 'weeklyGoal',
                    title: 'Objectif hebdomadaire',
                    type: 'select',
                    initialValue: user.weeklyGoal !== undefined ? user.weeklyGoal : (user.goal === 'weight_loss' ? -0.5 : (user.goal === 'muscle_gain' ? 0.25 : 0)),
                    options: WEEKLY_GOAL_OPTIONS
                });
                break;
        }
    };

    const handleSaveField = (value: any) => {
        if (!editingField) return;
        
        let updates: Partial<UserProfile> = {};
        if (editingField.type === 'number') {
            updates[editingField.field as keyof UserProfile] = parseFloat(value);
        } else {
            updates[editingField.field as keyof UserProfile] = value;
        }

        onUpdateUser(updates);
    };

    return (
        <div className="flex flex-col h-full bg-white relative">
            <div className="px-6 py-4 flex items-center gap-4 border-b border-gray-100">
                <button onClick={onClose} className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors">
                    <SafeIcon icon={Icons.ArrowLeft} size={24} className="text-gray-700" />
                </button>
                <h2 className="text-lg font-bold text-gray-800">Mes objectifs</h2>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="space-y-2">
                    <GoalRow icon={Icons.Target} label="Objectif" value={goalLabel} onClick={() => handleEdit('goal')} isClickable />
                    <GoalRow icon={Icons.Scale} label="Poids de départ" value={`${user.weight} kg`} onClick={() => handleEdit('weight')} isClickable />
                    <GoalRow icon={Icons.Target} label="Poids cible" value={`${user.targetWeight || 72.0} kg`} onClick={() => handleEdit('targetWeight')} isClickable />
                    <GoalRow icon={Icons.Activity} label="Niveau d'activité" value={activityLabel} onClick={() => handleEdit('activityLevel')} isClickable />
                    <GoalRow icon={Icons.Calendar} label="Objectif hebdomadaire" value={weeklyGoalLabel} onClick={() => handleEdit('weeklyGoal')} isClickable />
                    <GoalRow icon={Icons.Flame} label="Objectif calorique" value={`${targets.calories} kcal`} onClick={onOpenCalories} isClickable />
                    <GoalRow icon={Icons.Utensils} label="Objectifs nutritionnels" value={user.customMacros ? "Personnalisé" : "Par défaut"} onClick={onOpenNutrition} isClickable />
                </div>
            </div>

            {editingField && (
                <EditValueModal 
                    title={editingField.title}
                    type={editingField.type}
                    initialValue={editingField.initialValue}
                    options={editingField.options}
                    suffix={editingField.suffix}
                    onClose={() => setEditingField(null)}
                    onSave={handleSaveField}
                />
            )}
        </div>
    );
};

const GoalRow = ({ icon: Icon, label, value, onClick, isClickable }: { icon?: any, label: string, value: string, onClick?: () => void, isClickable?: boolean }) => (
    <div 
        onClick={isClickable ? onClick : undefined}
        className={`flex justify-between items-center py-3 border-b border-gray-50 last:border-0 ${isClickable ? 'cursor-pointer hover:bg-gray-50 -mx-2 px-2 rounded-lg transition-colors' : ''}`}
    >
        <div className="flex items-center gap-3">
            {Icon && (
                <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-500">
                    <SafeIcon icon={Icon} size={16} />
                </div>
            )}
            <span className="text-base font-medium text-gray-800">{label}</span>
        </div>
        <div className="flex items-center gap-2 text-gray-500">
            <span className="text-base font-medium text-primary">{value}</span>
            <SafeIcon icon={Icons.ChevronRight} size={16} className="text-gray-300" />
        </div>
    </div>
);

const GoalItem = ({ icon: Icon, label, value }: { icon: any, label: string, value: string }) => (
    <div className="flex items-center justify-between py-1">
        <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-500">
                <SafeIcon icon={Icon} size={14} />
            </div>
            <span className="text-sm font-bold text-gray-700">{label}</span>
        </div>
        <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-500">{value}</span>
            <SafeIcon icon={Icons.ChevronRight} size={16} className="text-gray-300" />
        </div>
    </div>
);

const CalorieDistributionPage: React.FC<{ targets: any; user: UserProfile; onSave: (dist: { breakfast: number, lunch: number, dinner: number, snack: number }) => void; onClose: () => void }> = ({ targets, user, onSave, onClose }) => {
    const [dist, setDist] = useState(user.mealDistribution || {
        breakfast: 30,
        lunch: 40,
        dinner: 25,
        snack: 5
    });

    const total = dist.breakfast + dist.lunch + dist.dinner + dist.snack;

    const handleChange = (meal: 'breakfast' | 'lunch' | 'dinner' | 'snack', value: string) => {
        const num = parseInt(value) || 0;
        setDist(prev => ({ ...prev, [meal]: num }));
    };

    const handleSave = () => {
        onSave(dist);
        onClose();
    };

    return (
        <div className="flex flex-col h-full bg-white">
            <div className="px-6 py-4 flex items-center justify-between border-b border-gray-100">
                <button onClick={onClose} className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors">
                    <SafeIcon icon={Icons.ArrowLeft} size={24} className="text-gray-700" />
                </button>
                <h2 className="text-lg font-bold text-gray-800">Répartition des calories</h2>
                <div className="w-10" />
            </div>

            <div className="flex-1 overflow-y-auto p-6 pb-32">
                <div className="bg-sky-900/5 border border-sky-900/10 rounded-2xl p-4 mb-6 text-sky-900 text-sm font-medium leading-relaxed">
                    Sachez que le fait de lancer un décompte de jeûne peut affecter votre répartition calorique.
                </div>

                <div className="space-y-0 divide-y divide-gray-100">
                    {[
                        { id: 'breakfast', label: 'Petit déjeuner' },
                        { id: 'lunch', label: 'Déjeuner' },
                        { id: 'dinner', label: 'Dîner' },
                        { id: 'snack', label: 'En-cas' }
                    ].map((meal) => (
                        <div key={meal.id} className="flex justify-between items-center py-4">
                            <div>
                                <span className="block font-medium text-gray-800">{meal.label}</span>
                                <span className="text-xs text-gray-500 font-medium">
                                    {Math.round(targets.calories * (dist[meal.id as keyof typeof dist] / 100))} kcal
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="relative w-16">
                                    <input 
                                        type="number" 
                                        value={dist[meal.id as keyof typeof dist]}
                                        onChange={(e) => handleChange(meal.id as any, e.target.value)}
                                        className="w-full text-right font-bold text-gray-800 border-b border-gray-300 focus:border-primary outline-none bg-transparent pb-1"
                                    />
                                    <span className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 text-gray-400 font-bold">%</span>
                                </div>
                                <SafeIcon icon={Icons.ChevronRight} size={16} className="text-gray-300 ml-4" />
                            </div>
                        </div>
                    ))}

                    <div className="flex justify-end pt-4">
                        <span className={`text-lg font-bold ${total === 100 ? 'text-primary' : 'text-amber-500'}`}>
                            {total}%
                        </span>
                    </div>
                </div>
            </div>

            <div className="p-6 border-t border-gray-100">
                <button onClick={handleSave} className="w-full py-4 bg-primary text-white rounded-2xl font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all">
                    Enregistrer
                </button>
            </div>
        </div>
    );
};

const CalorieGoalPage: React.FC<{ targets: any; onClose: () => void; onOpenDistribution: () => void }> = ({ targets, onClose, onOpenDistribution }) => {
    // Function to force recalculate calories based on profile stats (BMR/TDEE)
    // Since `targets` are already calculated from profile in parent, this button just needs to 
    // trigger a refresh or perhaps reset any manual overrides if we had them.
    // For now, it's visual as targets are dynamic.
    const handleRecalculate = () => {
        // In a real app with manual overrides, this would reset them.
        // Here we just show feedback.
        alert("Objectif calorique recalculé selon votre profil actuel.");
    };

    return (
        <div className="flex flex-col h-full bg-white">
            <div className="px-6 py-4 flex items-center gap-4 border-b border-gray-100">
                <button onClick={onClose} className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors">
                    <SafeIcon icon={Icons.ArrowLeft} size={24} className="text-gray-700" />
                </button>
                <h2 className="text-lg font-bold text-gray-800">Objectif calorique</h2>
            </div>

            <div className="flex-1 overflow-y-auto p-6 pb-32">
                <div className="space-y-6">
                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                        <span className="font-bold text-gray-800">Objectif calorique (kcal)</span>
                        <span className="font-bold text-gray-800">{targets.calories}</span>
                    </div>
                    
                    <button 
                        onClick={handleRecalculate}
                        className="w-full text-left py-2 text-gray-800 font-medium border-b border-gray-100 hover:text-primary transition-colors"
                    >
                        Recalculer objectif calo.
                    </button>

                    <div 
                        onClick={onOpenDistribution}
                        className="flex justify-between items-center py-2 border-b border-gray-100 cursor-pointer hover:bg-gray-50 -mx-2 px-2 rounded-lg transition-colors"
                    >
                        <span className="text-gray-800 font-medium">Répartition des calories</span>
                        <SafeIcon icon={Icons.ChevronRight} size={16} className="text-gray-300" />
                    </div>
                </div>
            </div>

            <div className="p-6 border-t border-gray-100">
                <button onClick={onClose} className="w-full py-4 bg-primary text-white rounded-2xl font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all">
                    Enregistrer
                </button>
            </div>
        </div>
    );
};

const DietSelectionPage: React.FC<{ onClose: () => void; onSelect: (presetId: string) => void; currentPreset: string }> = ({ onClose, onSelect, currentPreset }) => {
    return (
        <div className="flex flex-col h-full bg-white">
            <div className="px-6 py-4 flex items-center gap-4 border-b border-gray-100">
                <button onClick={onClose} className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors">
                    <SafeIcon icon={Icons.ArrowLeft} size={24} className="text-gray-700" />
                </button>
                <h2 className="text-lg font-bold text-gray-800">Alimentation</h2>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
                <div className="space-y-1">
                    {Object.entries(DIET_PRESETS).map(([key, preset]) => (
                        <button 
                            key={key}
                            onClick={() => { onSelect(key); onClose(); }}
                            className="w-full flex justify-between items-center py-4 border-b border-gray-50 last:border-0"
                        >
                            <span className="text-base font-medium text-gray-800">{preset.label}</span>
                            {currentPreset === key && (
                                <SafeIcon icon={Icons.Check} size={20} className="text-primary" />
                            )}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

const NutritionalGoalsPage: React.FC<{ targets: any; onClose: () => void; onSave: (macros: { carbs: number, protein: number, fats: number }) => void; onOpenDietSelection: () => void; currentDietLabel: string }> = ({ targets, onClose, onSave, onOpenDietSelection, currentDietLabel }) => {
    const [macros, setMacros] = useState({
        carbs: targets.carbs,
        protein: targets.protein,
        fats: targets.fats
    });

    // Update local state when targets change (e.g. after diet selection)
    useEffect(() => {
        setMacros({
            carbs: targets.carbs,
            protein: targets.protein,
            fats: targets.fats
        });
    }, [targets]);

    const totalCalories = targets.calories;
    
    const getPercentage = (grams: number, caloriesPerGram: number) => {
        return Math.round(((grams * caloriesPerGram) / totalCalories) * 100);
    };

    const handleChange = (macro: 'carbs' | 'protein' | 'fats', value: string) => {
        const numValue = parseInt(value) || 0;
        setMacros(prev => ({ ...prev, [macro]: numValue }));
    };

    const handleSave = () => {
        onSave(macros);
        onClose();
    };

    const pCarbs = getPercentage(macros.carbs, 4);
    const pProt = getPercentage(macros.protein, 4);
    const pFat = getPercentage(macros.fats, 9);
    const totalPercentage = pCarbs + pProt + pFat;

    return (
        <div className="flex flex-col h-full bg-white">
            <div className="px-6 py-4 flex items-center justify-between border-b border-gray-100">
                <button onClick={onClose} className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors">
                    <SafeIcon icon={Icons.ArrowLeft} size={24} className="text-gray-700" />
                </button>
                <h2 className="text-lg font-bold text-gray-800">Objectifs nutritionnels</h2>
                <button onClick={handleSave} className="text-primary font-bold text-sm hover:bg-primary/10 px-3 py-1.5 rounded-full transition-colors">
                    Enregistrer
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
                <div onClick={onOpenDietSelection} className="flex justify-between items-center mb-8 pb-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 -mx-2 px-2 rounded-lg transition-colors">
                    <span className="text-lg font-bold text-gray-800">Alimentation</span>
                    <div className="flex items-center gap-2 text-gray-500">
                        <span className="text-base font-medium">{currentDietLabel}</span>
                        <SafeIcon icon={Icons.ChevronRight} size={16} className="text-gray-300" />
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="flex justify-between items-center py-3 border-b border-gray-100">
                        <div>
                            <span className="block text-lg font-bold text-gray-800">Glucides</span>
                            <span className="text-xs text-gray-500 font-medium">{Math.round(macros.carbs * 4)} kcal</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="relative w-24">
                                <input 
                                    type="number" 
                                    value={macros.carbs}
                                    onChange={(e) => handleChange('carbs', e.target.value)}
                                    className="w-full text-right font-bold text-gray-800 border-b border-gray-300 focus:border-primary outline-none bg-transparent pb-1"
                                />
                                <span className="absolute right-0 top-8 text-xs text-gray-400 font-medium">grammes</span>
                            </div>
                            <div className="w-12 text-right">
                                <span className="text-lg font-bold text-gray-400">{pCarbs}%</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-between items-center py-3 border-b border-gray-100">
                        <div>
                            <span className="block text-lg font-bold text-gray-800">Protéines</span>
                            <span className="text-xs text-gray-500 font-medium">{Math.round(macros.protein * 4)} kcal</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="relative w-24">
                                <input 
                                    type="number" 
                                    value={macros.protein}
                                    onChange={(e) => handleChange('protein', e.target.value)}
                                    className="w-full text-right font-bold text-gray-800 border-b border-gray-300 focus:border-primary outline-none bg-transparent pb-1"
                                />
                                <span className="absolute right-0 top-8 text-xs text-gray-400 font-medium">grammes</span>
                            </div>
                            <div className="w-12 text-right">
                                <span className="text-lg font-bold text-gray-400">{pProt}%</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-between items-center py-3 border-b border-gray-100">
                        <div>
                            <span className="block text-lg font-bold text-gray-800">Lipides</span>
                            <span className="text-xs text-gray-500 font-medium">{Math.round(macros.fats * 9)} kcal</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="relative w-24">
                                <input 
                                    type="number" 
                                    value={macros.fats}
                                    onChange={(e) => handleChange('fats', e.target.value)}
                                    className="w-full text-right font-bold text-gray-800 border-b border-gray-300 focus:border-primary outline-none bg-transparent pb-1"
                                />
                                <span className="absolute right-0 top-8 text-xs text-gray-400 font-medium">grammes</span>
                            </div>
                            <div className="w-12 text-right">
                                <span className="text-lg font-bold text-gray-400">{pFat}%</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end pt-4">
                        <span className={`text-lg font-bold ${totalPercentage >= 99 && totalPercentage <= 101 ? 'text-primary' : 'text-amber-500'}`}>
                            {totalPercentage}%
                        </span>
                    </div>
                    
                    {(totalPercentage < 99 || totalPercentage > 101) && (
                        <div className="text-right text-xs text-amber-500 font-medium">
                            Le total doit être proche de 100%
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const WeightProgressPage: React.FC<{ user: UserProfile; onClose: () => void }> = ({ user, onClose }) => {
    const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');

    // Prepare data for chart
    const history = [...(user.weightHistory || [])].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    // Add current weight as the last point if not already there
    const today = new Date().toISOString().split('T')[0];
    if (!history.find(h => h.date === today)) {
        history.push({ date: today, weight: user.weight });
    }

    // Calculate Start Weight from full history
    const startWeight = history.length > 0 ? history[0].weight : user.weight;
    const currentWeight = user.weight;
    const targetWeight = user.targetWeight || 72.0;
    const difference = (currentWeight - startWeight).toFixed(1);

    // Filter logic based on period
    let chartData = [];
    
    if (period === 'daily') {
        // Show last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        chartData = history
            .filter(h => new Date(h.date) >= thirtyDaysAgo)
            .map(h => ({
                date: new Date(h.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
                fullDate: h.date,
                weight: h.weight
            }));
    } else if (period === 'weekly') {
        // Group by week, take last entry of each week
        const weeklyMap = new Map();
        history.forEach(h => {
            const d = new Date(h.date);
            const weekStart = new Date(d);
            weekStart.setDate(d.getDate() - d.getDay()); // Sunday
            const key = weekStart.toISOString().split('T')[0];
            weeklyMap.set(key, h); // Overwrite to keep latest in week
        });
        chartData = Array.from(weeklyMap.values()).map(h => ({
            date: new Date(h.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
            fullDate: h.date,
            weight: h.weight
        }));
    } else {
        // Monthly
        const monthlyMap = new Map();
        history.forEach(h => {
            const key = h.date.substring(0, 7); // YYYY-MM
            monthlyMap.set(key, h); // Keep latest
        });
        chartData = Array.from(monthlyMap.values()).map(h => ({
            date: new Date(h.date).toLocaleDateString('fr-FR', { month: 'short' }),
            fullDate: h.date,
            weight: h.weight
        }));
    }

    return (
        <div className="flex flex-col h-full bg-white">
            {/* Header */}
            <div className="px-6 py-4 flex items-center gap-4 border-b border-gray-100">
                <button onClick={onClose} className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors">
                    <SafeIcon icon={Icons.ArrowLeft} size={24} className="text-gray-700" />
                </button>
                <h2 className="text-lg font-bold text-gray-800">Poids</h2>
            </div>

            {/* Tabs */}
            <div className="p-4">
                <div className="flex bg-gray-100 rounded-xl p-1">
                    {(['daily', 'weekly', 'monthly'] as const).map((t) => (
                        <button 
                            key={t}
                            onClick={() => setPeriod(t)}
                            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
                                period === t ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            {t === 'daily' ? 'Journalier' : t === 'weekly' ? 'Hebdo' : 'Mensuel'}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 pb-6">
                {/* Summary Stats */}
                <div className="mb-8">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Ces 30 derniers jours</h3>
                    <div className="space-y-3 text-sm font-medium text-gray-500">
                        <div className="flex justify-between">
                            <span>• Poids de départ: {startWeight} kg</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="flex items-center gap-1">
                                • Poids cible: <span className="text-primary font-bold">{targetWeight} kg</span>
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span>• Actuellement: {currentWeight} kg</span>
                        </div>
                        <div className="flex justify-between">
                            <span>• Différence: {difference} kg</span>
                        </div>
                    </div>
                </div>

                {/* Chart */}
                <div className="h-64 w-full -ml-4 mb-8">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={true} horizontal={true} stroke="#f0f0f0" />
                            <XAxis 
                                dataKey="date" 
                                tick={{ fontSize: 12, fill: '#9ca3af' }} 
                                axisLine={false}
                                tickLine={false}
                                interval="preserveStartEnd"
                            />
                            <YAxis 
                                domain={['auto', 'auto']} 
                                tick={{ fontSize: 12, fill: '#9ca3af' }} 
                                axisLine={false}
                                tickLine={false}
                                width={40}
                            />
                            <Tooltip 
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                labelStyle={{ color: '#374151', fontWeight: 'bold', marginBottom: '4px' }}
                            />
                            <ReferenceLine y={targetWeight} stroke="#10b981" strokeDasharray="3 3" />
                            <Line 
                                type="monotone" 
                                dataKey="weight" 
                                stroke="#10b981" 
                                strokeWidth={2}
                                dot={{ r: 4, fill: "#10b981", strokeWidth: 2, stroke: "#fff" }}
                                activeDot={{ r: 6 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* History List */}
                <div>
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Historique</h3>
                    <div className="space-y-4">
                        {history.slice().reverse().map((entry, idx) => (
                            <div key={idx} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                                <span className="text-gray-500 font-medium">
                                    {new Date(entry.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                                </span>
                                <span className="font-bold text-gray-800">{entry.weight} kg</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

const ProfileEditor: React.FC<{ user: UserProfile; onSave: (u: UserProfile) => Promise<void>; onCancel: () => void; onOpenGoals: () => void }> = ({ user, onSave, onCancel, onOpenGoals }) => {
    const [formData, setFormData] = useState(user);
    const [newAllergy, setNewAllergy] = useState('');
    const [newDislike, setNewDislike] = useState('');

    const handleSave = async () => {
        await onSave(formData);
        onCancel();
    };

    const addTag = (field: 'allergies' | 'dislikes', value: string) => {
        if (!value.trim()) return;
        const current = formData[field] || [];
        if (!current.includes(value.trim())) {
            setFormData({ ...formData, [field]: [...current, value.trim()] });
        }
    };

    const removeTag = (field: 'allergies' | 'dislikes', value: string) => {
        const current = formData[field] || [];
        setFormData({ ...formData, [field]: current.filter(t => t !== value) });
    };

    return (
        <div className="flex flex-col h-full bg-white">
            {/* Header */}
            <div className="px-6 py-4 flex items-center gap-4 border-b border-gray-100">
                <button onClick={onCancel} className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors">
                    <SafeIcon icon={Icons.ArrowLeft} size={24} className="text-gray-700" />
                </button>
                <h2 className="text-lg font-bold text-gray-800">Modifier le profil</h2>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8">
                {/* Personal Info */}
                <section>
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Informations personnelles</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-500 mb-1">Nom</label>
                            <input 
                                type="text" 
                                value={formData.name} 
                                onChange={e => setFormData({...formData, name: e.target.value})}
                                className="w-full p-3 bg-gray-50 rounded-xl font-semibold text-gray-800 outline-none focus:ring-2 focus:ring-primary/20"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-500 mb-1">Âge</label>
                                <input 
                                    type="number" 
                                    value={formData.age} 
                                    onChange={e => setFormData({...formData, age: parseInt(e.target.value)})}
                                    className="w-full p-3 bg-gray-50 rounded-xl font-semibold text-gray-800 outline-none focus:ring-2 focus:ring-primary/20"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-500 mb-1">Genre</label>
                                <select 
                                    value={formData.gender} 
                                    onChange={e => setFormData({...formData, gender: e.target.value as any})}
                                    className="w-full p-3 bg-gray-50 rounded-xl font-semibold text-gray-800 outline-none focus:ring-2 focus:ring-primary/20 appearance-none"
                                >
                                    <option value="male">Homme</option>
                                    <option value="female">Femme</option>
                                    <option value="other">Autre</option>
                                </select>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-500 mb-1">Taille (cm)</label>
                                <input 
                                    type="number" 
                                    value={formData.height} 
                                    onChange={e => setFormData({...formData, height: parseInt(e.target.value)})}
                                    className="w-full p-3 bg-gray-50 rounded-xl font-semibold text-gray-800 outline-none focus:ring-2 focus:ring-primary/20"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-500 mb-1">Poids (kg)</label>
                                <input 
                                    type="number" 
                                    value={formData.weight} 
                                    onChange={e => setFormData({...formData, weight: parseFloat(e.target.value)})}
                                    className="w-full p-3 bg-gray-50 rounded-xl font-semibold text-gray-800 outline-none focus:ring-2 focus:ring-primary/20"
                                />
                            </div>
                        </div>
                    </div>
                </section>

                {/* Food Prefs */}
                <section>
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Préférences alimentaires</h3>
                    
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-500 mb-2">Allergies</label>
                        <div className="flex flex-wrap gap-2 mb-2">
                            {(formData.allergies || []).map(item => (
                                <span key={item} className="px-3 py-1 bg-red-50 text-red-600 rounded-full text-sm font-medium flex items-center gap-1">
                                    {item}
                                    <button onClick={() => removeTag('allergies', item)}><SafeIcon icon={Icons.X} size={14} /></button>
                                </span>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <input 
                                type="text" 
                                value={newAllergy}
                                onChange={e => setNewAllergy(e.target.value)}
                                placeholder="Ajouter une allergie..."
                                className="flex-1 p-2 bg-gray-50 rounded-lg text-sm outline-none"
                                onKeyDown={e => { if(e.key === 'Enter') { addTag('allergies', newAllergy); setNewAllergy(''); } }}
                            />
                            <button onClick={() => { addTag('allergies', newAllergy); setNewAllergy(''); }} className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200">
                                <SafeIcon icon={Icons.Plus} size={20} />
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-500 mb-2">Je n'aime pas</label>
                        <div className="flex flex-wrap gap-2 mb-2">
                            {(formData.dislikes || []).map(item => (
                                <span key={item} className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm font-medium flex items-center gap-1">
                                    {item}
                                    <button onClick={() => removeTag('dislikes', item)}><SafeIcon icon={Icons.X} size={14} /></button>
                                </span>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <input 
                                type="text" 
                                value={newDislike}
                                onChange={e => setNewDislike(e.target.value)}
                                placeholder="Ajouter un aliment..."
                                className="flex-1 p-2 bg-gray-50 rounded-lg text-sm outline-none"
                                onKeyDown={e => { if(e.key === 'Enter') { addTag('dislikes', newDislike); setNewDislike(''); } }}
                            />
                            <button onClick={() => { addTag('dislikes', newDislike); setNewDislike(''); }} className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200">
                                <SafeIcon icon={Icons.Plus} size={20} />
                            </button>
                        </div>
                    </div>
                </section>

                {/* Goals Link */}
                <section>
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Objectifs</h3>
                    <div onClick={onOpenGoals} className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl cursor-pointer hover:bg-gray-100 transition-colors">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-primary shadow-sm">
                                <SafeIcon icon={Icons.Target} size={20} />
                            </div>
                            <span className="font-bold text-gray-800">Mes objectifs</span>
                        </div>
                        <SafeIcon icon={Icons.ChevronRight} size={20} className="text-gray-400" />
                    </div>
                </section>
            </div>

            <div className="p-6 border-t border-gray-100">
                <button onClick={handleSave} className="w-full py-4 bg-primary text-white rounded-2xl font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all">
                    Enregistrer
                </button>
            </div>
        </div>
    );
};

const ProfileDashboard: React.FC<{ user: UserProfile; onEdit: () => void; onOpenGoals: () => void; onOpenProgress: () => void; onUpdateUser: (updates: Partial<UserProfile>) => Promise<void> }> = ({ user, onEdit, onOpenGoals, onOpenProgress, onUpdateUser }) => {
    const [logData, setLogData] = useState<DailyLog | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);

    const targets = calculateDailyTargets(user);
    const currentDate = new Date().toISOString().split('T')[0];

    useEffect(() => {
        if (!auth.currentUser) return;
        const unsubscribe = subscribeToDailyLog(auth.currentUser.uid, currentDate, (data) => {
            setLogData(data as DailyLog);
        });
        return () => unsubscribe();
    }, [currentDate]);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0] && auth.currentUser) {
            setUploading(true);
            try {
                const url = await uploadProfileImage(auth.currentUser.uid, e.target.files[0]);
                await onUpdateUser({ photoURL: url });
            } catch (error) {
                console.error("Error uploading profile image:", error);
                alert("Erreur lors du téléchargement de l'image.");
            } finally {
                setUploading(false);
            }
        }
    };

    const consumed = logData?.consumed || 0;
    const burned = logData?.burned || 0;
    const remaining = targets.calories - consumed + burned;

    // Correct Calculation for Progress Bar
    const history = [...(user.weightHistory || [])].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const startWeight = history.length > 0 ? history[0].weight : user.weight;
    const currentWeight = user.weight;
    const targetWeight = user.targetWeight || 72.0;
    
    const weightLost = (startWeight - currentWeight).toFixed(1);
    const weightGained = (currentWeight - startWeight).toFixed(1);
    
    let progressPercentage = 0;
    let statusMessage = "";
    
    const isWeightLoss = targetWeight < startWeight;
    
    if (isWeightLoss) {
        // Goal: Lose Weight
        const totalToLose = startWeight - targetWeight;
        const lostSoFar = startWeight - currentWeight;
        progressPercentage = Math.max(0, Math.min(100, (lostSoFar / totalToLose) * 100));
        
        if (currentWeight <= targetWeight) {
            statusMessage = "Objectif atteint ! Bravo !";
        } else {
            const remainingWeight = currentWeight - targetWeight;
            const weeklyRate = Math.abs(user.weeklyGoal || 0.5);
            const weeksRemaining = weeklyRate > 0 ? Math.ceil(remainingWeight / weeklyRate) : 4;
            statusMessage = `plus que ${weeksRemaining} semaines avant d'atteindre votre objectif !`;
        }
    } else {
        // Goal: Gain Weight
        const totalToGain = targetWeight - startWeight;
        const gainedSoFar = currentWeight - startWeight;
        progressPercentage = Math.max(0, Math.min(100, (gainedSoFar / totalToGain) * 100));
        
        if (currentWeight >= targetWeight) {
            statusMessage = "Objectif atteint ! Bravo !";
        } else {
             const remainingWeight = targetWeight - currentWeight;
             const weeklyRate = Math.abs(user.weeklyGoal || 0.25);
             const weeksRemaining = weeklyRate > 0 ? Math.ceil(remainingWeight / weeklyRate) : 4;
             statusMessage = `plus que ${weeksRemaining} semaines avant d'atteindre votre objectif !`;
        }
    }
    
    const goalLabel = GOAL_OPTIONS.find(g => g.value === user.goal)?.label || user.goal;

    return (
        <div className="flex flex-col h-full bg-gray-50 relative overflow-y-auto pb-32">
            <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                className="hidden" 
                accept="image/*"
            />

            {/* Header */}
            <div className="px-6 py-6 flex justify-between items-center">
                <h1 className="text-3xl font-black text-gray-800">Profil</h1>
                <div className="flex gap-3">
                    <button onClick={onEdit} className="p-2 bg-white rounded-full text-gray-400 hover:text-primary transition-colors shadow-sm">
                        <SafeIcon icon={Icons.Settings} size={20} />
                    </button>
                    <button onClick={() => logOut()} className="p-2 bg-white rounded-full text-gray-400 hover:text-red-500 transition-colors shadow-sm">
                        <SafeIcon icon={Icons.LogOut} size={20} />
                    </button>
                </div>
            </div>

            {/* Main Card */}
            <div className="px-6 mb-6">
                <div className="bg-white rounded-[32px] p-6 shadow-lg shadow-slate-200/50 border border-gray-100 relative overflow-hidden transition-transform active:scale-[0.98]">
                    <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-50 rounded-full blur-3xl opacity-50 pointer-events-none" />
                    
                    <div className="flex items-start gap-5 mb-8 relative z-10">
                        <button 
                            onClick={() => fileInputRef.current?.click()} 
                            className="relative w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center border-4 border-white shadow-sm overflow-hidden group"
                        >
                            {user.photoURL ? (
                                <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                                <SafeIcon icon={Icons.User} size={36} className="text-slate-300" />
                            )}
                            {uploading && (
                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                </div>
                            )}
                            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <SafeIcon icon={Icons.Edit} size={16} className="text-white" />
                            </div>
                        </button>
                        <div className="flex-1 pt-1" onClick={onEdit} style={{ cursor: 'pointer' }}>
                            <h2 className="text-2xl font-black text-gray-800 mb-1">{user.name || 'Utilisateur'}</h2>
                            <div className="flex flex-wrap gap-y-1 gap-x-3 text-sm font-medium text-gray-500">
                                <div className="flex items-center gap-1.5">
                                    <SafeIcon icon={Icons.Cake} size={14} />
                                    <span>{user.age} ans</span>
                                </div>
                                <span className="text-gray-300">•</span>
                                <div className="flex items-center gap-1.5">
                                    <SafeIcon icon={Icons.Scale} size={14} />
                                    <span>{user.weight} kg</span>
                                </div>
                                <span className="text-gray-300">•</span>
                                <div className="flex items-center gap-1.5">
                                    <SafeIcon icon={GOAL_OPTIONS.find(g => g.value === user.goal)?.icon} size={14} />
                                    <span>{goalLabel}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-between items-end px-2 relative z-10">
                        <div>
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wide block mb-1">kcal restantes</span>
                            <span className="text-4xl font-black text-gray-800 tracking-tight">{Math.round(remaining)}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Progress Section */}
            <div className="px-6 mb-6">
                <div className="flex justify-between items-center mb-3">
                    <h3 className="font-bold text-gray-800">Mes progrès</h3>
                    <button onClick={onOpenProgress} className="text-primary text-sm font-bold hover:underline">Analyse</button>
                </div>
                <div onClick={onOpenProgress} className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors">
                    <div className="text-center mb-6">
                        <p className="font-bold text-gray-800 text-lg">
                            {isWeightLoss 
                                ? `Vous avez perdu ${Math.abs(Number(weightLost))} kg !` 
                                : `Vous avez pris ${Math.abs(Number(weightGained))} kg !`
                            }
                        </p>
                        <p className="text-xs text-gray-400 font-medium mt-1">
                            {statusMessage}
                        </p>
                    </div>
                    
                    <div className="relative h-2 bg-gray-100 rounded-full mb-2">
                        <div 
                            className="absolute left-0 top-0 bottom-0 bg-primary rounded-full transition-all duration-1000 ease-out" 
                            style={{ width: `${progressPercentage}%` }} 
                        />
                        <div 
                            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-primary border-2 border-white rounded-full shadow-sm transition-all duration-1000 ease-out"
                            style={{ left: `calc(${progressPercentage}% - 6px)` }}
                        />
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-gray-300 border-2 border-white rounded-full" />
                    </div>
                    <div className="flex justify-between text-xs font-bold text-gray-500 mt-2">
                        <span>{currentWeight} kg</span>
                        <span>{targetWeight} kg</span>
                    </div>
                </div>
            </div>

            {/* Goals Section */}
            <div className="px-6 mb-6">
                <div className="flex justify-between items-center mb-3">
                    <h3 className="font-bold text-gray-800">Mes objectifs</h3>
                    <button onClick={onOpenGoals} className="text-primary text-sm font-bold hover:underline">Editer</button>
                </div>
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-4 cursor-pointer hover:bg-gray-50 transition-colors" onClick={onOpenGoals}>
                    <GoalItem icon={Icons.Utensils} label="Alimentation" value="Standard" />
                    <GoalItem icon={Icons.Target} label="Objectif" value={goalLabel} />
                    <GoalItem icon={Icons.Scale} label="Poids" value={`${user.weight} kg`} />
                    <GoalItem icon={Icons.Zap} label="Calories" value={`${targets.calories} kcal`} />
                </div>
            </div>
        </div>
    );
};

// ... (ProfileEditor component remains unchanged)

export const Profile: React.FC<ProfileProps> = ({ user, onSave }) => {
    const [mode, setMode] = useState<'view' | 'edit' | 'goals' | 'calories' | 'nutrition' | 'diet' | 'calorie-distribution' | 'progress'>('view');
    // ... (rest of state and effects)
    const [selectedDiet, setSelectedDiet] = useState<string>('default');
    const [currentDietLabel, setCurrentDietLabel] = useState<string>(user.customMacros ? "Personnalisé" : "Par défaut");

    // Derived state for nutritional goals page to allow previewing presets
    const [previewTargets, setPreviewTargets] = useState<any>(calculateDailyTargets(user));

    useEffect(() => {
        // When diet preset changes, recalculate targets if we are in nutrition mode and previewing
        if (mode === 'nutrition') {
            const preset = DIET_PRESETS[selectedDiet];
            if (preset && preset.ratios) {
                const calories = calculateDailyTargets(user).calories;
                const newMacros = {
                    protein: Math.round((calories * preset.ratios.protein) / 4),
                    carbs: Math.round((calories * preset.ratios.carbs) / 4),
                    fats: Math.round((calories * preset.ratios.fats) / 9),
                };
                setPreviewTargets({ ...calculateDailyTargets(user), ...newMacros });
                setCurrentDietLabel(preset.label);
            }
        } else {
            // Reset to actual user targets when not in nutrition/diet flow or when resetting
            setPreviewTargets(calculateDailyTargets(user));
            // Reset label if not custom
            if (!user.customMacros) setSelectedDiet('default');
        }
    }, [selectedDiet, mode, user]);

    const handleSaveNutrition = async (macros: { carbs: number, protein: number, fats: number }) => {
        await onSave({
            ...user,
            customMacros: macros
        });
        setCurrentDietLabel(selectedDiet === 'default' ? 'Par défaut' : DIET_PRESETS[selectedDiet]?.label || 'Personnalisé');
    };

    const handleSaveDistribution = async (dist: { breakfast: number, lunch: number, dinner: number, snack: number }) => {
        await onSave({
            ...user,
            mealDistribution: dist
        });
    };

    const handleDietSelect = (presetId: string) => {
        setSelectedDiet(presetId);
    };

    const handleUpdateUser = async (updates: Partial<UserProfile>) => {
        await onSave({
            ...user,
            ...updates
        });
    };

    return (
        <AnimatePresence mode="wait">
            {mode === 'view' && (
                <motion.div key="view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
                    <ProfileDashboard 
                        user={user} 
                        onEdit={() => setMode('edit')} 
                        onOpenGoals={() => setMode('goals')} 
                        onOpenProgress={() => setMode('progress')}
                        onUpdateUser={handleUpdateUser}
                    />
                </motion.div>
            )}
            {mode === 'edit' && (
                <motion.div key="edit" initial={{ opacity: 0, x: '100%' }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: '100%' }} className="h-full z-50 absolute inset-0">
                    <ProfileEditor 
                        user={user} 
                        onSave={onSave} 
                        onCancel={() => setMode('view')} 
                        onOpenGoals={() => setMode('goals')} 
                    />
                </motion.div>
            )}
            {mode === 'goals' && (
                <motion.div key="goals" initial={{ opacity: 0, x: '100%' }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: '100%' }} className="h-full z-50 absolute inset-0">
                    <MyGoalsPage 
                        user={user} 
                        targets={calculateDailyTargets(user)} 
                        onClose={() => setMode('view')} 
                        onOpenCalories={() => setMode('calories')}
                        onOpenNutrition={() => setMode('nutrition')}
                        onUpdateUser={handleUpdateUser}
                    />
                </motion.div>
            )}
            {mode === 'calories' && (
                <motion.div key="calories" initial={{ opacity: 0, x: '100%' }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: '100%' }} className="h-full z-50 absolute inset-0">
                    <CalorieGoalPage 
                        targets={calculateDailyTargets(user)} 
                        onClose={() => setMode('goals')} 
                        onOpenDistribution={() => setMode('calorie-distribution')}
                    />
                </motion.div>
            )}
            {mode === 'calorie-distribution' && (
                <motion.div key="calorie-distribution" initial={{ opacity: 0, x: '100%' }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: '100%' }} className="h-full z-50 absolute inset-0">
                    <CalorieDistributionPage 
                        targets={calculateDailyTargets(user)} 
                        user={user}
                        onSave={handleSaveDistribution}
                        onClose={() => setMode('calories')}
                    />
                </motion.div>
            )}
            {mode === 'nutrition' && (
                <motion.div key="nutrition" initial={{ opacity: 0, x: '100%' }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: '100%' }} className="h-full z-50 absolute inset-0">
                    <NutritionalGoalsPage 
                        targets={previewTargets} 
                        onClose={() => setMode('goals')}
                        onSave={handleSaveNutrition}
                        onOpenDietSelection={() => setMode('diet')}
                        currentDietLabel={currentDietLabel}
                    />
                </motion.div>
            )}
            {mode === 'diet' && (
                <motion.div key="diet" initial={{ opacity: 0, x: '100%' }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: '100%' }} className="h-full z-50 absolute inset-0">
                    <DietSelectionPage 
                        onClose={() => setMode('nutrition')} 
                        onSelect={handleDietSelect} 
                        currentPreset={selectedDiet} 
                    />
                </motion.div>
            )}
            {mode === 'progress' && (
                <motion.div key="progress" initial={{ opacity: 0, x: '100%' }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: '100%' }} className="h-full z-50 absolute inset-0">
                    <WeightProgressPage 
                        user={user} 
                        onClose={() => setMode('view')} 
                    />
                </motion.div>
            )}
        </AnimatePresence>
  );
};
