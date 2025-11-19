import React, { useState } from 'react';
import { Recipe } from '../types';
import { Icons } from '../components/Icons';

interface RecipeDetailProps {
  recipe: Recipe;
  onBack: () => void;
}

export const RecipeDetail: React.FC<RecipeDetailProps> = ({ recipe, onBack }) => {
  const [cookingMode, setCookingMode] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  if (cookingMode) {
    return (
      <div className="h-full bg-gray-900 text-white flex flex-col">
        <div className="p-6 flex items-center justify-between">
           <button onClick={() => setCookingMode(false)} className="p-2 bg-gray-800 rounded-full hover:bg-gray-700 transition-colors">
            <Icons.ArrowLeft className="w-5 h-5" />
          </button>
          <span className="font-bold text-gray-300">Step {currentStep + 1} of {recipe.instructions.length}</span>
          <div className="w-9"></div>
        </div>

        <div className="flex-1 flex flex-col justify-center p-8">
          <h2 className="text-2xl md:text-3xl font-bold mb-8 leading-snug text-center animate-fade-in">
            {recipe.instructions[currentStep]}
          </h2>
          
          {currentStep === recipe.instructions.length - 1 && (
            <div className="mt-4 p-4 bg-emerald-500/20 border border-emerald-500 rounded-xl text-emerald-300 flex items-center justify-center gap-3 animate-bounce-slow">
              <Icons.Check className="w-6 h-6" />
              <span className="font-medium">Final Step! Bon Appétit!</span>
            </div>
          )}
        </div>

        <div className="p-8 flex gap-4">
          <button 
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
            className="flex-1 py-4 bg-gray-800 rounded-2xl disabled:opacity-30 flex items-center justify-center gap-2 font-bold transition-all active:scale-95"
          >
            <Icons.Prev className="w-5 h-5" /> Prev
          </button>
           <button 
            onClick={() => setCurrentStep(Math.min(recipe.instructions.length - 1, currentStep + 1))}
            disabled={currentStep === recipe.instructions.length - 1}
            className="flex-1 py-4 bg-primary text-white rounded-2xl disabled:opacity-50 disabled:bg-gray-700 flex items-center justify-center gap-2 font-bold transition-all active:scale-95 shadow-lg shadow-primary/20"
          >
            Next <Icons.Next className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white overflow-y-auto no-scrollbar">
      {/* Header */}
      <div className="sticky top-0 bg-white/90 backdrop-blur-md p-4 flex items-center gap-3 border-b border-gray-100 z-20">
        <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <Icons.ArrowLeft size={20} className="text-gray-700" />
        </button>
        <h2 className="font-bold text-lg truncate flex-1 text-gray-800">{recipe.title}</h2>
      </div>

      <div className="p-6 pb-12">
        {/* Tags & Match Score */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
             <div className={`text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-sm ${
                recipe.matchPercentage > 85 ? 'bg-emerald-100 text-emerald-700' : 'bg-yellow-100 text-yellow-700'
             }`}>
                <Icons.Check size={14} strokeWidth={3} />
                {recipe.matchPercentage}% Match
             </div>
             {recipe.tags && recipe.tags.map((tag, i) => (
                 <span key={i} className="text-xs font-medium px-2.5 py-1.5 bg-gray-100 text-gray-600 rounded-full border border-gray-200">
                     {tag}
                 </span>
             ))}
        </div>

        {/* Macros Grid - Colorful Design from PDF */}
        <div className="grid grid-cols-4 gap-2 mb-8">
            <div className="bg-orange-50 p-3 rounded-xl text-center border border-orange-100">
                <span className="block text-[10px] text-gray-500 uppercase font-bold mb-1">Cals</span>
                <span className="font-bold text-orange-600 text-sm sm:text-base">{recipe.calories}</span>
            </div>
            <div className="bg-blue-50 p-3 rounded-xl text-center border border-blue-100">
                <span className="block text-[10px] text-gray-500 uppercase font-bold mb-1">Prot</span>
                <span className="font-bold text-blue-600 text-sm sm:text-base">{recipe.macros.protein}</span>
            </div>
            <div className="bg-green-50 p-3 rounded-xl text-center border border-green-100">
                <span className="block text-[10px] text-gray-500 uppercase font-bold mb-1">Carb</span>
                <span className="font-bold text-green-600 text-sm sm:text-base">{recipe.macros.carbs}</span>
            </div>
            <div className="bg-yellow-50 p-3 rounded-xl text-center border border-yellow-100">
                <span className="block text-[10px] text-gray-500 uppercase font-bold mb-1">Fat</span>
                <span className="font-bold text-yellow-600 text-sm sm:text-base">{recipe.macros.fats}</span>
            </div>
        </div>

        {/* Ingredients List */}
        <div className="mb-8">
          <h3 className="font-bold text-xl mb-4 flex items-center gap-2 text-gray-800">
            <span className="w-1 h-6 bg-primary rounded-full"></span>
            Ingredients
          </h3>
          <ul className="space-y-3">
            {recipe.ingredients.map((ing, i) => (
              <li key={i} className="flex items-start gap-3 text-gray-600">
                <div className="mt-1.5 w-1.5 h-1.5 bg-gray-300 rounded-full shrink-0" />
                <span className="leading-relaxed">{ing}</span>
              </li>
            ))}
            {recipe.missingIngredients.length > 0 && (
                 <li className="mt-4 pt-4 border-t border-dashed border-gray-200">
                    <span className="text-sm font-bold text-orange-500 block mb-2">Missing / To Buy:</span>
                    {recipe.missingIngredients.map((ing, i) => (
                         <div key={`missing-${i}`} className="flex items-start gap-3 text-gray-400 mb-2">
                            <div className="mt-1.5 w-1.5 h-1.5 bg-orange-200 rounded-full shrink-0" />
                            <span className="leading-relaxed italic">{ing}</span>
                        </div>
                    ))}
                 </li>
            )}
          </ul>
        </div>

        {/* Instructions */}
        <div className="mb-8">
            <h3 className="font-bold text-xl mb-4 flex items-center gap-2 text-gray-800">
                <span className="w-1 h-6 bg-secondary rounded-full"></span>
                Instructions
            </h3>
            <div className="space-y-6">
                {recipe.instructions.map((step, i) => (
                <div key={i} className="flex gap-4">
                    <span className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-sm font-bold text-gray-500">
                        {i + 1}
                    </span>
                    <p className="text-gray-600 leading-relaxed pt-1 text-sm">{step}</p>
                </div>
                ))}
            </div>
        </div>

        {/* Integrated Cooking Mode Button - Moved here after instructions */}
        <button 
          onClick={() => setCookingMode(true)}
          className="w-full py-4 bg-primary text-white rounded-2xl font-bold shadow-lg shadow-primary/20 flex items-center justify-center gap-3 hover:bg-emerald-600 transition-all active:scale-[0.98] mb-10"
        >
          <div className="bg-white/20 p-1 rounded-full">
            <Icons.Play className="w-5 h-5 fill-current" /> 
          </div>
          <span>Start Cooking Mode</span>
        </button>
      </div>
    </div>
  );
};