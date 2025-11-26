import React, { useState, useRef, useEffect } from 'react';
import { Icons } from './Icons';
import { ChatMessage, UserProfile, Ingredient, ViewState } from '../types';
import { chatWithChef } from '../services/geminiService';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { useToast } from './ToastProvider';

interface ChatAssistantProps {
  user: UserProfile | null;
  pantry: Ingredient[];
  currentView: ViewState;
  constraintsRef?: React.RefObject<HTMLDivElement>;
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
  constraintsRef,
  onAddIngredient,
  onRemoveIngredient,
  onUpdateProfile,
  onNavigate,
  onGenerateRecipes
}) => {
  const { showToast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'model', text: "Hi! I'm Chef Remy. How can I help you today?" }
  ]);
  const [showTooltip, setShowTooltip] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  
  // --- NOUVELLE LOGIQUE DE DRAG & DROP ---
  const controls = useAnimation();
  const [isDragging, setIsDragging] = useState(false);
  const [side, setSide] = useState<'left' | 'right'>('right');
  const BUTTON_SIZE = 48; // Réduit de 56 à 48
  const MARGIN_Y = 60; // Marge de sécurité verticale importante
  
  const getResetCoordinates = () => {
      let x = 0;
      let y = 0;
      if (constraintsRef?.current) {
          const parentRect = constraintsRef.current.getBoundingClientRect();
          x = parentRect.width - BUTTON_SIZE;
          y = parentRect.height / 2 - (BUTTON_SIZE / 2);
      } else if (typeof window !== 'undefined') {
          x = window.innerWidth - BUTTON_SIZE;
          y = window.innerHeight / 2;
      }
      return { x, y };
  };

  const resetPosition = () => {
      const coords = getResetCoordinates();
      controls.start({
          x: coords.x, 
          y: coords.y,
          transition: { type: "spring", stiffness: 500, damping: 30 }
      });
      setSide('right');
  };

  // Initialisation de la position au montage
  useEffect(() => {
    // Petit délai pour s'assurer que le parent est monté et a des dimensions
    const initTimer = setTimeout(() => {
        resetPosition();
    }, 100);
    return () => clearTimeout(initTimer);
  }, [constraintsRef, controls]);

  // Reset de la position à la fermeture du chat
  const isFirstRender = useRef(true);
  useEffect(() => {
      if (isFirstRender.current) {
          isFirstRender.current = false;
          return;
      }
      
      if (!isOpen) {
          resetPosition();
      }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
    if (isOpen) {
        setShowTooltip(false);
    }
  }, [messages, isOpen]);

  // Show tooltip after a few seconds on mount
  useEffect(() => {
      const timer = setTimeout(() => setShowTooltip(true), 3000);
      return () => clearTimeout(timer);
  }, []);

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
      showToast("Voice input is not supported in this browser.", "warning");
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
      
      if (response.text) {
        setMessages(prev => [...prev, { role: 'model', text: response.text }]);
      }

      if (response.functionCalls && response.functionCalls.length > 0) {
        for (const call of response.functionCalls) {
          console.log("Processing tool call:", call);
          const args = call.args;
          let toolResponseText = "";

          switch (call.name) {
            case 'add_pantry_item':
              if (args.item_name) {
                const qty = args.quantity || "1";
                onAddIngredient(args.item_name, qty);
                toolResponseText = `[Added ${args.item_name}${qty !== "1" ? ' ('+qty+')' : ''}]`;
              }
              break;
            case 'remove_pantry_item':
              if (args.item_name) {
                onRemoveIngredient(args.item_name);
                toolResponseText = `[Removed ${args.item_name}]`;
              }
              break;
            case 'generate_recipes':
               onGenerateRecipes(!!args.strict_mode, {
                 mealType: args.meal_type,
                 timeLimit: args.time_limit,
                 skillLevel: args.skill_level,
                 equipment: args.equipment
               });
               toolResponseText = "[Generating Recipes...]";
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

          if (toolResponseText) {
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
      {/* Draggable Trigger */}
      {!isOpen && (
        <motion.div 
            initial={getResetCoordinates()}
            drag
            dragMomentum={false} // Désactive l'élan pour un arrêt précis
            dragElastic={0.1} // Très peu d'élasticité
            animate={controls}
            
            // Position absolue "hardcodée" pour que X et Y soient les seules vérités
            style={{ 
                position: 'absolute', 
                top: 0, 
                left: 0, 
                zIndex: 50,
                touchAction: 'none'
            }}

            onDragStart={() => setIsDragging(true)}
            onDragEnd={(event, info) => {
                setIsDragging(false);
                
                // Calculs basés sur le conteneur parent
                let parentWidth = window.innerWidth;
                let parentHeight = window.innerHeight;
                let parentLeft = 0;
                let parentTop = 0;

                if (constraintsRef?.current) {
                    const rect = constraintsRef.current.getBoundingClientRect();
                    parentWidth = rect.width;
                    parentHeight = rect.height;
                    parentLeft = rect.left;
                    parentTop = rect.top;
                }

                // Position actuelle du bouton (coin haut-gauche) relative à la page
                // info.point.x/y est la position du pointeur, on préfère utiliser la position de l'élément si possible
                // mais Framer nous donne le delta.
                // Le plus simple avec useAnimation et drag est de calculer la projection.
                
                // On récupère le rectangle actuel du bouton dans le DOM
                const buttonRect = (event.target as HTMLElement).getBoundingClientRect();
                const currentWidth = buttonRect.width;
                const currentHeight = buttonRect.height;
                
                // Position relative au parent
                const relativeX = buttonRect.left - parentLeft;
                const relativeY = buttonRect.top - parentTop;
                
                // Centre du bouton pour la décision Gauche/Droite
                const centerX = relativeX + (currentWidth / 2);

                // 1. DÉCISION HORIZONTALE (Snap)
                const isLeft = centerX < (parentWidth / 2);
                
                // Largeur dépliée estimée ou mesurée : environ 64px (Icon + Chevron + Padding réduit)
                // Si on le colle à droite, on veut que le bord DROIT soit collé (donc x = parentWidth - LargeurReelle)
                // Mais au moment du drop, la largeur est de 48px. Elle va passer à ~64px ensuite.
                // On anticipe une largeur d'environ 60px en mode docké
                const dockedWidth = 60; 
                
                const targetX = isLeft ? 0 : parentWidth - dockedWidth;
                setSide(isLeft ? 'left' : 'right');

                // 2. CLAMP VERTICAL (Limites strictes)
                // On s'assure que Y est entre [MARGIN_Y] et [HAUTEUR_PARENT - MARGIN_Y - TAILLE_BOUTON]
                const minY = MARGIN_Y;
                const maxY = parentHeight - MARGIN_Y - currentHeight;
                
                // On clamp la position actuelle
                let targetY = Math.max(minY, Math.min(maxY, relativeY));

                // 3. APPLICATION
                controls.start({
                    x: targetX,
                    y: targetY,
                    transition: { type: "spring", stiffness: 500, damping: 30 }
                });
            }}
            
            className={`cursor-grab active:cursor-grabbing
                ${isDragging ? 'rounded-full' : (side === 'right' ? 'rounded-l-2xl rounded-r-none' : 'rounded-r-2xl rounded-l-none')}
            `}
        >
             <motion.div
                animate={{
                    borderRadius: isDragging ? "50%" : (side === 'right' ? "16px 0 0 16px" : "0 16px 16px 0"),
                    width: isDragging ? 48 : "auto",
                    height: isDragging ? 48 : "auto",
                }}
                className={`bg-primary text-white shadow-lg shadow-primary/20 flex items-center justify-center gap-1 backdrop-blur-sm border-y border-white/20 transition-all h-full w-full
                    ${isDragging ? 'p-0 border-x border-white/20' : (side === 'right' ? 'p-2 pr-3 border-l' : 'p-2 pl-3 border-r')}
                `}
                onClick={() => !isDragging && setIsOpen(true)}
             >
                {isDragging ? (
                    <Icons.Bot size={24} />
                ) : (
                    <>
                        {side === 'right' ? (
                            <>
                                <Icons.Bot size={22} className="animate-bounce-slow" />
                                <Icons.ChevronLeft size={16} className="opacity-50" />
                            </>
                        ) : (
                            <>
                                <Icons.ChevronRight size={16} className="opacity-50" />
                                <Icons.Bot size={22} className="animate-bounce-slow" />
                            </>
                        )}
                    </>
                )}
             </motion.div>

             {/* Tooltip */}
             {showTooltip && !isDragging && side === 'right' && (
                <div className="absolute right-full top-1/2 -translate-y-1/2 mr-4 bg-primary px-3 py-1.5 rounded-xl shadow-lg animate-fade-in-right flex items-center gap-2 whitespace-nowrap pointer-events-none">
                    <span className="text-xs font-bold text-white">Ask Chef Remy!</span>
                    <div className="absolute -right-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-primary rotate-45"></div>
                </div>
             )}
             {showTooltip && !isDragging && side === 'left' && (
                <div className="absolute left-full top-1/2 -translate-y-1/2 ml-4 bg-primary px-3 py-1.5 rounded-xl shadow-lg animate-fade-in-right flex items-center gap-2 whitespace-nowrap pointer-events-none">
                    <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-primary rotate-45"></div>
                    <span className="text-xs font-bold text-white">Ask Chef Remy!</span>
                </div>
             )}
        </motion.div>
      )}

      {/* Open State - Side Drawer */}
      <AnimatePresence>
      {isOpen && (
        <>
            {/* Backdrop */}
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsOpen(false)}
                className="absolute inset-0 bg-black/20 backdrop-blur-sm z-40"
            />
            
            {/* Drawer */}
            <motion.div 
                initial={{ x: side === 'right' ? '100%' : '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: side === 'right' ? '100%' : '-100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className={`absolute inset-0 h-full w-full bg-white shadow-2xl z-50 flex flex-col`}
            >
              {/* Header */}
              <div className="bg-primary/5 p-4 flex items-center justify-between border-b border-primary/5 pt-safe max-w-3xl mx-auto w-full">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary text-white rounded-full flex items-center justify-center shadow-sm">
                    <Icons.Bot size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800 text-sm">Chef Remy</h3>
                    <p className="text-xs text-primary font-medium flex items-center gap-1">
                       <Icons.Sparkles size={10} /> AI Chef
                    </p>
                  </div>
                </div>
                <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-black/5 rounded-full text-gray-500 transition-colors">
                  {side === 'right' ? <Icons.ChevronRight size={20} /> : <Icons.ChevronLeft size={20} />}
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto bg-gray-50/50">
                <div className="max-w-3xl mx-auto w-full p-4 space-y-4">
                {messages.map((msg, idx) => (
                  <div 
                    key={idx} 
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`
                      max-w-[85%] p-3.5 rounded-2xl text-sm leading-relaxed shadow-sm
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
              </div>

              {/* Input */}
              <div className="bg-white border-t border-gray-100 pb-safe">
                <div className="max-w-3xl mx-auto w-full p-4">
                <div className={`flex items-center gap-2 bg-gray-100 rounded-2xl px-4 py-3 focus-within:ring-2 focus-within:ring-primary/20 transition-all ${isListening ? 'ring-2 ring-red-400 bg-red-50' : ''}`}>
                   <input 
                     type="text" 
                     value={input}
                     onChange={e => setInput(e.target.value)}
                     onKeyDown={e => e.key === 'Enter' && handleSend()}
                     placeholder={isListening ? "Listening..." : "Ask Chef Remy..."}
                     className="flex-1 bg-transparent outline-none text-sm text-gray-800 placeholder-gray-400"
                     disabled={isLoading}
                   />
                   
                   <button 
                     onClick={toggleListening}
                     disabled={isLoading}
                     className={`transition-colors ${isListening ? 'text-red-500 animate-pulse' : 'text-gray-400 hover:text-primary'}`}
                   >
                     <Icons.Mic size={20} />
                   </button>

                   <button 
                     onClick={handleSend}
                     disabled={!input.trim() || isLoading}
                     className="text-primary hover:text-emerald-600 disabled:opacity-50 transition-colors pl-3 border-l border-gray-300"
                   >
                     <Icons.Send size={20} />
                   </button>
                </div>
                </div>
              </div>
            </motion.div>
        </>
      )}
      </AnimatePresence>
    </>
  );
};
