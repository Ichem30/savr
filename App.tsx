
import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { UserProfile, Ingredient, Recipe, ViewState } from './types';
import { Auth } from './views/Auth';
import { Onboarding } from './views/Onboarding';
import { Pantry } from './views/Pantry';
import { RecipeFeed } from './views/RecipeFeed';
import { RecipeDetail } from './views/RecipeDetail';
import { Profile } from './views/Profile';
import { Icons } from './components/Icons';
import { generateRecipes } from './services/geminiService';
import { ChatAssistant } from './components/ChatAssistant';
import { 
  auth, 
  subscribeToProfile, 
  subscribeToPantry, 
  saveUserProfile, 
  addPantryItem, 
  deletePantryItem, 
  updatePantryItem 
} from './services/firebase';

const App: React.FC = () => {
  // Start in 'auth' view by default
  const [view, setView] = useState<ViewState>('auth');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [pantry, setPantry] = useState<Ingredient[]>([]);
  
  const [generatedRecipes, setGeneratedRecipes] = useState<Recipe[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

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

    return () => {
      unsubProfile();
      unsubPantry();
    };
  }, [currentUser, view]); // Added view dependency to help with the smart redirect logic

  const handleOnboardingComplete = async (profile: UserProfile) => {
    if (!currentUser) {
        // Safety net: if for some reason user is null here
        try {
            const { signInGoogle } = await import('./services/firebase');
            await signInGoogle();
            return;
        } catch(e) {
             alert("Please sign in to save your profile.");
             return;
        }
    }
    
    // Check if we are editing an existing profile or creating a new one
    const wasEditing = view === 'edit-profile';

    // Append weight history if weight changed or if it's new
    let updatedProfile = { ...profile };
    if (updatedProfile.weight) {
         const today = new Date().toISOString().split('T')[0];
         const history = userProfile?.weightHistory || [];
         const lastEntry = history[history.length - 1];
         
         if (!lastEntry || lastEntry.date !== today || lastEntry.weight !== updatedProfile.weight) {
             updatedProfile.weightHistory = [...history, { date: today, weight: updatedProfile.weight }];
         } else {
             updatedProfile.weightHistory = history;
         }
    }

    await saveUserProfile(currentUser.uid, updatedProfile);
    
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
      alert("Please select at least one ingredient!");
      return;
    }

    setLoading(true);
    setView('recipes');
    try {
      const recipes = await generateRecipes(userProfile, selectedIngredients, strictMode, options);
      setGeneratedRecipes(recipes);
    } catch (error) {
      console.error(error);
      alert("Failed to generate recipes. Please try again.");
      setView('pantry');
    } finally {
      setLoading(false);
    }
  };

  const handleRecipeSelect = (recipe: Recipe) => {
    setSelectedRecipe(recipe);
    setView('recipe-detail');
  };

  // New Logic for saving the FULL profile from the Profile View
  const handleSaveProfile = async (updatedProfile: UserProfile) => {
    if (!currentUser || !userProfile) return;

    // Handle Weight History Logic
    let finalProfile = { ...updatedProfile };
    
    // If weight changed, append to history
    if (finalProfile.weight !== userProfile.weight) {
         const today = new Date().toISOString().split('T')[0];
         const history = userProfile.weightHistory || [];
         const lastEntry = history[history.length - 1];
         
         // Avoid duplicate entries for the same day unless weight really changed
         if (!lastEntry || lastEntry.date !== today || lastEntry.weight !== finalProfile.weight) {
             finalProfile.weightHistory = [...history, { date: today, weight: finalProfile.weight }];
         }
    } else {
        // Ensure history isn't lost if the user object didn't have it fully populated
        finalProfile.weightHistory = userProfile.weightHistory;
    }

    await saveUserProfile(currentUser.uid, finalProfile);
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
     } else {
        const newItem: Ingredient = {
            id: Date.now().toString(),
            name: name.trim(),
            quantity: quantity,
            isSelected: true,
            isScanned: false
        };
        await addPantryItem(currentUser.uid, newItem);
     }
  };

  const onPantryAdd = async (item: Ingredient) => {
    if (!currentUser) return;
    await addPantryItem(currentUser.uid, item);
  };

  const onPantryUpdate = async (item: Ingredient) => {
    if (!currentUser) return;
    await updatePantryItem(currentUser.uid, item.id, item);
  };

  const onPantryRemove = async (id: string) => {
    if (!currentUser) return;
    await deletePantryItem(currentUser.uid, id);
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
              // If AI tries to 'set' an allergy, we assume it replaces the list OR adds it if list was empty?
              // Safer to just add it to be robust, or replace if it's a list
              if (Array.isArray(finalValue)) {
                  updatedProfile = { ...updatedProfile, [field]: finalValue };
              } else {
                  updatedProfile = { ...updatedProfile, [field]: [...currentList, finalValue] };
              }
          }
      } 
      // SCALAR FIELDS (Name, Height, Weight, Age, Goal)
      else {
          // For scalar fields, 'add' or 'set' implies replacing the value
          updatedProfile = { ...updatedProfile, [field]: finalValue };
      }
      
      await handleSaveProfile(updatedProfile);
  };

  // Bottom Navigation Bar
  const NavBar = () => {
    if (view === 'auth' || view === 'onboarding' || view === 'edit-profile' || view === 'recipe-detail' || view === 'cooking-mode') return null;
    const navItemClass = (isActive: boolean) => 
      `flex flex-col items-center justify-center w-full py-2 transition-colors ${isActive ? 'text-primary font-bold' : 'text-gray-400'}`;

    return (
      <div className="bg-white border-t border-gray-200 pb-safe pt-2 px-8 flex justify-between items-end h-20 z-20 relative">
        <button onClick={() => setView('pantry')} className={`${navItemClass(view === 'pantry')} pb-3`}>
          <Icons.Refrigerator size={24} />
          <span className="text-[10px] font-medium mt-1">Pantry</span>
        </button>
        <button 
          onClick={() => {
            if (generatedRecipes.length > 0) setView('recipes');
            else if (pantry.length > 0) handleGenerateRecipes();
            else setView('pantry');
          }} 
          className="bg-primary text-white p-4 rounded-full -mt-10 mb-5 shadow-lg shadow-primary/40 active:scale-95 transition-transform z-30"
        >
          <Icons.ChefHat size={28} />
        </button>
        <button onClick={() => setView('profile')} className={`${navItemClass(view === 'profile')} pb-3`}>
          <Icons.User size={24} />
          <span className="text-[10px] font-medium mt-1">Profile</span>
        </button>
      </div>
    );
  };

  if (authLoading) {
    return <div className="h-screen w-full flex items-center justify-center bg-gray-50 text-primary"><Icons.ChefHat className="animate-bounce w-10 h-10" /></div>;
  }

  return (
    <div className="bg-gray-200 min-h-screen flex justify-center font-sans">
      <div className="w-full max-w-[400px] sm:h-[850px] sm:my-auto bg-white sm:rounded-[3rem] sm:border-8 sm:border-gray-900 h-screen shadow-2xl overflow-hidden flex flex-col relative">
        <div className="h-6 w-full bg-transparent absolute top-0 z-50 sm:block hidden" />
        
        {/* Invisible Recaptcha Container for Phone Auth */}
        <div id="recaptcha-container"></div>

        <main className="flex-1 overflow-hidden relative bg-gray-50">
          {view === 'auth' && <Auth onSkip={() => setView('onboarding')} currentUser={currentUser} />}
          
          {view === 'onboarding' && <Onboarding onComplete={handleOnboardingComplete} />}
          
          {/* edit-profile view state is technically deprecated by the new inline editing but kept if needed for edge cases */}
          {view === 'edit-profile' && userProfile && (
              <Onboarding 
                onComplete={handleOnboardingComplete} 
                initialData={userProfile} 
              />
          )}
          
          {view === 'pantry' && (
            <Pantry 
              pantry={pantry} 
              onGenerate={handleGenerateRecipes}
              onAdd={onPantryAdd}
              onUpdate={onPantryUpdate}
              onRemove={onPantryRemove}
            />
          )}
          
          {view === 'recipes' && (
            <RecipeFeed 
              recipes={generatedRecipes} 
              loading={loading} 
              onSelectRecipe={handleRecipeSelect}
              onBack={() => setView('pantry')}
            />
          )}

          {view === 'recipe-detail' && selectedRecipe && (
            <RecipeDetail 
              recipe={selectedRecipe} 
              onBack={() => setView('recipes')} 
            />
          )}

          {view === 'profile' && userProfile && (
             <Profile user={userProfile} onSave={handleSaveProfile} />
          )}
        </main>

        <NavBar />

        {view !== 'auth' && view !== 'onboarding' && view !== 'edit-profile' && (
            <ChatAssistant 
                user={userProfile} 
                pantry={pantry}
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
    </div>
  );
};

export default App;
