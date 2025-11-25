import React, { useState, useEffect, useRef } from 'react';
import { Ingredient } from '../types';
import { Icons } from '../components/Icons';
import { Html5Qrcode } from "html5-qrcode";
import { IngredientContextMenu } from '../components/IngredientContextMenu';
import { ModernSelect } from '../components/ModernSelect';
import { motion, AnimatePresence } from 'framer-motion';
import { searchProducts, getProductByBarcode, searchLocalProducts, ProductResult } from '../services/foodApi';

import { FoodDetailModal } from '../components/FoodDetailModal';

interface PantryProps {
  pantry: Ingredient[];
  onGenerate: (strictMode: boolean, options?: { mealType?: string, timeLimit?: string, skillLevel?: string }) => void;
  // New props for CRUD operations
  onAdd: (item: Ingredient) => void;
  onUpdate: (item: Ingredient) => void;
  onRemove: (id: string) => void;
  isScanning: boolean;
  setIsScanning: (isScanning: boolean) => void;
}

export const Pantry: React.FC<PantryProps> = ({ pantry, onGenerate, onAdd, onUpdate, onRemove, isScanning, setIsScanning }) => {
  const [input, setInput] = useState('');
  const [quantityInput, setQuantityInput] = useState('');
  const [unitInput, setUnitInput] = useState<'g' | 'portion'>('g');
  const [strictMode, setStrictMode] = useState(false);
  const [filterQuery, setFilterQuery] = useState('');
  
  // Search State
  const [searchResults, setSearchResults] = useState<ProductResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Edit Modal State
  const [selectedForEdit, setSelectedForEdit] = useState<Ingredient | null>(null);
  
  // Generation Options
  const [selectedMeal, setSelectedMeal] = useState<string | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string | undefined>(undefined);
  const [selectedSkill, setSelectedSkill] = useState<string | undefined>(undefined);
  
  // Scanner State (Moved to App.tsx, using props now)
  const [scanError, setScanError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  // Search Effect
  useEffect(() => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
      
      if (input.trim().length < 2) {
          setSearchResults([]);
          setShowResults(false);
          return;
      }

      setIsSearching(true);
      setShowResults(true);
      
      searchTimeoutRef.current = setTimeout(async () => {
          const results = await searchProducts(input);
          setSearchResults(results);
          setIsSearching(false);
      }, 400);

      return () => {
          if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
      };
  }, [input]);

  // ... Scanner Effects (Same as before) ...
  useEffect(() => {
    let isMounted = true;
    if (isScanning && !scannerRef.current) {
        const scanner = new Html5Qrcode("reader");
        scannerRef.current = scanner;
        setScanError(null);
        scanner.start(
            { facingMode: "environment" },
            { fps: 10, qrbox: { width: 250, height: 250 } },
            (decodedText) => { if (isMounted) handleScanSuccess(decodedText); },
            (errorMessage) => {}
        ).catch(err => {
            console.error("Scanner start error:", err);
            if (isMounted) setScanError("Could not start camera. Please check permissions.");
        });
    }
    return () => {
        isMounted = false;
        if (scannerRef.current && !isScanning) {
             const scanner = scannerRef.current;
             scanner.stop().catch(e => console.warn(e)).finally(() => { scanner.clear(); });
             scannerRef.current = null;
        }
    };
  }, [isScanning]);

  const stopScanner = async () => {
      if (scannerRef.current) {
          try {
              await scannerRef.current.stop();
              try { scannerRef.current.clear(); } catch (e) {}
          } catch (err) {
              try { scannerRef.current.clear(); } catch(e) {}
          } finally {
              scannerRef.current = null;
              setIsScanning(false);
              setScanError(null);
          }
      } else {
          setIsScanning(false);
          setScanError(null);
      }
  };

  const parseServing = (sizeStr?: string) => {
      if (!sizeStr) return undefined;
      const num = parseFloat(sizeStr.replace(/[^\d.]/g, '') || '0');
      return num > 0 ? num : undefined;
  };

  const handleScanSuccess = async (barcode: string) => {
      if (scannerRef.current) {
         try { await scannerRef.current.stop(); scannerRef.current.clear(); } catch (e) {}
         scannerRef.current = null;
      }
      setIsScanning(false);

      try {
          const product = await getProductByBarcode(barcode);
          
          if (product) {
              // Check if exists using props
              const existing = pantry.find(p => p.name.toLowerCase() === product.product_name.toLowerCase());
              
              if (existing) {
                  onUpdate({ ...existing, isSelected: true, quantity: product.quantity || existing.quantity });
              } else {
                 const newItem: Ingredient = {
                      id: Date.now().toString(),
                      name: product.product_name,
                      quantity: product.quantity,
                      isSelected: true,
                      isScanned: true,
                      brand: product.brands,
                      image: product.image_url,
                      servingSize: parseServing(product.serving_size),
                      unit: 'g',
                      nutrition: {
                          calories: product.nutriments?.['energy-kcal_100g'],
                          protein: product.nutriments?.proteins_100g,
                          carbs: product.nutriments?.carbohydrates_100g,
                          fats: product.nutriments?.fat_100g,
                      }
                  };
                  onAdd(newItem);
              }

          } else {
              alert("Product not found in database. Please add manually.");
          }
      } catch (error) {
          console.error("API Error", error);
          alert("Failed to fetch product details. Check internet connection.");
      }
  };

  const detectNutrition = (term: string) => {
      try {
        const localMatches = searchLocalProducts(term);
        const bestMatch = localMatches.find(p => p.product_name.toLowerCase() === term.toLowerCase());
        if (bestMatch) return bestMatch;
        
        if (searchResults.length > 0) {
             const topResult = searchResults[0];
             if (topResult.product_name.toLowerCase().includes(term.toLowerCase())) {
                 return topResult;
             }
        }
      } catch (e) {
          console.warn("Detection error", e);
      }
      return null;
  };

  const addIngredient = (customName?: string, forceCustom: boolean = false) => {
    const val = typeof customName === 'string' ? customName : input;
    if (!val || !val.trim()) return;
    const valueToAdd = val.trim();
    
    const existing = pantry.find(p => p.name.toLowerCase() === valueToAdd.toLowerCase());
    
    if (existing) {
        onUpdate({ 
            ...existing, 
            isSelected: true, 
            quantity: quantityInput.trim() || existing.quantity 
        });
    } else {
        try {
            // Try to auto-detect nutrition
            let detectedData = undefined;
            let detectedImage = undefined;
            let detectedServing = undefined;

            if (!forceCustom) {
                const match = detectNutrition(valueToAdd);
                if (match) {
                     detectedImage = match.image_url;
                     detectedServing = parseServing(match.serving_size);
                     detectedData = {
                        calories: match.nutriments['energy-kcal_100g'],
                        protein: match.nutriments['proteins_100g'],
                        carbs: match.nutriments['carbohydrates_100g'],
                        fats: match.nutriments['fat_100g']
                     };
                }
            }

            const newItem: Ingredient = {
                id: Date.now().toString(),
                name: valueToAdd,
                quantity: quantityInput.trim() ? quantityInput.trim() : undefined,
                isSelected: true,
                isScanned: !!detectedData,
                image: detectedImage || undefined,
                servingSize: detectedServing,
                unit: unitInput,
                nutrition: detectedData || undefined
            };
            
            // SANITIZE FOR FIRESTORE: Convert undefined to null or remove keys
            const firestoreItem = JSON.parse(JSON.stringify(newItem)); // Brutal but effective way to remove undefined keys
            onAdd(firestoreItem);
        } catch (error) {
            console.error("Add failed, using fallback", error);
            const fallbackItem: Ingredient = {
                id: Date.now().toString(),
                name: valueToAdd,
                quantity: quantityInput.trim() || undefined,
                isSelected: true,
                isScanned: false
            };
            const firestoreFallback = JSON.parse(JSON.stringify(fallbackItem));
            onAdd(firestoreFallback);
        }
    }
    setInput('');
    setQuantityInput('');
    setShowResults(false);
  };

  const selectProduct = (product: ProductResult) => {
      const existing = pantry.find(p => p.name.toLowerCase() === product.product_name.toLowerCase());
      
      if (existing) {
          onUpdate({ ...existing, isSelected: true, quantity: quantityInput || product.quantity || existing.quantity });
      } else {
          const newItem: Ingredient = {
              id: Date.now().toString(),
              name: product.product_name,
              quantity: quantityInput || product.quantity,
              isSelected: true,
              isScanned: true,
              brand: product.brands,
              image: product.image_url,
              servingSize: parseServing(product.serving_size),
              unit: 'g',
              nutrition: {
                  calories: product.nutriments?.['energy-kcal_100g'],
                  protein: product.nutriments?.proteins_100g,
                  carbs: product.nutriments?.carbohydrates_100g,
                  fats: product.nutriments?.fat_100g,
              }
          };
          onAdd(JSON.parse(JSON.stringify(newItem)));
      }
      setInput('');
      setQuantityInput('');
      setShowResults(false);
  };

  const handleEdit = (item: Ingredient) => {
      setInput(item.name);
      setQuantityInput(item.quantity || '');
      // Optionally focus the input
      // document.getElementById('ingredient-input')?.focus(); 
  };

  const removeIngredient = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    onRemove(id);
  };

  const toggleIngredient = (item: Ingredient) => {
      onUpdate({ ...item, isSelected: !item.isSelected });
  };

  const toggleAll = () => {
      const allSelected = pantry.every(i => i.isSelected);
      // This creates many writes, in a real app we'd batch this, but for now iterate
      pantry.forEach(item => {
          if (item.isSelected === allSelected) {
               onUpdate({ ...item, isSelected: !allSelected });
          }
      });
  };

  const selectedCount = pantry.filter(i => i.isSelected !== false).length;
  
  const filteredPantry = pantry.filter(item => 
    item.name.toLowerCase().includes(filterQuery.toLowerCase()) ||
    (item.brand && item.brand.toLowerCase().includes(filterQuery.toLowerCase()))
  );
  
  const scannedItems = filteredPantry.filter(i => i.isScanned);
  const manualItems = filteredPantry.filter(i => !i.isScanned);

  return (
    <div className="h-full flex flex-col relative bg-gray-50">
      {/* Scanner Overlay */}
      <AnimatePresence>
      {isScanning && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-black flex flex-col"
          >
              <div className="relative flex-1 flex items-center justify-center overflow-hidden bg-black">
                  <div id="reader" className="w-full h-full object-cover"></div>
                  <div className="absolute inset-0 pointer-events-none border-[50px] border-black/50">
                      <div className="w-full h-full border-2 border-primary/50 animate-pulse relative">
                          <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-primary"></div>
                          <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-primary"></div>
                          <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-primary"></div>
                          <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-primary"></div>
                      </div>
                  </div>
              </div>
              <div className="p-6 bg-black flex flex-col items-center gap-4 pb-safe z-50">
                  <p className="text-white text-sm font-medium">Point camera at a barcode</p>
                  <button onClick={stopScanner} className="px-8 py-3 bg-gray-800 text-white rounded-full font-semibold hover:bg-gray-700 border border-gray-700 transition-colors">Cancel</button>
              </div>
              {scanError && (
                  <div className="absolute top-8 left-4 right-4 bg-red-500/90 backdrop-blur text-white p-4 rounded-xl text-center shadow-lg z-50">
                      <p className="font-bold mb-1">Camera Error</p>
                      <p className="text-sm opacity-90">{scanError}</p>
                      <button onClick={stopScanner} className="mt-3 px-4 py-1 bg-white text-red-500 rounded-full text-sm font-bold">Close</button>
                  </div>
              )}
          </motion.div>
      )}
      </AnimatePresence>

      {/* Header Section */}
      <div className="bg-white p-6 pb-8 rounded-b-3xl shadow-sm z-10 sticky top-0">
        <h2 className="text-2xl font-bold text-gray-800 mb-1">What's in your kitchen?</h2>
        <p className="text-gray-400 text-sm mb-4">Add ingredients or scan barcodes.</p>
        
        <div className="flex gap-2 relative">
          <div className="flex-1 flex bg-gray-100 border-0 rounded-xl px-4 py-3 focus-within:ring-2 focus-within:ring-primary transition-all min-w-0">
             <input 
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addIngredient()}
                placeholder="e.g. Stale bread..."
                className="flex-1 bg-transparent border-none outline-none text-gray-700 placeholder-gray-400 min-w-0"
            />
            <button onClick={() => setIsScanning(true)} className="ml-2 text-gray-400 hover:text-primary transition-colors flex items-center justify-center border-l border-gray-300 pl-3 shrink-0"><Icons.ScanBarcode size={20} /></button>
          </div>
          <div className="w-20 bg-white border border-gray-200 rounded-xl px-2 py-3 focus-within:ring-2 focus-within:ring-primary transition-all shadow-sm shrink-0">
             <input 
                type="text"
                value={quantityInput}
                onChange={e => setQuantityInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addIngredient()}
                placeholder="Qty"
                className="w-full bg-transparent border-none outline-none text-gray-700 placeholder-gray-400 text-center"
            />
          </div>
          <motion.button 
            whileTap={{ scale: 0.9 }}
            onClick={() => addIngredient()} 
            className="bg-primary text-white rounded-xl w-12 flex items-center justify-center shadow-lg shadow-primary/20 transition-all shrink-0"
          >
            <Icons.Plus size={24} />
          </motion.button>

          {/* Search Results Dropdown */}
          <AnimatePresence>
            {showResults && input.length >= 2 && (
                <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute top-full left-0 w-full bg-white rounded-xl shadow-xl border border-gray-100 mt-2 z-50 max-h-60 overflow-y-auto"
                >
                    {isSearching ? (
                         <div className="p-4 text-center text-gray-400 text-xs flex items-center justify-center gap-2">
                            <div className="w-3 h-3 border-2 border-gray-300 border-t-primary rounded-full animate-spin"></div>
                            Searching...
                         </div>
                    ) : (
                        <>
                        {searchResults.map(product => (
                            <div 
                                key={product.id} 
                                onClick={() => selectProduct(product)}
                                className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-0 transition-colors group"
                            >
                                {product.image_url ? (
                                    <img src={product.image_url} className="w-10 h-10 rounded-lg object-cover bg-gray-100" alt="" />
                                ) : (
                                    <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                                        <Icons.ShoppingBag size={18} />
                                    </div>
                                )}
                                <div className="min-w-0 flex-1 text-left">
                                    <div className="font-bold text-gray-800 text-sm truncate group-hover:text-primary transition-colors">{product.product_name}</div>
                                    {product.brands && <div className="text-xs text-gray-400 truncate">{product.brands}</div>}
                                </div>
                                <Icons.Plus size={16} className="text-gray-300 group-hover:text-primary shrink-0" />
                            </div>
                        ))}
                        {/* Fallback Option */}
                        <div 
                            onClick={() => addIngredient(undefined, true)} 
                            className="p-3 hover:bg-gray-50 cursor-pointer flex items-center gap-3 text-gray-500 border-t border-gray-100"
                        >
                            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                                <Icons.Edit size={18} />
                            </div>
                             <div className="text-sm font-medium">Add "<span className="font-bold text-gray-700">{input}</span>" as custom item</div>
                        </div>
                        </>
                    )}
                </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* List Section */}
      <div className="flex-1 overflow-y-auto p-6 pb-64 space-y-6">
        {pantry.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center h-48 text-gray-400 mt-4"
          >
            <Icons.Refrigerator size={48} className="mb-3 opacity-20" />
            <p>Your pantry is empty.</p>
            <button onClick={() => setIsScanning(true)} className="mt-4 text-primary font-semibold text-sm flex items-center gap-2 px-4 py-2 bg-emerald-50 rounded-full"><Icons.ScanBarcode size={16} /> Scan a product</button>
          </motion.div>
        ) : (
          <>
             <div className="relative mb-2">
                <Icons.Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input type="text" value={filterQuery} onChange={e => setFilterQuery(e.target.value)} placeholder="Search your pantry..." className="w-full bg-white border border-gray-200 rounded-xl pl-9 pr-8 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none shadow-sm transition-all" />
                {filterQuery && <button onClick={() => setFilterQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"><Icons.X size={14} /></button>}
             </div>

             {filteredPantry.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-gray-400 opacity-60">
                    <Icons.Search size={32} className="mb-2 opacity-50" />
                    <p className="text-sm">No ingredients found matching "{filterQuery}"</p>
                </div>
             ) : (
                <>
                    <div className="flex justify-between items-center px-1">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Available ({selectedCount}/{pantry.length})</span>
                        <button onClick={toggleAll} className="text-xs text-primary font-semibold hover:underline">{pantry.every(i => i.isSelected) ? 'Deselect All' : 'Select All'}</button>
                    </div>

                    {scannedItems.length > 0 && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-xs font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-2"><Icons.ScanBarcode size={14} /> Identified Products</h3>
                                <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-1 rounded-full">{scannedItems.length} items</span>
                            </div>
                            <div className="grid grid-cols-2 gap-3 pb-2">
                                {scannedItems.map((item, index) => {
                                    const isSelected = item.isSelected !== false;
                                    return (
                                        <motion.div
                                            key={item.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: index * 0.05 }}
                                            className="h-full"
                                        >
                                            <IngredientContextMenu 
                                                itemName={item.name}
                                                onEdit={() => handleEdit(item)}
                                                onDelete={() => removeIngredient(item.id)}
                                            >
                                                <div 
                                                    onClick={() => setSelectedForEdit(item)} 
                                                    className={`relative h-full p-3 rounded-2xl flex flex-col shadow-sm cursor-pointer transition-all border ${isSelected ? 'bg-white border-primary ring-1 ring-primary/20 shadow-md' : 'bg-white/60 border-gray-100 opacity-80 hover:opacity-100'}`}
                                                >
                                                    <div className="absolute top-2 right-2 z-10">
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); toggleIngredient(item); }} 
                                                            className={`w-6 h-6 rounded-full flex items-center justify-center transition-all shadow-sm ${isSelected ? 'bg-primary text-white' : 'bg-gray-100 text-gray-300 hover:bg-gray-200'}`}
                                                        >
                                                            {isSelected && <Icons.Check size={14} strokeWidth={3} />}
                                                        </button>
                                                    </div>
                                                    
                                                    <div className="w-full aspect-square mb-3 rounded-xl overflow-hidden bg-gray-50 flex items-center justify-center">
                                                        {item.image ? (
                                                            <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <Icons.ShoppingBag size={32} className="text-emerald-200" />
                                                        )}
                                                    </div>

                                                    <div className="flex-1 flex flex-col min-w-0">
                                                        <h4 className="font-bold text-gray-800 text-sm leading-tight line-clamp-2 mb-1" title={item.name}>{item.name}</h4>
                                                        {item.brand && <p className="text-[10px] text-gray-400 truncate mb-2">{item.brand}</p>}
                                                        
                                                        <div className="mt-auto flex flex-wrap gap-1.5 items-end pt-2 border-t border-gray-50">
                                                            {item.quantity && (
                                                                <span className="text-[10px] font-bold bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-md">
                                                                    {item.quantity}
                                                                </span>
                                                            )}
                                                            {item.nutrition?.calories && (
                                                                <span className="text-[10px] font-medium text-orange-500 bg-orange-50 px-1.5 py-0.5 rounded-md">
                                                                    {Math.round(item.nutrition.calories)} kcal
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </IngredientContextMenu>
                                        </motion.div>
                                    )
                                })}
                            </div>
                        </motion.div>
                    )}

                    {manualItems.length > 0 && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
                            {scannedItems.length > 0 && <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2 mt-2"><Icons.List size={14} /> Pantry Staples</h3>}
                            <div className="flex flex-wrap gap-2 content-start">
                                {manualItems.map((item, index) => {
                                const isSelected = item.isSelected !== false;
                                return (
                                    <motion.div
                                        key={item.id}
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: index * 0.03 }}
                                    >
                                        <IngredientContextMenu
                                            itemName={item.name}
                                            onEdit={() => handleEdit(item)}
                                            onDelete={() => removeIngredient(item.id)}
                                        >
                                            <div onClick={() => setSelectedForEdit(item)} className={`pl-3 pr-1 py-1.5 rounded-full flex items-center gap-2 shadow-sm cursor-pointer transition-all border ${isSelected ? 'bg-white border-primary ring-1 ring-primary/20 text-primary' : 'bg-gray-50 border-transparent text-gray-500 hover:bg-gray-100'}`}>
                                                <span className="font-bold text-sm select-none capitalize">{item.name}</span>
                                                {item.quantity && <span className="text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded ml-1 font-medium">{item.quantity}</span>}
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); toggleIngredient(item); }} 
                                                    className={`w-6 h-6 rounded-full flex items-center justify-center transition-all shrink-0 ml-1 ${isSelected ? 'bg-primary text-white shadow-sm' : 'bg-gray-200 text-white hover:bg-gray-300'}`}
                                                >
                                                    {isSelected && <Icons.Check size={12} strokeWidth={3} />}
                                                </button>
                                            </div>
                                        </IngredientContextMenu>
                                    </motion.div>
                                )})}
                            </div>
                        </motion.div>
                    )}
                </>
             )}
          </>
        )}
      </div>

      {pantry.length > 0 && (
        <div className="absolute bottom-0 left-0 w-full px-6 pb-28 pt-6 space-y-3 bg-gradient-to-t from-gray-50 via-gray-50 to-transparent z-20">
            {/* Preference Pills - HIDDEN FOR NOW */}
            {/* <div className="flex flex-wrap gap-2 justify-start pb-2">
                <ModernSelect
                    value={selectedMeal || "all"}
                    onChange={(val) => setSelectedMeal(val === "all" ? undefined : val)}
                    placeholder="Any Meal"
                    icon={Icons.Utensils}
                    className="flex-1 min-w-[100px] justify-center"
                    options={[
                        { value: "all", label: "Any Meal" },
                        { value: "Breakfast", label: "Breakfast", icon: Icons.Sunrise },
                        { value: "Lunch", label: "Lunch", icon: Icons.Sun },
                        { value: "Dinner", label: "Dinner", icon: Icons.Moon },
                        { value: "Snack", label: "Snack", icon: Icons.Apple }
                    ]}
                />

                <ModernSelect
                    value={selectedTime || "all"}
                    onChange={(val) => setSelectedTime(val === "all" ? undefined : val)}
                    placeholder="Any Time"
                    icon={Icons.Clock}
                    className="flex-1 min-w-[100px] justify-center"
                    options={[
                        { value: "all", label: "Any Time" },
                        { value: "15 min", label: "15 min", icon: Icons.Clock },
                        { value: "30 min", label: "30 min", icon: Icons.Clock },
                        { value: "60 min", label: "60 min", icon: Icons.Clock }
                    ]}
                />

                <ModernSelect
                    value={selectedSkill || "all"}
                    onChange={(val) => setSelectedSkill(val === "all" ? undefined : val)}
                    placeholder="Any Level"
                    icon={Icons.TrendingUp}
                    className="flex-1 min-w-[100px] justify-center"
                    options={[
                        { value: "all", label: "Any Level" },
                        { value: "Beginner", label: "Beginner", icon: Icons.Leaf },
                        { value: "Intermediate", label: "Intermediate", icon: Icons.ChefHat },
                        { value: "Advanced", label: "Pro", icon: Icons.Flame }
                    ]}
                />
            </div> */}

            <motion.div 
                whileTap={{ scale: 0.98 }}
                onClick={() => setStrictMode(!strictMode)} 
                className="bg-white/90 backdrop-blur p-3 rounded-xl flex items-center justify-between cursor-pointer border border-gray-200 shadow-sm hover:border-primary/30 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${strictMode ? 'bg-emerald-100 text-primary' : 'bg-gray-100 text-gray-400'}`}>{strictMode ? <Icons.Check size={18} /> : <Icons.ShoppingBag size={18} />}</div>
                    <div><span className="block text-sm font-bold text-gray-800">{strictMode ? "Use only selected ingredients" : "Allow missing ingredients"}</span><span className="block text-xs text-gray-500">{strictMode ? "No shopping required." : "We might suggest extras."}</span></div>
                </div>
                <div className={`w-11 h-6 rounded-full p-1 transition-colors duration-300 ${strictMode ? 'bg-primary' : 'bg-gray-300'}`}><motion.div layout className={`w-4 h-4 bg-white rounded-full shadow-sm ${strictMode ? 'translate-x-5' : ''}`} /></div>
            </motion.div>
            <motion.button 
                whileTap={{ scale: 0.98 }}
                onClick={() => onGenerate(strictMode, { mealType: selectedMeal, timeLimit: selectedTime, skillLevel: selectedSkill })} 
                disabled={selectedCount === 0} 
                className={`w-full py-4 rounded-xl font-bold shadow-xl flex items-center justify-center gap-2 transition-all ${selectedCount > 0 ? 'bg-white border-2 border-primary text-primary shadow-primary/10 hover:bg-primary hover:text-white' : 'bg-gray-100 text-gray-400 cursor-not-allowed border-2 border-transparent'}`}
            >
                <Icons.ChefHat className="w-5 h-5" />{selectedCount > 0 ? `Generate Recipes (${selectedCount})` : 'Select ingredients'}
            </motion.button>
        </div>
      )}

      {/* Edit Modal Overlay */}
      <AnimatePresence>
        {selectedForEdit && (
            <FoodDetailModal 
                product={{
                    id: selectedForEdit.id,
                    product_name: selectedForEdit.name,
                    image_url: selectedForEdit.image,
                    brands: selectedForEdit.brand,
                    serving_size: selectedForEdit.servingSize ? `${selectedForEdit.servingSize} g` : "",
                    quantity: selectedForEdit.quantity,
                    nutriments: {
                        'energy-kcal_100g': selectedForEdit.nutrition?.calories,
                        'proteins_100g': selectedForEdit.nutrition?.protein,
                        'carbohydrates_100g': selectedForEdit.nutrition?.carbs,
                        'fat_100g': selectedForEdit.nutrition?.fats,
                    }
                }}
                mealTypeLabel="Pantry"
                onClose={() => setSelectedForEdit(null)}
                initialAmount={selectedForEdit.unit === 'portion' && selectedForEdit.quantity 
                    ? parseFloat(selectedForEdit.quantity) // Assuming quantity string starts with number like "2 portions"
                    : parseFloat(selectedForEdit.quantity || "100")}
                initialUnit={selectedForEdit.unit as any}
                onAdd={(name, cals, macros, quantity, unit, servingCount) => {
                    let displayQuantity = quantity.toString();
                    
                    // Format display quantity based on unit
                    if (unit === 'portion' && servingCount) {
                        displayQuantity = `${servingCount} portion${servingCount > 1 ? 's' : ''}`;
                    } else {
                         // For grams, usually we just store the number or "100g"
                         displayQuantity = `${quantity}`;
                    }

                    onUpdate({
                        ...selectedForEdit,
                        name,
                        quantity: displayQuantity,
                        unit: unit,
                        servingSize: selectedForEdit.servingSize,
                        nutrition: {
                            calories: cals,
                            protein: macros.protein,
                            carbs: macros.carbs,
                            fats: macros.fats
                        }
                    });
                    setSelectedForEdit(null);
                }}
                isEditing={true}
                onDelete={() => {
                    onRemove(selectedForEdit.id);
                    setSelectedForEdit(null);
                }}
            />
        )}
      </AnimatePresence>
    </div>
  );
};
