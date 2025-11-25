import React, { useState, useEffect, useRef } from 'react';
import { Recipe } from '../types';
import { Icons } from '../components/Icons';
import { motion, AnimatePresence } from 'framer-motion';

interface RecipeDetailProps {
  recipe: Recipe;
  onBack: () => void;
}

const StepTimer = ({ duration, onComplete }: { duration: number, onComplete?: () => void }) => {
    const [timeLeft, setTimeLeft] = useState(duration * 60);
    const [isActive, setIsActive] = useState(false);
    
    useEffect(() => {
        let interval: any;
        if (isActive && timeLeft > 0) {
            interval = setInterval(() => {
                setTimeLeft((prev) => prev - 1);
            }, 1000);
        } else if (timeLeft === 0) {
            setIsActive(false);
            if (onComplete) onComplete();
        }
        return () => clearInterval(interval);
    }, [isActive, timeLeft, onComplete]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    return (
        <div className="mt-4 bg-gray-900/50 rounded-xl p-3 flex items-center justify-between border border-gray-600">
            <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${isActive ? 'bg-primary text-white animate-pulse' : 'bg-gray-700 text-gray-400'}`}>
                    <Icons.Clock size={18} />
                </div>
                <div>
                    <span className="block text-xs text-gray-400 font-bold uppercase tracking-wider">Timer</span>
                    <span className="font-mono text-xl font-bold text-white">{formatTime(timeLeft)}</span>
                </div>
            </div>
            <button 
                onClick={() => setIsActive(!isActive)}
                className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${isActive ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-primary text-white hover:bg-primary/90'}`}
            >
                {isActive ? 'Pause' : 'Start'}
            </button>
        </div>
    );
};

const RichInstruction = ({ text }: { text: string }) => {
    // Extract time duration if present (e.g. "10 minutes", "5 min")
    const timeMatch = text.match(/(\d+)\s*(minutes|minute|min|mins)/i);
    const duration = timeMatch ? parseInt(timeMatch[1]) : null;

    // Highlight temperatures and times
    const parts = text.split(/(\d+\s*(?:minutes|minute|min|mins|hours|hour|hr|hrs|°C|°F))/gi);

    return (
        <div className="text-left w-full">
             <p className="text-xl md:text-2xl font-medium leading-relaxed text-gray-200">
                {parts.map((part, i) => {
                    if (part.match(/\d+\s*(?:minutes|minute|min|mins|hours|hour|hr|hrs|°C|°F)/i)) {
                        return <span key={i} className="font-bold text-primary">{part}</span>;
                    }
                    return <span key={i}>{part}</span>;
                })}
             </p>
             
             {duration && duration > 0 && (
                 <StepTimer duration={duration} />
             )}
        </div>
    );
};

export const RecipeDetail: React.FC<RecipeDetailProps> = ({ recipe, onBack }) => {
  const [cookingMode, setCookingMode] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [showIngredients, setShowIngredients] = useState(false);

  if (cookingMode) {
    const progress = ((currentStep + 1) / recipe.instructions.length) * 100;

    return (
      <div className="h-full bg-gray-900 text-white flex flex-col relative overflow-hidden">
        {/* Progress Bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gray-800 z-20">
          <motion.div 
            className="h-full bg-gradient-to-r from-primary to-emerald-400"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>

        {/* Header */}
        <div className="p-6 pt-8 flex items-center justify-between z-10">
           <button onClick={() => setCookingMode(false)} className="p-2.5 bg-gray-800/50 backdrop-blur rounded-full hover:bg-gray-700 text-gray-400 hover:text-white transition-colors">
            <Icons.X className="w-5 h-5" />
          </button>
          
          <div className="flex flex-col items-center">
             <span className="text-xs font-bold text-primary tracking-wider uppercase mb-0.5">Cooking Mode</span>
             <span className="font-bold text-white text-lg">Step {currentStep + 1} <span className="text-gray-600 text-sm font-normal">/ {recipe.instructions.length}</span></span>
          </div>

          <button 
            onClick={() => setShowIngredients(!showIngredients)}
            className={`p-2.5 rounded-full transition-colors ${showIngredients ? 'bg-primary text-white' : 'bg-gray-800/50 backdrop-blur text-gray-400 hover:text-white'}`}
          >
            <Icons.List className="w-5 h-5" />
          </button>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col justify-center px-6 py-2 relative z-0 overflow-y-auto no-scrollbar">
          {/* Background blurred decorative elements */}
          <div className="absolute top-1/4 -left-10 w-64 h-64 bg-primary/10 rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute bottom-1/4 -right-10 w-64 h-64 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />

          <AnimatePresence mode="wait" custom={currentStep}>
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.4, ease: "circOut" }}
              className="w-full max-w-md mx-auto"
            >
                <div className="relative bg-gray-800/40 backdrop-blur-md border border-gray-700/50 p-8 rounded-3xl shadow-2xl overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-primary to-transparent opacity-50" />
                    
                    <div className="mb-4 flex items-center gap-3 text-gray-400 text-sm font-medium uppercase tracking-widest">
                        <span className="w-8 h-[1px] bg-gray-600"></span>
                        Instruction
                    </div>
                    
                    <RichInstruction text={recipe.instructions[currentStep]} />

                    {currentStep === recipe.instructions.length - 1 && (
                        <motion.div 
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        className="mt-8 p-4 bg-gradient-to-r from-emerald-500/20 to-primary/20 border border-emerald-500/30 rounded-xl text-emerald-300 flex items-center justify-center gap-3"
                        >
                        <div className="p-1.5 bg-emerald-500 rounded-full text-white shadow-lg shadow-emerald-500/20"><Icons.Check className="w-4 h-4" strokeWidth={3} /></div>
                        <span className="font-bold tracking-wide">Final Step! Bon Appétit!</span>
                        </motion.div>
                    )}
                </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Bottom Controls */}
        <div className="p-8 pb-10 flex gap-6 z-10 items-stretch bg-gradient-to-t from-gray-900 via-gray-900/90 to-transparent pt-10">
          <motion.button 
            whileTap={{ scale: 0.95 }}
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
            className="w-16 h-16 rounded-full bg-gray-800 border border-gray-700 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-gray-300 hover:bg-gray-700 hover:text-white hover:border-gray-600 transition-all shrink-0"
          >
            <Icons.ArrowLeft className="w-6 h-6" />
          </motion.button>
          
           <motion.button 
            whileTap={{ scale: 0.98 }}
            onClick={() => {
                if (currentStep < recipe.instructions.length - 1) {
                    setCurrentStep(currentStep + 1);
                } else {
                    setCookingMode(false);
                }
            }}
            className={`flex-1 rounded-2xl font-bold text-lg shadow-lg flex items-center justify-center gap-3 transition-all
                ${currentStep === recipe.instructions.length - 1 
                    ? 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-emerald-500/25' 
                    : 'bg-gradient-to-r from-primary to-emerald-600 text-white hover:shadow-xl shadow-primary/25'
                }
            `}
          >
            {currentStep === recipe.instructions.length - 1 ? (
                <>Finish Cooking <Icons.Check className="w-5 h-5" /></>
            ) : (
                <>Next Step <Icons.ArrowRight className="w-5 h-5" /></>
            )}
          </motion.button>
        </div>

        {/* Ingredients Drawer (Overlay) */}
        <AnimatePresence>
            {showIngredients && (
                <>
                    <motion.div 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        onClick={() => setShowIngredients(false)}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm z-30"
                    />
                    <motion.div 
                        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="absolute bottom-0 left-0 right-0 bg-gray-800 rounded-t-3xl z-40 max-h-[70%] flex flex-col border-t border-gray-700 shadow-2xl"
                    >
                        <div className="p-4 border-b border-gray-700 flex justify-between items-center">
                            <h3 className="font-bold text-white flex items-center gap-2">
                                <Icons.ShoppingBag className="text-primary" size={20} /> Ingredients
                            </h3>
                            <button onClick={() => setShowIngredients(false)} className="p-2 hover:bg-gray-700 rounded-full text-gray-400">
                                <Icons.ChevronDown size={20} />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto space-y-3">
                            {recipe.ingredients.map((ing, i) => (
                                <div key={i} className="flex items-start gap-3 text-gray-300 p-3 bg-gray-700/30 rounded-xl border border-gray-700/50">
                                    <div className="mt-1.5 w-1.5 h-1.5 bg-primary rounded-full shrink-0" />
                                    <span className="leading-relaxed font-medium">{ing}</span>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white overflow-y-auto no-scrollbar relative">
      {/* Header */}
      <motion.div 
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="sticky top-0 bg-white/90 backdrop-blur-md p-4 flex items-center gap-3 border-b border-gray-100 z-20"
      >
        <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <Icons.ArrowLeft size={20} className="text-gray-700" />
        </button>
        <h2 className="font-bold text-lg truncate flex-1 text-gray-800">{recipe.title}</h2>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="p-6 pb-12"
      >
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

        {/* Macros Grid */}
        <div className="grid grid-cols-4 gap-2 mb-8">
            <motion.div whileHover={{ y: -2 }} className="bg-orange-50 p-3 rounded-xl text-center border border-orange-100">
                <span className="block text-[10px] text-gray-500 uppercase font-bold mb-1">Cals</span>
                <span className="font-bold text-orange-600 text-sm sm:text-base">{recipe.calories}</span>
            </motion.div>
            <motion.div whileHover={{ y: -2 }} className="bg-blue-50 p-3 rounded-xl text-center border border-blue-100">
                <span className="block text-[10px] text-gray-500 uppercase font-bold mb-1">Prot</span>
                <span className="font-bold text-blue-600 text-sm sm:text-base">{recipe.macros.protein}</span>
            </motion.div>
            <motion.div whileHover={{ y: -2 }} className="bg-green-50 p-3 rounded-xl text-center border border-green-100">
                <span className="block text-[10px] text-gray-500 uppercase font-bold mb-1">Carb</span>
                <span className="font-bold text-green-600 text-sm sm:text-base">{recipe.macros.carbs}</span>
            </motion.div>
            <motion.div whileHover={{ y: -2 }} className="bg-yellow-50 p-3 rounded-xl text-center border border-yellow-100">
                <span className="block text-[10px] text-gray-500 uppercase font-bold mb-1">Fat</span>
                <span className="font-bold text-yellow-600 text-sm sm:text-base">{recipe.macros.fats}</span>
            </motion.div>
        </div>

        {/* Ingredients List */}
        <div className="mb-8">
          <h3 className="font-bold text-xl mb-4 flex items-center gap-2 text-gray-800">
            <span className="w-1 h-6 bg-primary rounded-full"></span>
            Ingredients
          </h3>
          <ul className="space-y-3">
            {recipe.ingredients.map((ing, i) => (
              <motion.li 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + (i * 0.05) }}
                key={i} 
                className="flex items-start gap-3 text-gray-600"
              >
                <div className="mt-1.5 w-1.5 h-1.5 bg-gray-300 rounded-full shrink-0" />
                <span className="leading-relaxed">{ing}</span>
              </motion.li>
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
                <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.2 }}
                    key={i} 
                    className="flex gap-4"
                >
                    <span className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-sm font-bold text-gray-500">
                        {i + 1}
                    </span>
                    <p className="text-gray-600 leading-relaxed pt-1 text-sm">{step}</p>
                </motion.div>
                ))}
            </div>
        </div>

        {/* Integrated Cooking Mode Button - Moved here after instructions */}
        <motion.button 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.5 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setCookingMode(true)}
          className="w-full py-4 bg-primary text-white rounded-2xl font-bold shadow-lg shadow-primary/20 flex items-center justify-center gap-3 hover:bg-emerald-600 transition-all mb-10"
        >
          <div className="bg-white/20 p-1 rounded-full">
            <Icons.Play className="w-5 h-5 fill-current" /> 
          </div>
          <span>Start Cooking Mode</span>
        </motion.button>
      </motion.div>
    </div>
  );
};
