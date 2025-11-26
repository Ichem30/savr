import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { UserProfile, Ingredient, Recipe, ViewState, DailyLog } from './types';
import { Auth } from './views/Auth';
import { Onboarding } from './views/Onboarding';
import { Pantry } from './views/Pantry';
import { RecipeFeed } from './views/RecipeFeed';
import { RecipeDetail } from './views/RecipeDetail';
import { Profile } from './views/Profile';
import { Journal } from './views/Journal';
import { Icons } from './components/Icons';
import { generateRecipes } from './services/geminiService';
import { ChatAssistant } from './components/ChatAssistant';
import { AnimatePresence, motion } from 'framer-motion';
import { PageTransition } from './components/PageTransition';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastProvider, useToast } from './components/ToastProvider';
import { 
  auth, 
  subscribeToProfile, 
  subscribeToPantry, 
  saveUserProfile, 
  addPantryItem, 
  deletePantryItem, 
  updatePantryItem,
  subscribeToSavedRecipes,
  saveRecipe,
  deleteSavedRecipe,
  subscribeToDailyLog,
  addMealToLog,
  updateWaterLog
} from './services/firebase';

import { RecipeFilter } from './views/RecipeFilter';

// Helper for updating weight history
const updateWeightHistory = (profile: UserProfile, existingHistory: { date: string, weight: number }[] = []): UserProfile => {
    const today = new Date().toISOString().split('T')[0];
    let finalProfile = { ...profile };
    const history = existingHistory;
    const lastEntry = history[history.length - 1];

    // Avoid duplicate entries for the same day unless weight really changed
    if (!lastEntry || lastEntry.date !== today || lastEntry.weight !== finalProfile.weight) {
        finalProfile.weightHistory = [...history, { date: today, weight: finalProfile.weight }];
    } else {
        finalProfile.weightHistory = history;
    }
    return finalProfile;
};

// Helper to calculate missing ingredients and match percentage
const calculateRecipeMatch = (recipe: Recipe, pantry: Ingredient[]): Recipe => {
    const normalize = (s: string) => s.toLowerCase().trim();
    const pantryNames = new Set(pantry.map(p => normalize(p.name)));
    
    // Only consider non-staples if needed, but for now simple name matching
    // We assume recipe.ingredients contains strings like "2 eggs", "100g flour"
    // Ideally, recipes should have structured ingredients, but we have to work with strings from Gemini
    // Simple heuristic: check if any pantry item name appears in the ingredient string
    
    const ingredients = recipe.ingredients;
    const present = [];
    const missing = [];
    
    for (const ing of ingredients) {
        const ingLower = normalize(ing);
        // Check if any pantry item name is a substring of the ingredient
        const isPresent = Array.from(pantryNames).some(pName => ingLower.includes(pName));
        if (isPresent) {
            present.push(ing);
        } else {
            missing.push(ing);
        }
    }
    
    const matchPercentage = Math.round((present.length / ingredients.length) * 100);
    
    return {
        ...recipe,
        missingIngredients: missing,
        matchPercentage: matchPercentage
    };
};

const AppContent: React.FC = () => {
  const { showToast } = useToast();

  // Start in 'auth' view by default
  const [view, setView] = useState<ViewState>('auth');
  const [profileMode, setProfileMode] = useState<'view' | 'edit' | 'goals' | 'calories' | 'nutrition' | 'diet' | 'calorie-distribution' | 'progress'>('view');
  // Track previous view for back navigation logic (especially for RecipeDetail)
  const [lastView, setLastView] = useState<ViewState>('pantry');
  
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [pantry, setPantry] = useState<Ingredient[]>([]);
  const [dailyLog, setDailyLog] = useState<DailyLog | null>(null); // Added
  
  const [generatedRecipes, setGeneratedRecipes] = useState<Recipe[]>([]);
  const [savedRecipes, setSavedRecipes] = useState<Recipe[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [generationContext, setGenerationContext] = useState<{ mealType?: string }>({});
  
  const appConstraintsRef = React.useRef<HTMLDivElement>(null);

  // 1. Handle Authentication
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
      // If no user, we stay on (or go to) 'auth'.
      if (!user) {
        setView('auth');
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 2. Handle Data Subscriptions (Profile & Pantry)
  useEffect(() => {
    if (!currentUser) return;

    // Check for Email Verification (For Password Auth)
    const isEmailAuth = currentUser.providerData.some(p => p.providerId === 'password');
    if (isEmailAuth && !currentUser.emailVerified) {
      setView('auth'); // Force auth view to show verification screen
      return; 
    }

    // Subscribe to Profile
    const unsubProfile = subscribeToProfile(currentUser.uid, (profile) => {
      setUserProfile(profile);
      
      // Smart Redirect:
      // Only redirect if we are currently on 'auth' or 'onboarding' to avoid disrupting user flow.
      // CRITICAL: Do NOT redirect if in 'edit-profile' mode.
      if (view === 'auth' || view === 'onboarding') {
          if (profile && profile.isOnboarded) {
            setView('pantry');
          } else {
            setView('onboarding');
          }
      }
    });

    // Subscribe to Pantry
    const unsubPantry = subscribeToPantry(currentUser.uid, (items) => {
      setPantry(items);
    });

    // Subscribe to Saved Recipes
    const unsubRecipes = subscribeToSavedRecipes(currentUser.uid, (recipes) => {
      setSavedRecipes(recipes);
    });

    // Subscribe to Daily Log (Today)
    const today = new Date().toISOString().split('T')[0];
    const unsubLog = subscribeToDailyLog(currentUser.uid, today, (log) => {
        setDailyLog(log as DailyLog);
    });

    return () => {
      unsubProfile();
      unsubPantry();
      unsubRecipes();
      unsubLog();
    };
  }, [currentUser, view]); // Added view dependency to help with the smart redirect logic

  const handleOnboardingComplete = async (profile: UserProfile, initialPantryItems?: string[]) => {
    if (!currentUser) {
        try {
            const { signInGoogle } = await import('./services/firebase');
            await signInGoogle();
            return;
        } catch(e) {
             showToast("Please sign in to save your profile.", "error");
             return;
        }
    }
    
    const wasEditing = view === 'edit-profile';

    // Use shared helper for weight history
    const updatedProfile = updateWeightHistory(profile, userProfile?.weightHistory || []);

    await saveUserProfile(currentUser.uid, updatedProfile);

    // Handle Initial Pantry Items (Only during onboarding, not editing)
    if (!wasEditing && initialPantryItems && initialPantryItems.length > 0) {
        try {
            const promises = initialPantryItems.map(name => {
                const newItem: Ingredient = {
                    id: Date.now().toString() + Math.random().toString().substr(2, 5),
                    name: name,
                    quantity: '1', 
                    isSelected: true,
                    isScanned: false,
                    unit: 'unit'
                };
                return addPantryItem(currentUser.uid, newItem);
            });
            await Promise.all(promises);
            showToast("Kitchen initialized with staples!", "success");
        } catch (error) {
            console.error("Error adding initial pantry items:", error);
            showToast("Could not add pantry staples.", "warning");
        }
    } else if (!wasEditing) {
        showToast("Profile created successfully!", "success");
    } else {
        showToast("Profile updated!", "success");
    }
    
    if (wasEditing) {
        setView('profile');
    }
  };

  const handleGenerateRecipes = async (
    strictMode: boolean = false, 
    options?: { mealType?: string, timeLimit?: string, skillLevel?: string, equipment?: string }
  ) => {
    if (!userProfile) return;
    
    const selectedIngredients = pantry.filter(i => i.isSelected !== false);

    if (selectedIngredients.length === 0) {
      showToast("Please select at least one ingredient!", "warning");
      return;
    }

    setLoading(true);
    setGenerationContext({ mealType: options?.mealType });
    setView('generated-recipes');
    try {
      const recipes = await generateRecipes(userProfile, selectedIngredients, strictMode, options);
      setGeneratedRecipes(recipes);
      showToast(`Generated ${recipes.length} recipes for you!`, "success");
    } catch (error) {
      console.error(error);
      showToast("Failed to generate recipes. Please try again.", "error");
      setView('pantry');
    } finally {
      setLoading(false);
    }
  };

  const handleRecipeSelect = (recipe: Recipe) => {
    setLastView(view);
    setSelectedRecipe(recipe);
    setView('recipe-detail');
  };

  const handleToggleSaveRecipe = async (recipe: Recipe) => {
      if (!currentUser) return;

      const saved = savedRecipes.find(r => r.title === recipe.title);
      
      if (saved) {
          await deleteSavedRecipe(currentUser.uid, saved.id);
          showToast("Recipe removed from cookbook.", "info");
      } else {
          await saveRecipe(currentUser.uid, recipe);
          showToast("Recipe saved to cookbook!", "success");
      }
  };

  // New Logic for saving the FULL profile from the Profile View
  const handleSaveProfile = async (updatedProfile: UserProfile) => {
    if (!currentUser || !userProfile) return;

    // Use shared helper for weight history
    const finalProfile = updateWeightHistory(updatedProfile, userProfile.weightHistory || []);

    await saveUserProfile(currentUser.uid, finalProfile);
    showToast("Profile saved.", "success");
  };

  // --- Wrapper Functions for Firebase Actions ---

  const handleAddIngredient = async (name: string, quantity?: string) => {
     if (!currentUser) return;
     
     const existingItem = pantry.find(i => i.name.toLowerCase() === name.trim().toLowerCase());
     
     if (existingItem) {
       await updatePantryItem(currentUser.uid, existingItem.id, { 
         quantity: quantity || existingItem.quantity, 
         isSelected: true 
       });
       showToast(`Updated ${existingItem.name}`, "success");
     } else {
        const newItem: Ingredient = {
            id: Date.now().toString(),
            name: name.trim(),
            quantity: quantity,
            isSelected: true,
            isScanned: false
        };
        await addPantryItem(currentUser.uid, newItem);
        showToast(`Added ${name} to pantry`, "success");
     }
  };

  const onPantryAdd = async (item: Ingredient) => {
    if (!currentUser) return;
    
    // Safety check to prevent duplicates if the view layer misses it
    const existingItem = pantry.find(i => i.name.toLowerCase() === item.name.toLowerCase());
    if (existingItem) {
        await updatePantryItem(currentUser.uid, existingItem.id, { 
            quantity: item.quantity || existingItem.quantity, 
            isSelected: true,
            // Merge other fields if new item has better data
            nutrition: item.nutrition || existingItem.nutrition,
            image: item.image || existingItem.image
        });
        showToast(`Updated ${existingItem.name}`, "success");
    } else {
        await addPantryItem(currentUser.uid, item);
        showToast(`Added ${item.name}`, "success");
    }
  };

  const onPantryUpdate = async (item: Ingredient) => {
    if (!currentUser) return;
    await updatePantryItem(currentUser.uid, item.id, item);
  };

  const onPantryRemove = async (id: string) => {
    if (!currentUser) return;
    await deletePantryItem(currentUser.uid, id);
    showToast("Item removed.", "info");
  };

  // This is strictly for the Chat Assistant to make specific field updates
  const handleUpdateProfileSingleField = async (field: string, value: any, action: 'add' | 'remove' | 'set') => {
      if (!currentUser || !userProfile) return;
      
      let updatedProfile = { ...userProfile };

      // Helper to convert string numbers back to numbers for specific fields
      let finalValue = value;
      if ((field === 'weight' || field === 'height' || field === 'age') && typeof value === 'string') {
          finalValue = Number(value);
      }

      // ARRAY FIELDS (Allergies, Dislikes)
      if (field === 'allergies' || field === 'dislikes') {
          const currentList = (updatedProfile as any)[field] as string[] || [];
          if (action === 'add') {
              updatedProfile = { ...updatedProfile, [field]: [...currentList, finalValue] };
          } else if (action === 'remove') {
              updatedProfile = { ...updatedProfile, [field]: currentList.filter((i: string) => i.toLowerCase() !== finalValue.toLowerCase()) };
          } else if (action === 'set') {
              if (Array.isArray(finalValue)) {
                  updatedProfile = { ...updatedProfile, [field]: finalValue };
              } else {
                  updatedProfile = { ...updatedProfile, [field]: [...currentList, finalValue] };
              }
          }
      } 
      // SCALAR FIELDS (Name, Height, Weight, Age, Goal)
      else {
          updatedProfile = { ...updatedProfile, [field]: finalValue };
      }
      
      await handleSaveProfile(updatedProfile);
  };

  // Bottom Navigation Bar
  const NavBar = () => {
    if (view === 'auth' || view === 'onboarding' || view === 'edit-profile' || view === 'recipe-detail' || view === 'cooking-mode' || isScanning || view === 'recipe-filter' || (view === 'profile' && profileMode !== 'view')) return null;

    return (
      <div className="absolute bottom-6 left-0 right-0 px-6 z-50 flex justify-center pointer-events-none">
        <div className="bg-white/90 backdrop-blur-xl border border-white/40 shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-3xl grid grid-cols-5 items-center p-2 w-full max-w-[360px] pointer-events-auto relative">
            
            {/* Journal Tab */}
            <button 
                onClick={() => setView('journal')}
                className={`flex flex-col items-center justify-center py-2.5 rounded-2xl transition-all duration-300 relative group ${view === 'journal' ? 'text-primary' : 'text-gray-400 hover:text-gray-600'}`}
            >
                <div className={`absolute inset-0 bg-primary/10 rounded-2xl scale-0 transition-transform duration-300 ${view === 'journal' ? 'scale-100' : 'group-hover:scale-50 opacity-0 group-hover:opacity-50'}`} />
                <Icons.Book size={22} strokeWidth={view === 'journal' ? 2.5 : 2} className="relative z-10 transition-transform duration-300 group-active:scale-90" />
                <span className={`text-[9px] font-bold mt-1 relative z-10 transition-opacity duration-300 ${view === 'journal' ? 'opacity-100' : 'opacity-70'}`}>Journal</span>
            </button>

            {/* Pantry Tab */}
            <button 
                onClick={() => setView('pantry')}
                className={`flex flex-col items-center justify-center py-2.5 rounded-2xl transition-all duration-300 relative group ${view === 'pantry' ? 'text-primary' : 'text-gray-400 hover:text-gray-600'}`}
            >
                <div className={`absolute inset-0 bg-primary/10 rounded-2xl scale-0 transition-transform duration-300 ${view === 'pantry' ? 'scale-100' : 'group-hover:scale-50 opacity-0 group-hover:opacity-50'}`} />
                <Icons.Refrigerator size={22} strokeWidth={view === 'pantry' ? 2.5 : 2} className="relative z-10 transition-transform duration-300 group-active:scale-90" />
                <span className={`text-[9px] font-bold mt-1 relative z-10 transition-opacity duration-300 ${view === 'pantry' ? 'opacity-100' : 'opacity-70'}`}>Pantry</span>
            </button>

            {/* Center Space for Floating Button */}
            <div className="relative flex justify-center">
                 <div className="absolute -top-12">
                    <motion.button
                        whileHover={{ scale: 1.05, y: -2 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                            if (pantry.length > 0) setView('recipe-filter');
                            else setView('pantry');
                        }} 
                        className="w-14 h-14 bg-gradient-to-br from-primary to-emerald-600 text-white rounded-full flex items-center justify-center shadow-lg shadow-primary/30 border-4 border-gray-50 relative z-10 overflow-hidden group"
                    >
                        <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <Icons.ChefHat size={26} className="drop-shadow-md" />
                    </motion.button>
                </div>
            </div>

            {/* Recipes Tab (or Saved) */}
            <button 
                onClick={() => setView('recipes')}
                className={`flex flex-col items-center justify-center py-2.5 rounded-2xl transition-all duration-300 relative group ${view === 'recipes' ? 'text-primary' : 'text-gray-400 hover:text-gray-600'}`}
            >
                <div className={`absolute inset-0 bg-primary/10 rounded-2xl scale-0 transition-transform duration-300 ${view === 'recipes' ? 'scale-100' : 'group-hover:scale-50 opacity-0 group-hover:opacity-50'}`} />
                <Icons.Utensils size={22} strokeWidth={view === 'recipes' ? 2.5 : 2} className="relative z-10 transition-transform duration-300 group-active:scale-90" />
                <span className={`text-[9px] font-bold mt-1 relative z-10 transition-opacity duration-300 ${view === 'recipes' ? 'opacity-100' : 'opacity-70'}`}>Recettes</span>
            </button>

            {/* Profile Tab */}
            <button 
                onClick={() => setView('profile')}
                className={`flex flex-col items-center justify-center py-2.5 rounded-2xl transition-all duration-300 relative group ${view === 'profile' ? 'text-primary' : 'text-gray-400 hover:text-gray-600'}`}
            >
                <div className={`absolute inset-0 bg-primary/10 rounded-2xl scale-0 transition-transform duration-300 ${view === 'profile' ? 'scale-100' : 'group-hover:scale-50 opacity-0 group-hover:opacity-50'}`} />
                <Icons.User size={22} strokeWidth={view === 'profile' ? 2.5 : 2} className="relative z-10 transition-transform duration-300 group-active:scale-90" />
                <span className={`text-[9px] font-bold mt-1 relative z-10 transition-opacity duration-300 ${view === 'profile' ? 'opacity-100' : 'opacity-70'}`}>Profile</span>
            </button>

        </div>
      </div>
    );
  };

  if (authLoading) {
    return <div className="h-screen w-full flex items-center justify-center bg-gray-50 text-primary"><Icons.ChefHat className="animate-bounce w-10 h-10" /></div>;
  }

  return (
    <div className="bg-gray-200 min-h-screen flex justify-center font-sans">
      <ErrorBoundary>
      <div ref={appConstraintsRef} className="w-full sm:max-w-[400px] sm:h-[850px] sm:my-auto bg-white sm:rounded-[3rem] sm:border-8 sm:border-gray-900 h-screen shadow-2xl overflow-hidden flex flex-col relative">
        <div className="h-6 w-full bg-transparent absolute top-0 z-50 sm:block hidden" />
        
        {/* Invisible Recaptcha Container for Phone Auth */}
        <div id="recaptcha-container"></div>

        <main className="flex-1 overflow-hidden relative bg-gray-50">
          <AnimatePresence mode="wait">
            {view === 'auth' && (
              <PageTransition key="auth">
                <Auth onSkip={() => setView('onboarding')} currentUser={currentUser} />
              </PageTransition>
            )}
            
            {view === 'onboarding' && (
              <PageTransition key="onboarding">
                <Onboarding onComplete={handleOnboardingComplete} />
              </PageTransition>
            )}
            
            {/* edit-profile view state is technically deprecated by the new inline editing but kept if needed for edge cases */}
            {view === 'edit-profile' && userProfile && (
                <PageTransition key="edit-profile">
                  <Onboarding 
                    onComplete={handleOnboardingComplete} 
                    initialData={userProfile} 
                  />
                </PageTransition>
            )}
            
            {view === 'pantry' && (
              <PageTransition key="pantry">
                <Pantry 
                  pantry={pantry} 
                  onGenerate={() => setView('recipe-filter')}
                  onAdd={onPantryAdd}
                  onUpdate={onPantryUpdate}
                  onRemove={onPantryRemove}
                  isScanning={isScanning}
                  setIsScanning={setIsScanning}
                />
              </PageTransition>
            )}

            {view === 'recipe-filter' && (
              <PageTransition key="recipe-filter">
                <RecipeFilter
                  onGenerate={(strictMode, options) => handleGenerateRecipes(strictMode, options)}
                  onBack={() => setView('pantry')}
                />
              </PageTransition>
            )}
            
            {view === 'recipes' && (
              <PageTransition key="recipes">
                <RecipeFeed 
                  recipes={savedRecipes.map(r => calculateRecipeMatch(r, pantry))} 
                  loading={loading} 
                  onSelectRecipe={handleRecipeSelect}
                  onBack={() => setView('pantry')}
                  savedRecipeTitles={savedRecipes.map(r => r.title)}
                  onToggleSave={handleToggleSaveRecipe}
                  title="My Recipes"
                />
              </PageTransition>
            )}

            {view === 'generated-recipes' && (
              <PageTransition key="generated-recipes">
                <RecipeFeed 
                  recipes={generatedRecipes} 
                  loading={loading} 
                  onSelectRecipe={handleRecipeSelect}
                  onBack={() => setView('pantry')}
                  savedRecipeTitles={savedRecipes.map(r => r.title)}
                  onToggleSave={handleToggleSaveRecipe}
                  title="Suggested Recipes"
                />
              </PageTransition>
            )}

            {view === 'recipe-detail' && selectedRecipe && (
              <PageTransition key="recipe-detail">
                <RecipeDetail 
                  recipe={selectedRecipe} 
                  onBack={() => setView(lastView)} 
                  isSaved={savedRecipes.some(r => r.title === selectedRecipe.title)}
                  onToggleSave={handleToggleSaveRecipe}
                  defaultMealType={generationContext.mealType}
                />
              </PageTransition>
            )}

            {view === 'profile' && userProfile && (
               <PageTransition key="profile">
                 <Profile 
                    user={userProfile} 
                    onSave={handleSaveProfile} 
                    mode={profileMode}
                    onModeChange={setProfileMode}
                    dailyLog={dailyLog} // Pass dailyLog
                 />
               </PageTransition>
            )}

            {view === 'journal' && (
               <PageTransition key="journal">
                 <Journal 
                    user={userProfile} 
                    savedRecipes={savedRecipes} 
                    onNavigate={setView} 
                    initialLogData={dailyLog} // Pass dailyLog as initial data (Journal handles date changes internally)
                 />
               </PageTransition>
            )}
          </AnimatePresence>
        </main>

        <NavBar />

        {view !== 'auth' && view !== 'onboarding' && view !== 'edit-profile' && (
            <ChatAssistant 
                constraintsRef={appConstraintsRef}
                user={userProfile} 
                pantry={pantry}
                savedRecipes={savedRecipes} // Pass saved recipes
                dailyLog={dailyLog} // Pass daily log
                currentView={view}
                onAddIngredient={handleAddIngredient}
                onRemoveIngredient={(name) => {
                   const item = pantry.find(i => i.name.toLowerCase() === name.toLowerCase());
                   if (item && currentUser) deletePantryItem(currentUser.uid, item.id);
                }}
                onUpdateProfile={handleUpdateProfileSingleField}
                onNavigate={setView}
                onGenerateRecipes={handleGenerateRecipes}
            />
        )}
      </div>
      </ErrorBoundary>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <ToastProvider>
        <AppContent />
    </ToastProvider>
  );
};

export default App;
