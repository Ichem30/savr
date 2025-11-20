import React, { useState, useRef, useEffect } from 'react';
import { Icons } from './Icons';
import { ChatMessage, UserProfile, Ingredient, ViewState } from '../types';
import { chatWithChef } from '../services/geminiService';

interface ChatAssistantProps {
  user: UserProfile | null;
  pantry: Ingredient[];
  currentView: ViewState;
  onAddIngredient: (name: string, quantity?: string) => void;
  onRemoveIngredient: (name: string) => void;
  onUpdateProfile: (field: string, value: any, action: 'add' | 'remove' | 'set') => void;
  onNavigate: (view: ViewState) => void;
  onGenerateRecipes: (strictMode: boolean, options?: { mealType?: string, timeLimit?: string, skillLevel?: string, equipment?: string }) => void;
}

export const ChatAssistant: React.FC<ChatAssistantProps> = ({
  user,
  pantry,
  currentView,
  onAddIngredient,
  onRemoveIngredient,
  onUpdateProfile,
  onNavigate,
  onGenerateRecipes
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'model', text: "Hi! I'm Chef Remy. How can I help you today?" }
  ]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (isOpen && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Cleanup speech recognition on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
            recognitionRef.current.stop();
        } catch(e) {
            // ignore
        }
      }
    };
  }, []);

  const toggleListening = () => {
    if (isListening) {
      if (recognitionRef.current) {
        try {
            recognitionRef.current.stop();
        } catch(e) {
            console.warn("Error stopping recognition:", e);
        }
      }
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice input is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(prev => (prev ? `${prev} ${transcript}` : transcript));
    };

    recognition.onerror = (event: any) => {
      // Gracefully handle 'no-speech' which happens if the user doesn't talk
      if (event.error === 'no-speech') {
        setIsListening(false);
        return;
      }
      console.error("Speech recognition error", event.error);
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    try {
        recognition.start();
    } catch (e) {
        console.error("Failed to start recognition:", e);
        setIsListening(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || !user) return;

    const userMsg: ChatMessage = { role: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await chatWithChef(userMsg.text, messages, user, pantry, currentView);
      
      // Handle Text Response - Display this FIRST to satisfy "Answer before doing task"
      if (response.text) {
        setMessages(prev => [...prev, { role: 'model', text: response.text }]);
      }

      // Handle Function Calls
      if (response.functionCalls && response.functionCalls.length > 0) {
        for (const call of response.functionCalls) {
          
          console.log("Processing tool call:", call);
          const args = call.args;
          let toolResponseText = "";

          switch (call.name) {
            case 'add_pantry_item':
              if (args.item_name) {
                onAddIngredient(args.item_name, args.quantity);
                toolResponseText = `[Added ${args.item_name}${args.quantity ? ' ('+args.quantity+')' : ''}]`;
              }
              break;
            case 'remove_pantry_item':
              if (args.item_name) {
                onRemoveIngredient(args.item_name);
                toolResponseText = `[Removed ${args.item_name}]`;
              }
              break;
            case 'generate_recipes':
               // Trigger generation with extra options if provided by the AI
               onGenerateRecipes(!!args.strict_mode, {
                 mealType: args.meal_type,
                 timeLimit: args.time_limit,
                 skillLevel: args.skill_level,
                 equipment: args.equipment
               });
               toolResponseText = "[Generating Recipes...]";
               // Optionally close chat on mobile to see results
               // setIsOpen(false); 
               break;
            case 'navigate_app':
              if (args.screen_name) {
                const viewMap: Record<string, ViewState> = {
                   'pantry': 'pantry',
                   'profile': 'profile',
                   'onboarding': 'onboarding'
                };
                const target = viewMap[args.screen_name];
                if (target) {
                    onNavigate(target);
                    toolResponseText = `[Navigating to ${args.screen_name}]`;
                }
              }
              break;
            case 'update_profile':
              if (args.field && args.value && args.action) {
                onUpdateProfile(args.field, args.value, args.action as any);
                toolResponseText = `[Updated Profile: ${args.action} ${args.field}]`;
              }
              break;
          }

          // If the model didn't provide a text explanation (it should, per prompt), 
          // or just to confirm the system action in the log:
          // Only add this if the response text was empty, OR if we want a system log style
          if (!response.text && toolResponseText) {
             setMessages(prev => [...prev, { role: 'model', text: toolResponseText, isFunctionCall: true }]);
          }
        }
      }

    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'model', text: "Sorry, I had a bit of a brain freeze. Can you try again?" }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Closed State - Floating Button */}
      {!isOpen && (
        <button 
          onClick={() => setIsOpen(true)}
          className="absolute bottom-24 right-6 w-14 h-14 bg-primary text-white rounded-full shadow-xl shadow-primary/30 flex items-center justify-center z-50 hover:scale-110 transition-transform animate-bounce-slow border-4 border-white"
        >
          <Icons.Bot size={28} />
        </button>
      )}

      {/* Open State - Chat Window */}
      {isOpen && (
        <div className="absolute bottom-24 right-4 left-4 md:left-auto md:w-80 h-[450px] bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl flex flex-col border border-white/50 z-50 overflow-hidden animate-fade-in-up">
          {/* Header */}
          <div className="bg-primary/10 p-4 flex items-center justify-between border-b border-primary/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary text-white rounded-full flex items-center justify-center">
                <Icons.Bot size={20} />
              </div>
              <div>
                <h3 className="font-bold text-gray-800 text-sm">Chef Remy</h3>
                <p className="text-xs text-primary font-medium flex items-center gap-1">
                   <Icons.Sparkles size={10} /> AI Assistant
                </p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-black/5 rounded-full text-gray-500">
              <Icons.Minimize2 size={18} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
            {messages.map((msg, idx) => (
              <div 
                key={idx} 
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`
                  max-w-[80%] p-3 rounded-2xl text-sm leading-relaxed shadow-sm
                  ${msg.role === 'user' 
                    ? 'bg-primary text-white rounded-br-none' 
                    : 'bg-white text-gray-700 border border-gray-100 rounded-bl-none'
                  }
                  ${msg.isFunctionCall ? 'italic opacity-80 border-dashed' : ''}
                `}>
                  {msg.text}
                </div>
              </div>
            ))}
            {isLoading && (
               <div className="flex justify-start">
                  <div className="bg-white p-3 rounded-2xl rounded-bl-none shadow-sm border border-gray-100">
                     <div className="flex gap-1">
                        <div className="w-2 h-2 bg-primary/40 rounded-full animate-bounce" style={{animationDelay: '0ms'}}/>
                        <div className="w-2 h-2 bg-primary/40 rounded-full animate-bounce" style={{animationDelay: '150ms'}}/>
                        <div className="w-2 h-2 bg-primary/40 rounded-full animate-bounce" style={{animationDelay: '300ms'}}/>
                     </div>
                  </div>
               </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 bg-white border-t border-gray-100">
            <div className={`flex items-center gap-2 bg-gray-100 rounded-full px-4 py-2 focus-within:ring-2 focus-within:ring-primary/20 transition-all ${isListening ? 'ring-2 ring-red-400 bg-red-50' : ''}`}>
               <input 
                 type="text" 
                 value={input}
                 onChange={e => setInput(e.target.value)}
                 onKeyDown={e => e.key === 'Enter' && handleSend()}
                 placeholder={isListening ? "Listening..." : "Ask Chef Remy..."}
                 className="flex-1 bg-transparent outline-none text-sm text-gray-800 placeholder-gray-400"
                 disabled={isLoading}
               />
               
               {/* Voice Input Button */}
               <button 
                 onClick={toggleListening}
                 disabled={isLoading}
                 className={`transition-colors ${isListening ? 'text-red-500 animate-pulse' : 'text-gray-400 hover:text-primary'}`}
               >
                 <Icons.Mic size={18} />
               </button>

               <button 
                 onClick={handleSend}
                 disabled={!input.trim() || isLoading}
                 className="text-primary hover:text-emerald-600 disabled:opacity-50 transition-colors pl-2 border-l border-gray-300"
               >
                 <Icons.Send size={18} />
               </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};