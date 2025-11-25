import React from 'react';
import { Recipe } from '../types';
import { Icons } from '../components/Icons';
import { RecipeContextMenu } from '../components/RecipeContextMenu';
import { motion } from 'framer-motion';

interface RecipeFeedProps {
  recipes: Recipe[];
  loading: boolean;
  onSelectRecipe: (recipe: Recipe) => void;
  onBack: () => void;
  savedRecipeTitles?: string[];
  onToggleSave?: (recipe: Recipe) => void;
  title?: string;
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

export const RecipeFeed: React.FC<RecipeFeedProps> = ({ recipes, loading, onSelectRecipe, onBack, savedRecipeTitles = [], onToggleSave, title }) => {
  if (loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-white p-6 text-center">
         <motion.div 
           animate={{ 
             scale: [1, 1.2, 1],
             rotate: [0, 10, -10, 0] 
           }}
           transition={{ 
             duration: 2, 
             repeat: Infinity,
             ease: "easeInOut"
           }}
           className="w-20 h-20 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-6"
         >
            <Icons.ChefHat size={40} />
        </motion.div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Thinking...</h2>
        <p className="text-gray-500 max-w-xs mx-auto">Our AI chef is inventing recipes based on your ingredients.</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <div className="bg-white p-4 flex items-center gap-3 shadow-sm z-10 sticky top-0">
        <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <Icons.ArrowLeft size={20} className="text-gray-600" />
        </button>
        <h2 className="font-bold text-lg text-gray-800">{title || "Suggested for You"}</h2>
      </div>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="flex-1 overflow-y-auto p-4 space-y-4 pb-24"
      >
        {recipes.length === 0 ? (
             <div className="flex flex-col items-center justify-center h-64 text-center text-gray-400">
                <Icons.Book size={48} className="mb-4 opacity-20" />
                <p>No recipes found.</p>
             </div>
        ) : (
            recipes.map(recipe => (
            <motion.div variants={itemVariants} key={recipe.id || recipe.title}>
                <RecipeContextMenu 
                recipeTitle={recipe.title}
                onViewDetails={() => onSelectRecipe(recipe)}
                >
                <motion.div 
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onSelectRecipe(recipe)}
                    className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 active:bg-gray-50 cursor-pointer transition-colors relative overflow-hidden group"
                >
                    {/* Save Button */}
                    {onToggleSave && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onToggleSave(recipe);
                            }}
                            className="absolute top-3 right-3 z-30 p-2 rounded-full bg-white/90 backdrop-blur shadow-sm hover:bg-red-50 transition-all active:scale-90"
                        >
                            <Icons.Heart 
                                size={18} 
                                className={`transition-colors ${savedRecipeTitles.includes(recipe.title) ? "fill-red-500 text-red-500" : "text-gray-400"}`} 
                            />
                        </button>
                    )}

                    {/* Decorative gradient on hover/active could go here */}
                    <div className="absolute top-0 left-0 w-1 h-full bg-primary opacity-0 group-hover:opacity-100 transition-opacity" />

                    <div className="flex justify-between items-start mb-2 pr-10">
                    <h3 className="font-bold text-lg text-gray-800 leading-tight flex-1 mr-2 group-hover:text-primary transition-colors">{recipe.title}</h3>
                    {recipe.matchPercentage > 0 && (
                        <div className={`text-xs font-bold px-2 py-1 rounded-full whitespace-nowrap shadow-sm ${
                            recipe.matchPercentage > 80 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                            {recipe.matchPercentage}% Match
                        </div>
                    )}
                    </div>
                    
                    <p className="text-gray-500 text-sm line-clamp-2 mb-4">{recipe.description}</p>

                    <div className="flex items-center justify-between text-xs text-gray-400 border-t border-gray-50 pt-3">
                        <div className="flex items-center gap-1">
                            <Icons.Clock size={14} />
                            <span>{recipe.prepTime}</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <Icons.Flame size={14} />
                            <span>{recipe.calories} kcal</span>
                        </div>
                        <div className="flex items-center gap-1 text-primary font-medium bg-primary/5 px-2 py-0.5 rounded-md">
                            <Icons.Leaf size={14} />
                            <span>{recipe.macros.protein} Pro</span>
                        </div>
                    </div>
                </motion.div>
                </RecipeContextMenu>
            </motion.div>
            ))
        )}
      </motion.div>
    </div>
  );
};
