import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Icons } from './Icons';
import { DailyLog, UserProfile } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface DailySummaryModalProps {
    date: string;
    logData: DailyLog | null;
    targets: { calories: number; protein: number; carbs: number; fats: number; water: number };
    onClose: () => void;
}

export const DailySummaryModal: React.FC<DailySummaryModalProps> = ({ date, logData, targets, onClose }) => {
    const [activeMealTab, setActiveMealTab] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>('breakfast');

    // Aggregate data
    const consumed = logData?.consumed || 0;
    const meals = logData?.meals || [];

    // Calculate totals per macro from meals (assuming meals have macros, otherwise estimate)
    // Note: The current MealEntry interface in types.ts only has 'calories'. 
    // We might need to update MealEntry to include macros if we want precise data here.
    // For now, I will check if MealEntry has macros in the actual data (it seems MealDetailModal saves them).
    // Let's assume the data structure in Firebase has macros even if typescript interface might be missing it strictly.
    
    const getMacros = (mealList: any[]) => {
        return mealList.reduce((acc, meal) => ({
            protein: acc.protein + (meal.macros?.protein || 0),
            carbs: acc.carbs + (meal.macros?.carbs || 0),
            fats: acc.fats + (meal.macros?.fats || 0),
            calories: acc.calories + (meal.calories || 0),
        }), { protein: 0, carbs: 0, fats: 0, calories: 0 });
    };

    const totalMacros = getMacros(meals);
    
    // Chart Data
    const chartData = [
        { name: 'Glucides', current: totalMacros.carbs, target: targets.carbs, color: '#10b981' }, // emerald-500
        { name: 'Protéines', current: totalMacros.protein, target: targets.protein, color: '#3b82f6' }, // blue-500
        { name: 'Lipides', current: totalMacros.fats, target: targets.fats, color: '#f59e0b' }, // amber-500
    ];

    // Meal Tabs Data
    const MEAL_TABS = [
        { id: 'breakfast', label: 'Petit déj', icon: Icons.Coffee, color: 'text-amber-600 bg-amber-100' },
        { id: 'lunch', label: 'Déjeuner', icon: Icons.Utensils, color: 'text-primary bg-emerald-100' },
        { id: 'dinner', label: 'Dîner', icon: Icons.Moon, color: 'text-indigo-500 bg-indigo-100' },
        { id: 'snack', label: 'En-cas', icon: Icons.Apple, color: 'text-rose-500 bg-rose-100' },
    ] as const;

    const activeMealData = getMacros(meals.filter((m: any) => m.type === activeMealTab));

    // Helper for progress bars
    const ProgressBar = ({ label, current, target, colorClass }: { label: string, current: number, target: number, colorClass: string }) => {
        const percent = Math.min(100, (current / target) * 100);
        return (
            <div className="mb-4">
                <div className="flex justify-between text-sm font-medium mb-1">
                    <span className="text-gray-600">{label}</span>
                    <span className="text-gray-800 font-bold">{Math.round(current)} / {Math.round(target)} g</span>
                </div>
                <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full ${colorClass} rounded-full transition-all duration-500`} style={{ width: `${percent}%` }} />
                </div>
            </div>
        );
    };

    return (
        <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-gray-50 z-[60] flex flex-col"
        >
            {/* Header */}
            <div className="bg-white px-6 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 z-10">
                <button onClick={onClose} className="p-2 -ml-2 hover:bg-gray-100 rounded-full text-gray-600 transition-colors">
                    <Icons.ArrowLeft size={24} />
                </button>
                <h1 className="text-lg font-black text-gray-800 capitalize">{date === new Date().toISOString().split('T')[0] ? "Aujourd'hui" : date}</h1>
                <div className="w-10" /> {/* Spacer for centering */}
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 pb-safe space-y-8">
                
                {/* Chart Section */}
                <section>
                    <h2 className="text-lg font-bold text-gray-800 mb-4">Valeurs nutritives</h2>
                    <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
                        <div className="flex items-center gap-4 mb-6 text-xs font-medium text-gray-500">
                            <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-gray-200" /> Objectif</div>
                            <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-primary" /> Actuellement</div>
                        </div>
                        
                        <div className="h-48 w-full flex items-end justify-between gap-4 px-4">
                            {chartData.map((item, i) => {
                                const targetH = 100; // Fixed height for target bars visualization
                                const currentH = Math.min(100, (item.current / item.target) * 100);
                                
                                return (
                                    <div key={i} className="flex flex-col items-center flex-1 h-full justify-end gap-2">
                                        <div className="relative w-full max-w-[40px] h-full flex items-end">
                                            {/* Target Bar (Background) */}
                                            {/* We simulate the chart style from screenshot: Side by side or overlapping? 
                                                Screenshot shows thin target bar vs thick current bar side-by-side or superimposed.
                                                Let's do simple bars for clarity.
                                            */}
                                            <div className="w-full bg-gray-100 rounded-t-sm absolute bottom-0 left-0 right-0" style={{ height: '100%' }} />
                                            <div className="w-full rounded-t-sm z-10 transition-all duration-1000" style={{ height: `${currentH}%`, backgroundColor: item.color }} />
                                        </div>
                                        <div className="text-center">
                                            <span className="block text-xs font-bold text-gray-800">{Math.round((item.current / item.target) * 100)}%</span>
                                            <span className="block text-[10px] text-gray-400 uppercase tracking-wider">{item.name}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </section>

                {/* Detail List Section */}
                <section>
                    <h2 className="text-lg font-bold text-gray-800 mb-4">Apport nutritionnel</h2>
                    <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-4">
                        <ProgressBar label="Calories" current={consumed} target={targets.calories} colorClass="bg-gray-800" />
                        <ProgressBar label="Glucides" current={totalMacros.carbs} target={targets.carbs} colorClass="bg-emerald-500" />
                        <ProgressBar label="Protéines" current={totalMacros.protein} target={targets.protein} colorClass="bg-blue-500" />
                        <ProgressBar label="Lipides" current={totalMacros.fats} target={targets.fats} colorClass="bg-amber-500" />
                    </div>
                </section>

                {/* Meals Section */}
                <section>
                    <h2 className="text-lg font-bold text-gray-800 mb-4">Repas</h2>
                    <div className="bg-white rounded-3xl p-2 shadow-sm border border-gray-100">
                        {/* Tabs */}
                        <div className="flex p-1 gap-1 bg-gray-50 rounded-2xl mb-4 overflow-x-auto">
                            {MEAL_TABS.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveMealTab(tab.id)}
                                    className={`flex-1 min-w-[80px] py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${activeMealTab === tab.id ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                                >
                                    <tab.icon size={14} className={activeMealTab === tab.id ? 'text-primary' : ''} />
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* Tab Content */}
                        <div className="px-4 pb-4">
                            <div className="flex justify-between items-center mb-4">
                                <span className="text-sm font-bold text-gray-800">Calories</span>
                                <span className="text-sm font-medium text-gray-500">{Math.round(activeMealData.calories)} kcal</span>
                            </div>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-gray-500 font-medium">Glucides</span>
                                    <span className="text-gray-800 font-bold">{Math.round(activeMealData.carbs)} g</span>
                                </div>
                                <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-emerald-500" style={{ width: `${Math.min(100, (activeMealData.carbs / (targets.carbs / 3)) * 100)}%` }} />
                                </div>

                                <div className="flex justify-between items-center text-xs pt-1">
                                    <span className="text-gray-500 font-medium">Protéines</span>
                                    <span className="text-gray-800 font-bold">{Math.round(activeMealData.protein)} g</span>
                                </div>
                                <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-blue-500" style={{ width: `${Math.min(100, (activeMealData.protein / (targets.protein / 3)) * 100)}%` }} />
                                </div>

                                <div className="flex justify-between items-center text-xs pt-1">
                                    <span className="text-gray-500 font-medium">Lipides</span>
                                    <span className="text-gray-800 font-bold">{Math.round(activeMealData.fats)} g</span>
                                </div>
                                <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-amber-500" style={{ width: `${Math.min(100, (activeMealData.fats / (targets.fats / 3)) * 100)}%` }} />
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        </motion.div>
    );
};

