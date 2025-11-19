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
  orderBy
} from "firebase/firestore";
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

export const saveRecipe = async (uid: string, recipe: Recipe) => {
  await addDoc(collection(db, "users", uid, "recipes"), recipe);
};

// --- Backend functions ---
const functions = getFunctions(app);

export const generateRecipesCloud = async (userProfile: any, ingredients: any[], strictMode: boolean) => {
  const generateFn = httpsCallable(functions, 'generateRecipes');
  const result = await generateFn({ userProfile, ingredients, strictMode });
  return result.data;
};