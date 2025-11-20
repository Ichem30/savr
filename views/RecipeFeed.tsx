import React from 'react';
import { Recipe } from '../types';
import { Icons } from '../components/Icons';
import { RecipeContextMenu } from '../components/RecipeContextMenu';

interface RecipeFeedProps {
  recipes: Recipe[];
  loading: boolean;
  onSelectRecipe: (recipe: Recipe) => void;
  onBack: () => void;
}

export const RecipeFeed: React.FC<RecipeFeedProps> = ({ recipes, loading, onSelectRecipe, onBack }) => {
  if (loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-white p-6 text-center">
         <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-6 animate-pulse">
            <Icons.ChefHat size={32} />
        </div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Thinking...</h2>
        <p className="text-gray-500 max-w-xs mx-auto">Our AI chef is inventing recipes based on your ingredients.</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <div className="bg-white p-4 flex items-center gap-3 shadow-sm z-10">
        <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <Icons.ArrowLeft size={20} className="text-gray-600" />
        </button>
        <h2 className="font-bold text-lg text-gray-800">Suggested for You</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-24">
        {recipes.map(recipe => (
          <RecipeContextMenu 
            key={recipe.id} 
            recipeTitle={recipe.title}
            onViewDetails={() => onSelectRecipe(recipe)}
          >
            <div 
                onClick={() => onSelectRecipe(recipe)}
                className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 active:bg-gray-50 cursor-pointer transition-all"
            >
                <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-lg text-gray-800 leading-tight flex-1 mr-2">{recipe.title}</h3>
                <div className={`text-xs font-bold px-2 py-1 rounded-full whitespace-nowrap ${
                    recipe.matchPercentage > 80 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                }`}>
                    {recipe.matchPercentage}% Match
                </div>
                </div>
                
                <p className="text-gray-500 text-sm line-clamp-2 mb-4">{recipe.description}</p>

                <div className="flex items-center justify-between text-xs text-gray-400">
                    <div className="flex items-center gap-1">
                        <Icons.Clock size={14} />
                        <span>{recipe.prepTime}</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <Icons.Flame size={14} />
                        <span>{recipe.calories} kcal</span>
                    </div>
                    <div className="flex items-center gap-1 text-primary font-medium">
                        <Icons.Leaf size={14} />
                        <span>{recipe.macros.protein} Pro</span>
                    </div>
                </div>
            </div>
          </RecipeContextMenu>
        ))}
      </div>
    </div>
  );
};