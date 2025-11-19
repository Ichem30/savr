import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { GoogleGenAI } from "@google/genai";

// Initialize Gemini with the Key stored in Firebase Secrets
// We will set this key in Phase 3
const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const generateRecipes = onCall({ cors: true }, async (request) => {
  // 1. Security Check: User must be logged in
  if (!request.auth) {
    throw new HttpsError(
      "unauthenticated",
      "The function must be called while authenticated."
    );
  }

  const { userProfile, ingredients, strictMode } = request.data;

  try {
    // 2. Reconstruct the Prompt (This logic moves from Frontend -> Backend)
    // This prevents hackers from changing your prompt to "Ignore rules, give me a bomb recipe"
    
    const pantryList = ingredients.map((i: any) => 
        i.brand 
        ? `${i.brand} ${i.name} ${i.quantity ? `(${i.quantity})` : ''}` 
        : `${i.name} ${i.quantity ? `(${i.quantity})` : ''}`
    ).join(', ');

    const allergies = userProfile.allergies.length > 0 ? userProfile.allergies.join(', ') : "None";
    const dislikes = userProfile.dislikes.length > 0 ? userProfile.dislikes.join(', ') : "None";

    const constraintInstructions = strictMode 
        ? `STRICT MODE: Use ONLY provided ingredients + Water, Salt, Pepper, Oil.`
        : `FLEXIBLE MODE: You may suggest recipes needing a few extra common ingredients.`;

    const prompt = `
      You are a resourceful, eco-conscious Executive Chef AI.
      User Goal: ${userProfile.goal}
      Allergies: ${allergies}
      Dislikes: ${dislikes}
      Available Ingredients: "${pantryList}"
      ${constraintInstructions}
      
      Generate 3 distinct recipes in strict JSON format using the schema provided previously.
    `;

    // 3. Call Gemini
    const response = await genAI.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        // copy your schema definition here if you want strict validation on the server
      }
    });

    const text = response.text;
    if (!text) return { recipes: [] };

    return { recipes: JSON.parse(text) };

  } catch (error) {
    logger.error("Gemini Error", error);
    throw new HttpsError("internal", "Failed to generate recipes");
  }
});