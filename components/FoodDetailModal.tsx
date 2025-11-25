import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Icons } from './Icons';
import { ProductResult } from '../services/foodApi';

import { ModernSelect } from './ModernSelect';

interface FoodDetailModalProps {
    product: ProductResult;
    mealTypeLabel: string; // "Petit déjeuner"
    onClose: () => void;
    onAdd: (name: string, calories: number, macros: any, quantity: number, unit?: string, servingCount?: number) => void;
    initialAmount?: number;
    initialUnit?: 'g' | 'portion';
    isEditing?: boolean;
    onDelete?: () => void;
}

export const FoodDetailModal: React.FC<FoodDetailModalProps> = ({ product, mealTypeLabel, onClose, onAdd, initialAmount, initialUnit = 'g', isEditing, onDelete }) => {
    const [amount, setAmount] = useState<string>(initialAmount ? initialAmount.toString() : '100');
    const [unit, setUnit] = useState<'g' | 'portion'>('g');

    // Update unit if initialUnit changes (or on mount)
    useEffect(() => {
        if (initialUnit) setUnit(initialUnit);
    }, [initialUnit]);
    
    // Parse serving size if available (e.g. "150 g" -> 150)
    // Handle potential non-string API responses safely
    const servingSizeStr = typeof product.serving_size === 'string' ? product.serving_size : '';
    const servingWeight = servingSizeStr ? parseFloat(servingSizeStr.replace(/[^\d.]/g, '') || '0') : 0;
    const hasServing = servingWeight > 0;

    // Helper to get safe number
    const getNute = (key: keyof typeof product.nutriments) => product.nutriments[key] || 0;

    const baseKcal = getNute('energy-kcal_100g');
    const baseProt = getNute('proteins_100g');
    const baseCarbs = getNute('carbohydrates_100g');
    const baseFat = getNute('fat_100g');

    // Calculated values
    let currentWeight = parseFloat(amount) || 0;
    if (unit === 'portion' && hasServing) {
        currentWeight = currentWeight * servingWeight;
    }
    
    const factor = currentWeight / 100;
    const cals = Math.round(baseKcal * factor);
    const prot = (baseProt * factor).toFixed(1);
    const carbs = (baseCarbs * factor).toFixed(1);
    const fat = (baseFat * factor).toFixed(1);

    // Tags Logic
    const tags = [];
    if (baseKcal < 50) tags.push({ label: 'Faible en calories', color: 'text-emerald-600 bg-emerald-100', icon: Icons.Leaf });
    if (baseFat < 3) tags.push({ label: 'Faible en matières grasses', color: 'text-emerald-600 bg-emerald-100', icon: Icons.Droplet });
    if (baseProt > 10) tags.push({ label: 'Riche en protéines', color: 'text-blue-600 bg-blue-100', icon: Icons.Dumbbell });
    if (baseCarbs > 20) tags.push({ label: 'Riche en glucides', color: 'text-amber-600 bg-amber-100', icon: Icons.Flame });

    return (
        <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex flex-col justify-end sm:justify-center"
        >
            <motion.div 
                initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="bg-gray-50 w-full h-[90vh] sm:h-[800px] sm:max-w-[400px] sm:mx-auto sm:rounded-3xl rounded-t-3xl overflow-hidden flex flex-col relative"
            >
                {/* Header Image Area */}
                <div className="relative h-48 bg-gray-900 flex items-center justify-center overflow-hidden shrink-0">
                     {/* Blurred Background */}
                     {product.image_url && (
                        <img src={product.image_url} className="absolute inset-0 w-full h-full object-cover opacity-50 blur-xl scale-110" alt="" />
                     )}
                     
                     {/* Main Image */}
                     {product.image_url ? (
                         <img src={product.image_url} className="h-32 w-32 object-contain relative z-10 rounded-xl shadow-2xl bg-white p-2" alt={product.product_name} />
                     ) : (
                         <div className="h-24 w-24 bg-gray-800 rounded-full flex items-center justify-center text-gray-500 relative z-10">
                             <Icons.ShoppingBag size={40} />
                         </div>
                     )}

                     {/* Close Button */}
                     <button onClick={onClose} className="absolute top-4 right-4 z-20 p-2 bg-black/20 backdrop-blur rounded-full text-white hover:bg-black/40 transition-colors">
                         <Icons.X size={20} />
                     </button>
                     
                     {/* Header Title Overlay */}
                     <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-gray-50 to-transparent pt-12 z-10">
                         <h2 className="text-xl font-black text-gray-800 text-center leading-tight line-clamp-2">
                             {product.product_name}
                         </h2>
                         {product.brands && <p className="text-center text-xs font-bold text-gray-400 uppercase mt-1">{product.brands}</p>}
                     </div>
                </div>

                {/* Content Scrollable */}
                <div className="flex-1 overflow-y-auto p-6 pb-32 no-scrollbar">
                    
                    {/* Macros Summary */}
                    <div className="grid grid-cols-4 gap-2 mb-6">
                         <div className="text-center">
                             <span className="block text-2xl font-black text-gray-800">{cals}</span>
                             <span className="text-[10px] font-bold text-gray-400 uppercase">Calories</span>
                         </div>
                         <div className="text-center">
                             <span className="block text-xl font-bold text-emerald-600">{carbs}g</span>
                             <span className="text-[10px] font-bold text-gray-400 uppercase">Glucides</span>
                         </div>
                         <div className="text-center">
                             <span className="block text-xl font-bold text-blue-600">{prot}g</span>
                             <span className="text-[10px] font-bold text-gray-400 uppercase">Protéines</span>
                         </div>
                         <div className="text-center">
                             <span className="block text-xl font-bold text-amber-600">{fat}g</span>
                             <span className="text-[10px] font-bold text-gray-400 uppercase">Lipides</span>
                         </div>
                    </div>

                    {/* Tags */}
                    {tags.length > 0 && (
                        <div className="mb-6">
                            <h3 className="text-sm font-bold text-gray-800 mb-3">Notation des aliments</h3>
                            <div className="flex flex-wrap gap-2">
                                {tags.map((tag, i) => (
                                    <div key={i} className={`px-3 py-1.5 rounded-lg flex items-center gap-2 text-xs font-bold ${tag.color}`}>
                                        <tag.icon size={14} />
                                        {tag.label}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Detailed Nutrition Table */}
                    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-6">
                        <h3 className="text-sm font-bold text-gray-800 mb-4">Valeurs nutritives</h3>
                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between items-center font-bold border-b border-gray-50 pb-2">
                                <span className="text-gray-800">Calories</span>
                                <span className="text-gray-800">{cals} kcal</span>
                            </div>
                            <div className="flex justify-between items-center text-gray-600 border-b border-gray-50 pb-2">
                                <span>Protéines</span>
                                <span>{prot} g</span>
                            </div>
                            <div className="flex justify-between items-center text-gray-600 border-b border-gray-50 pb-2">
                                <span>Glucides</span>
                                <span>{carbs} g</span>
                            </div>
                            <div className="flex justify-between items-center text-gray-500 pl-4 pb-2 border-b border-gray-50">
                                <span>Sucres</span>
                                <span>{(getNute('sugars_100g') * factor).toFixed(1)} g</span>
                            </div>
                            <div className="flex justify-between items-center text-gray-600 border-b border-gray-50 pb-2">
                                <span>Lipides</span>
                                <span>{fat} g</span>
                            </div>
                            <div className="flex justify-between items-center text-gray-500 pl-4 pb-2 border-b border-gray-50">
                                <span>Saturés</span>
                                <span>-- g</span> {/* Souvent manquant dans recherche simple */}
                            </div>
                             <div className="flex justify-between items-center text-gray-600 pb-1">
                                <span>Sel</span>
                                <span>{(getNute('salt_100g') * factor).toFixed(2)} g</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom Action Bar (Sticky) */}
                <div className="absolute bottom-0 left-0 right-0 bg-white p-4 border-t border-gray-100 pb-safe z-30">
                     <div className="flex items-center gap-3 mb-4">
                         <div className="flex-1 bg-gray-100 rounded-xl flex items-center px-4 py-3">
                             <input 
                                type="number" 
                                inputMode="decimal"
                                value={amount}
                                onChange={e => setAmount(e.target.value)}
                                className="bg-transparent w-full outline-none font-bold text-gray-800 text-lg text-center"
                                placeholder={unit === 'portion' ? "1" : "100"}
                             />
                             <div className="ml-2">
                                <ModernSelect
                                    value={unit}
                                    onChange={(val) => {
                                        const newUnit = val as any;
                                        setAmount(newUnit === 'portion' ? '1' : '100');
                                        setUnit(newUnit);
                                    }}
                                    options={[
                                        { value: 'g', label: 'g / ml' },
                                        ...(hasServing ? [{ value: 'portion', label: `Portion (${servingWeight}g)` }] : [])
                                    ]}
                                    className="!border-0 !bg-transparent !shadow-none !p-0 !h-auto !text-gray-500 !w-auto"
                                    placeholder="Unit"
                                />
                             </div>
                         </div>
                     </div>
                     
                     <div className="flex gap-3">
                         {isEditing && onDelete && (
                             <button 
                                onClick={onDelete}
                                className="w-16 flex items-center justify-center bg-red-50 text-red-500 rounded-2xl hover:bg-red-100 transition-colors active:scale-95"
                             >
                                 <Icons.Trash size={24} />
                             </button>
                         )}
                         <button 
                            onClick={() => {
                                // If unit is portion, amount is the number of portions.
                                // If unit is g, amount is grams.
                                const rawAmount = parseFloat(amount) || 0;
                                onAdd(
                                    product.product_name, 
                                    cals, 
                                    { protein: parseFloat(prot), carbs: parseFloat(carbs), fats: parseFloat(fat) }, 
                                    currentWeight,
                                    unit,
                                    unit === 'portion' ? rawAmount : undefined
                                );
                            }}
                            className="flex-1 py-4 bg-primary text-white rounded-2xl font-bold text-lg shadow-lg shadow-primary/20 hover:bg-emerald-600 transition-all active:scale-95"
                         >
                             {isEditing ? "Mettre à jour" : `Ajouter au ${mealTypeLabel}`}
                         </button>
                     </div>
                </div>
            </motion.div>
        </motion.div>
    );
};

