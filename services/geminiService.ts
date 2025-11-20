import { GoogleGenAI, Type, Schema, FunctionDeclaration } from "@google/genai";
import { UserProfile, Ingredient, Recipe, ChatMessage } from '../types';

// Schema definition for the recipe response
const recipeSchema: Schema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      id: { type: Type.STRING },
      title: { type: Type.STRING },
      description: { type: Type.STRING },
      prepTime: { type: Type.STRING },
      cookTime: { type: Type.STRING },
      calories: { type: Type.NUMBER },
      macros: {
        type: Type.OBJECT,
        properties: {
          protein: { type: Type.STRING },
          carbs: { type: Type.STRING },
          fats: { type: Type.STRING },
        },
        required: ['protein', 'carbs', 'fats']
      },
      ingredients: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "List of ingredients used from the user's pantry + common staples"
      },
      missingIngredients: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "Ingredients the user needs to buy or add"
      },
      instructions: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "Step by step cooking instructions. Include tips on reviving leftovers if used."
      },
      matchPercentage: {
        type: Type.NUMBER,
        description: "0-100 score on how well it uses the pantry"
      },
      tags: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "e.g. 'Leftover Rescue', 'High Protein', 'Quick & Easy'"
      }
    },
    required: ['id', 'title', 'description', 'calories', 'macros', 'ingredients', 'instructions', 'matchPercentage', 'tags']
  }
};

// --- Tools for Chat Assistant ---
const chatTools: FunctionDeclaration[] = [
  {
    name: "add_pantry_item",
    description: "Add an item to the user's pantry.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        item_name: { type: Type.STRING, description: "Name of the ingredient" },
        quantity: { type: Type.STRING, description: "Quantity e.g. '200g', '3 units'" }
      },
      required: ["item_name"]
    }
  },
  {
    name: "remove_pantry_item",
    description: "Remove an item from the user's pantry.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        item_name: { type: Type.STRING, description: "Name of the ingredient" }
      },
      required: ["item_name"]
    }
  },
  {
    name: "navigate_app",
    description: "Navigate to a specific screen in the app (pantry, profile, onboarding). Do NOT use this for generating recipes.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        screen_name: { 
          type: Type.STRING, 
          description: "Target screen", 
          enum: ["pantry", "profile", "onboarding"] 
        }
      },
      required: ["screen_name"]
    }
  },
  {
    name: "generate_recipes",
    description: "Triggers the recipe generation process using the current pantry ingredients. Use this when the user wants to cook, see recipes, or asks 'what can I make?'.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        strict_mode: { 
          type: Type.BOOLEAN, 
          description: "If true, only use ingredients user has. If false, allow missing ingredients." 
        },
        meal_type: {
          type: Type.STRING,
          enum: ["Breakfast", "Lunch", "Dinner", "Snack", "Dessert"],
          description: "Type of meal to generate"
        },
        time_limit: {
          type: Type.STRING,
          description: "Max cooking time e.g. '15 min', '30 min'"
        },
        skill_level: {
          type: Type.STRING,
          enum: ["Beginner", "Intermediate", "Advanced"],
          description: "User's cooking skill level"
        },
        equipment: {
          type: Type.STRING,
          description: "Available equipment e.g. 'Microwave only', 'Air Fryer', 'Oven'"
        }
      },
      required: []
    }
  },
  {
    name: "update_profile",
    description: "Update user preferences like allergies, dislikes, or goal.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        field: { type: Type.STRING, enum: ["allergies", "dislikes", "goal", "name", "height", "weight", "age", "gender"] },
        value: { type: Type.STRING, description: "The value to add, remove, or set. For height/weight/age, provide just the number." },
        action: { type: Type.STRING, enum: ["add", "remove", "set"], description: "Action to perform" }
      },
      required: ["field", "value", "action"]
    }
  }
];

export const generateRecipes = async (
  user: UserProfile, 
  pantry: Ingredient[],
  strictMode: boolean,
  options?: {
    mealType?: string,
    timeLimit?: string,
    skillLevel?: string,
    equipment?: string
  }
): Promise<Recipe[]> => {
  try {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      throw new Error("API Key is missing");
    }

    const ai = new GoogleGenAI({ apiKey });

    // Construct a richer pantry list including brands for scanned items
    const pantryList = pantry.map(i => 
        i.brand 
        ? `${i.brand} ${i.name} ${i.quantity ? `(${i.quantity})` : ''} (Product)` 
        : `${i.name} ${i.quantity ? `(${i.quantity})` : ''}`
    ).join(', ');

    const allergies = user.allergies.length > 0 ? user.allergies.join(', ') : "None";
    const dislikes = user.dislikes.length > 0 ? user.dislikes.join(', ') : "None";

    // Calculate BMR roughly to inform the AI (Mifflin-St Jeor Equation)
    let bmr = 10 * user.weight + 6.25 * user.height - 5 * user.age;
    if (user.gender === 'male') bmr += 5;
    else bmr -= 161;
    
    // Determine prompt nuance based on strict mode
    const constraintInstructions = strictMode 
        ? `
          STRICT MODE ACTIVATED:
          1. You MUST create recipes using ONLY the 'Available Ingredients' provided below.
          2. You may assume the user has ONLY basic staples: Water, Salt, Pepper, Oil.
          3. Do NOT suggest recipes that require going to the store.
          4. If the ingredients are random (e.g., "Stale Bread" and "Cheese"), invent a dish (e.g., "Cheese Toastie" or "Savoury Bread Pudding").
          5. BE CREATIVE. The goal is to rescue these specific ingredients.
          `
        : `
          FLEXIBLE MODE ACTIVATED:
          1. Prioritize using the 'Available Ingredients' as the main components.
          2. You may suggest recipes that require a few extra common ingredients (like Eggs, Milk, Onion) if it makes the meal significantly better.
          3. Mark any added ingredients in the 'missingIngredients' field.
          `;

    const contextInstructions = `
      CONTEXT & CONSTRAINTS:
      - Meal Type: ${options?.mealType || "Any (Decide based on ingredients)"}
      - Time Limit: ${options?.timeLimit || "Reasonable for a home cook"}
      - Skill Level: ${options?.skillLevel || "Beginner/Intermediate"}
      - Equipment: ${options?.equipment || "Standard Kitchen (Stove, Oven, Pan, Pot)"}
    `;

    const prompt = `
      You are a resourceful, eco-conscious Executive Chef AI. Your specialty is "Food Rescue" - creating gourmet or comforting meals from leftovers and random pantry items.
      
      User Profile:
      - Goal: ${user.goal} (Adjust portion sizes and macros to help them achieve this).
      - BMR: approx ${bmr} calories/day.
      - Allergies: ${allergies} (CRITICAL: Do not use these).
      - Dislikes: ${dislikes}.

      ${contextInstructions}

      Available Ingredients (Pantry):
      "${pantryList}"

      ${constraintInstructions}

      Mission:
      Generate 3-4 distinct recipes.
      - **Zero Waste**: If the user lists "Stale Bread", suggest items like Panzanella, Croutons, or French Toast. If "Wilted Spinach", suggest soups or smoothies.
      - **Education**: In the instructions, explain how to prep the specific leftover (e.g., "Soak the hard bread in a little water/milk to soften it first").
      - **Tags**: Include tags like "Leftover Rescue", "Pantry Staple", "Quick Fix" where appropriate.
      
      Return the response in strict JSON format matching the schema.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: recipeSchema,
        // Higher temp for creative combination of random ingredients
        temperature: 0.65, 
      }
    });

    const text = response.text;
    if (!text) return [];
    
    const recipes = JSON.parse(text) as Recipe[];
    // Ensure unique IDs if the AI mocks them poorly
    return recipes.map((r, idx) => ({...r, id: `${Date.now()}-${idx}`}));

  } catch (error) {
    console.error("Error generating recipes:", error);
    throw error;
  }
};

export const chatWithChef = async (
  message: string,
  history: ChatMessage[],
  user: UserProfile,
  pantry: Ingredient[],
  currentView: string
): Promise<{ text: string, functionCalls: any[] }> => {
  try {
    const apiKey = process.env.API_KEY;
    if (!apiKey) throw new Error("API Key is missing");

    const ai = new GoogleGenAI({ apiKey });

    const pantryList = pantry.map(i => `${i.name} ${i.quantity ? `(${i.quantity})` : ''}`).join(', ');
    
    const systemInstruction = `
      You are "Chef Remy", a friendly, helpful, and knowledgeable personal AI Chef assistant inside the "PantryFit Chef" app.
      
      CURRENT CONTEXT:
      - Date & Time: ${new Date().toLocaleString()}
      
      CURRENT APP STATE (This is the Source of Truth):
      - User Name: ${user.name}
      - User Goal: ${user.goal}
      - Allergies: ${user.allergies.join(', ')}
      - Current View/Page: ${currentView}
      - Pantry Inventory: ${pantryList || "Empty"}

      YOUR CAPABILITIES:
      - You can answer questions about food, cooking, and nutrition.
      - You can CONTROL the app using the provided tools.
      - If user wants to cook or find recipes, use 'generate_recipes'. 
        - **IMPORTANT**: Infer 'meal_type' based on the current time if not specified (e.g., Morning -> Breakfast).
        - Infer 'time_limit' if they mention being in a rush.
      - If the user says "I bought some eggs", use 'add_pantry_item'.
      - If the user says "I hate onions", use 'update_profile'.
      - Always be encouraging about food waste reduction.

      IMPORTANT RULES:
      1. **ALWAYS** provide a text response confirming your action *before* or *while* using a tool. Do not just execute the tool silently.
      2. **Trust the CURRENT APP STATE** listed above over any previous conversation history. If the history says eggs were added but the Current Pantry Inventory above is empty, then the eggs were deleted. The Current App State is live.
      3. Keep responses concise (under 50 words) unless explaining a recipe or answering a complex question.
    `;

    // Filter and format history to prevent empty text errors
    const cleanHistory = history.map(h => ({
       role: h.role,
       parts: [{ text: h.text || " " }] // ensure no empty text parts
    })).filter(h => h.parts[0].text.trim() !== "");

    // Construct conversation history
    // We use systemInstruction in config instead of a fake user message for better tool adherence
    const contents = [
        ...cleanHistory, 
        { role: 'user', parts: [{ text: message }] }
    ];
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: contents,
      config: {
        tools: [{ functionDeclarations: chatTools }],
        systemInstruction: systemInstruction,
      }
    });

    const resultText = response.text || "";
    const functionCalls = response.functionCalls || [];

    return { text: resultText, functionCalls };

  } catch (error) {
    console.error("Chat Error:", error);
    return { text: "I'm having trouble connecting to the kitchen server right now.", functionCalls: [] };
  }
};