import { initializeApp } from "firebase/app";
import { getFunctions, httpsCallable } from "firebase/functions";
import { 
  getAuth, 
  signInAnonymously, 
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  OAuthProvider,
  signOut,
  onAuthStateChanged, 
  User,
  linkWithPopup,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
  sendEmailVerification
} from "firebase/auth";
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  addDoc, 
  deleteDoc, 
  updateDoc, 
  onSnapshot,
  query,
  orderBy,
  limit,
  getDocs
} from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { UserProfile, Ingredient, Recipe } from "../types";

// --- CONFIGURATION ---
// Access env safely via import.meta.env provided by Vite
const env = import.meta.env;

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID
};

// Validate config to help debug missing .env issues
if (!firebaseConfig.apiKey) {
  console.error("Firebase API Key is missing. Make sure you have a .env file with VITE_FIREBASE_API_KEY.");
}

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// --- Helpers for Storage ---
export const uploadProfileImage = async (uid: string, file: File) => {
    const storageRef = ref(storage, `users/${uid}/profile/${file.name}`);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
};


// --- Auth Helpers ---

export const signInGuest = async () => {
  try {
    await signInAnonymously(auth);
  } catch (error: any) {
    if (error.code === 'auth/admin-restricted-operation') {
      console.warn("Anonymous Authentication is disabled in Firebase Console. Users will need to sign in with Google.");
      throw error;
    } else {
      console.error("Error signing in anonymously:", error);
      throw error;
    }
  }
};

export const registerWithEmail = async (email: string, pass: string) => {
  return await createUserWithEmailAndPassword(auth, email, pass);
};

export const loginWithEmail = async (email: string, pass: string) => {
  return await signInWithEmailAndPassword(auth, email, pass);
};

export const sendVerificationEmail = async () => {
  if (auth.currentUser) {
    await sendEmailVerification(auth.currentUser);
  }
};

export const reloadCurrentUser = async () => {
  if (auth.currentUser) {
    await auth.currentUser.reload();
    return auth.currentUser;
  }
  return null;
};

export const signInGoogle = async () => {
  const provider = new GoogleAuthProvider();
  try {
    // If user is anonymous, try to link the account
    if (auth.currentUser && auth.currentUser.isAnonymous) {
      try {
        await linkWithPopup(auth.currentUser, provider);
        return;
      } catch (linkError: any) {
        if (linkError.code === 'auth/credential-already-in-use') {
           // If the email is already used, we must sign out and sign in
           await signOut(auth);
           await signInWithPopup(auth, provider);
        } else {
           throw linkError;
        }
      }
    } else {
      await signInWithPopup(auth, provider);
    }
  } catch (error) {
    console.error("Error signing in with Google:", error);
    throw error;
  }
};

export const signInApple = async () => {
  const provider = new OAuthProvider('apple.com');
  try {
    await signInWithPopup(auth, provider);
  } catch (error) {
    console.error("Error signing in with Apple:", error);
    throw error;
  }
};

// Phone Auth
export const setupRecaptcha = (containerId: string) => {
  if (!(window as any).recaptchaVerifier) {
    (window as any).recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
      'size': 'invisible',
      'callback': () => {
        // reCAPTCHA solved, allow signInWithPhoneNumber.
      }
    });
  }
  return (window as any).recaptchaVerifier;
};

export const signInPhone = async (phoneNumber: string) => {
  const verifier = setupRecaptcha('recaptcha-container');
  return await signInWithPhoneNumber(auth, phoneNumber, verifier);
};

export const logOut = async () => {
  await signOut(auth);
};

// --- User Profile ---

export const subscribeToProfile = (uid: string, callback: (profile: UserProfile | null) => void) => {
  return onSnapshot(doc(db, "users", uid), (docSnap) => {
    if (docSnap.exists()) {
      callback(docSnap.data() as UserProfile);
    } else {
      callback(null);
    }
  }, (error) => {
    console.error("Profile Subscription Error:", error);
    if (error.code === 'permission-denied') {
        console.error("CHECK YOUR FIRESTORE RULES: You are in Production Mode but haven't allowed read access.");
    }
  });
};

export const saveUserProfile = async (uid: string, profile: UserProfile) => {
  await setDoc(doc(db, "users", uid), profile, { merge: true });
};

// --- Pantry ---

export const subscribeToPantry = (uid: string, callback: (pantry: Ingredient[]) => void) => {
  const q = query(collection(db, "users", uid, "pantry"), orderBy("id", "desc"));
  return onSnapshot(q, (querySnapshot) => {
    const items: Ingredient[] = [];
    querySnapshot.forEach((doc) => {
      items.push({ ...doc.data(), id: doc.id } as Ingredient);
    });
    callback(items);
  }, (error) => {
    console.error("Pantry Subscription Error:", error);
  });
};

export const addPantryItem = async (uid: string, item: Ingredient) => {
  await addDoc(collection(db, "users", uid, "pantry"), item);
};

export const updatePantryItem = async (uid: string, itemId: string, data: Partial<Ingredient>) => {
  const itemRef = doc(db, "users", uid, "pantry", itemId);
  await updateDoc(itemRef, data);
};

export const deletePantryItem = async (uid: string, itemId: string) => {
  await deleteDoc(doc(db, "users", uid, "pantry", itemId));
};

// --- Recipes ---

export const subscribeToSavedRecipes = (uid: string, callback: (recipes: Recipe[]) => void) => {
  const q = query(collection(db, "users", uid, "recipes")); // OrderBy removed if 'id' is just random string, or add orderBy timestamp if added
  return onSnapshot(q, (querySnapshot) => {
    const recipes: Recipe[] = [];
    querySnapshot.forEach((doc) => {
      recipes.push({ ...doc.data(), id: doc.id } as Recipe);
    });
    callback(recipes);
  }, (error) => {
      console.error("Recipe Subscription Error:", error);
  });
};

export const saveRecipe = async (uid: string, recipe: Recipe) => {
  // We remove the 'id' if it exists to let Firestore generate one, or use setDoc if we want to preserve ID
  const { id, ...recipeData } = recipe;
  await addDoc(collection(db, "users", uid, "recipes"), recipeData);
};

export const deleteSavedRecipe = async (uid: string, recipeId: string) => {
    await deleteDoc(doc(db, "users", uid, "recipes", recipeId));
};

// --- Backend functions ---
const functions = getFunctions(app);

export const generateRecipesCloud = async (userProfile: any, ingredients: any[], strictMode: boolean) => {
  const generateFn = httpsCallable(functions, 'generateRecipes');
  const result = await generateFn({ userProfile, ingredients, strictMode });
  return result.data;
};

// --- Journal / Daily Logs ---

export const subscribeToDailyLog = (uid: string, date: string, callback: (log: any) => void) => {
  const docRef = doc(db, "users", uid, "daily_logs", date);
  return onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      callback(docSnap.data());
    } else {
      callback({
        date,
        consumed: 0,
        burned: 0,
        water: 0,
        meals: [],
      });
    }
  });
};

export const addMealToLog = async (uid: string, date: string, meal: any) => {
  const docRef = doc(db, "users", uid, "daily_logs", date);
  const docSnap = await getDoc(docRef);
  
  if (docSnap.exists()) {
    const data = docSnap.data();
    const updatedMeals = [...(data.meals || []), meal];
    const totalCals = updatedMeals.reduce((acc: number, m: any) => acc + m.calories, 0);
    
    const totalMacros = updatedMeals.reduce((acc: any, m: any) => ({
        carbs: acc.carbs + (m.macros?.carbs || 0),
        protein: acc.protein + (m.macros?.protein || 0),
        fats: acc.fats + (m.macros?.fats || 0)
    }), { carbs: 0, protein: 0, fats: 0 });

    await updateDoc(docRef, {
      meals: updatedMeals,
      consumed: totalCals,
      macros: {
          carbs: { current: totalMacros.carbs, target: 0 },
          protein: { current: totalMacros.protein, target: 0 },
          fats: { current: totalMacros.fats, target: 0 }
      }
    });
  } else {
    await setDoc(docRef, {
      date,
      meals: [meal],
      consumed: meal.calories,
      burned: 0,
      water: 0,
      macros: {
          carbs: { current: meal.macros?.carbs || 0, target: 0 },
          protein: { current: meal.macros?.protein || 0, target: 0 },
          fats: { current: meal.macros?.fats || 0, target: 0 }
      }
    });
    await updateStreak(uid, date);
  }
};

export const updateMealInLog = async (uid: string, date: string, meal: any) => {
    const docRef = doc(db, "users", uid, "daily_logs", date);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
        const data = docSnap.data();
        const updatedMeals = (data.meals || []).map((m: any) => 
            m.id === meal.id ? meal : m
        );
        const totalCals = updatedMeals.reduce((acc: number, m: any) => acc + m.calories, 0);
        
        const totalMacros = updatedMeals.reduce((acc: any, m: any) => ({
            carbs: acc.carbs + (m.macros?.carbs || 0),
            protein: acc.protein + (m.macros?.protein || 0),
            fats: acc.fats + (m.macros?.fats || 0)
        }), { carbs: 0, protein: 0, fats: 0 });

        await updateDoc(docRef, {
            meals: updatedMeals,
            consumed: totalCals,
            macros: {
                carbs: { current: totalMacros.carbs, target: 0 },
                protein: { current: totalMacros.protein, target: 0 },
                fats: { current: totalMacros.fats, target: 0 }
            }
        });
    }
};

export const deleteMealFromLog = async (uid: string, date: string, mealId: string) => {
    const docRef = doc(db, "users", uid, "daily_logs", date);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
        const data = docSnap.data();
        const updatedMeals = (data.meals || []).filter((m: any) => m.id !== mealId);
        const totalCals = updatedMeals.reduce((acc: number, m: any) => acc + m.calories, 0);
        
        const totalMacros = updatedMeals.reduce((acc: any, m: any) => ({
            carbs: acc.carbs + (m.macros?.carbs || 0),
            protein: acc.protein + (m.macros?.protein || 0),
            fats: acc.fats + (m.macros?.fats || 0)
        }), { carbs: 0, protein: 0, fats: 0 });

        await updateDoc(docRef, {
            meals: updatedMeals,
            consumed: totalCals,
            macros: {
                carbs: { current: totalMacros.carbs, target: 0 },
                protein: { current: totalMacros.protein, target: 0 },
                fats: { current: totalMacros.fats, target: 0 }
            }
        });
    }
};

export const updateWaterLog = async (uid: string, date: string, amount: number) => {
    const docRef = doc(db, "users", uid, "daily_logs", date);
    await setDoc(docRef, { water: amount, date }, { merge: true });
    await updateStreak(uid, date);
};

const updateStreak = async (uid: string, logDate: string) => {
    const userRef = doc(db, "users", uid);
    const userSnap = await getDoc(userRef);
    if(!userSnap.exists()) return;
    
    const userData = userSnap.data() as UserProfile;
    const currentStreak = userData.streak?.current || 0;
    const lastLogDate = userData.streak?.lastLogDate || "";
    
    const today = new Date().toISOString().split('T')[0];
    if (logDate !== today) return; 
    
    if (lastLogDate === today) return; 
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    let newStreak = 1;
    if (lastLogDate === yesterdayStr) {
        newStreak = currentStreak + 1;
    }
    
    await updateDoc(userRef, {
        streak: {
            current: newStreak,
            lastLogDate: today
        }
    });
};

// --- Global Food Cache ---

export const saveFoodToCache = async (uid: string, product: any) => {
    // Use barcode as ID if available, else create unique based on name/time
    const docId = product.id && product.id.length > 5 ? product.id : `gen_${Date.now()}`;
    await setDoc(doc(db, "users", uid, "saved_foods", docId), product, { merge: true });
};

export const searchCachedFoods = async (uid: string, queryStr: string) => {
    // Fetch recent items and filter locally
    const q = query(collection(db, "users", uid, "saved_foods"), limit(50));
    const snapshot = await getDocs(q);
    const results: any[] = [];
    const lowerQuery = queryStr.toLowerCase();
    
    snapshot.forEach(doc => {
        const data = doc.data();
        if (data.product_name && data.product_name.toLowerCase().includes(lowerQuery)) {
            results.push({ ...data, id: doc.id });
        }
    });
    return results;
};