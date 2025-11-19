import React, { useState, useEffect, useRef } from 'react';
import { Ingredient } from '../types';
import { Icons } from '../components/Icons';
import { Html5Qrcode } from "html5-qrcode";

interface PantryProps {
  pantry: Ingredient[];
  onGenerate: (strictMode: boolean) => void;
  // New props for CRUD operations
  onAdd: (item: Ingredient) => void;
  onUpdate: (item: Ingredient) => void;
  onRemove: (id: string) => void;
}

export const Pantry: React.FC<PantryProps> = ({ pantry, onGenerate, onAdd, onUpdate, onRemove }) => {
  const [input, setInput] = useState('');
  const [quantityInput, setQuantityInput] = useState('');
  const [showTip, setShowTip] = useState(true);
  const [strictMode, setStrictMode] = useState(false);
  const [filterQuery, setFilterQuery] = useState('');
  
  // Scanner State
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);

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

  const handleScanSuccess = async (barcode: string) => {
      if (scannerRef.current) {
         try { await scannerRef.current.stop(); scannerRef.current.clear(); } catch (e) {}
         scannerRef.current = null;
      }
      setIsScanning(false);

      try {
          const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
          const data = await response.json();

          if (data.status === 1) {
              const product = data.product;
              const productName = product.product_name_en || product.product_name || product.generic_name || "Unknown Product";
              
              // Check if exists using props
              const existing = pantry.find(p => p.name.toLowerCase() === productName.toLowerCase());
              
              if (existing) {
                  onUpdate({ ...existing, isSelected: true, quantity: product.quantity || existing.quantity });
              } else {
                 const newItem: Ingredient = {
                      id: Date.now().toString(), // will be replaced by firestore ID ideally
                      name: productName,
                      quantity: product.quantity || product.product_quantity || undefined,
                      isSelected: true,
                      isScanned: true,
                      brand: product.brands || undefined,
                      image: product.image_front_small_url || product.image_url || undefined,
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

  const addIngredient = () => {
    const valueToAdd = input;
    if (!valueToAdd.trim()) return;
    
    const existing = pantry.find(p => p.name.toLowerCase() === valueToAdd.trim().toLowerCase());
    
    if (existing) {
        onUpdate({ 
            ...existing, 
            isSelected: true, 
            quantity: quantityInput.trim() || existing.quantity 
        });
    } else {
        const newItem: Ingredient = {
            id: Date.now().toString(),
            name: valueToAdd.trim(),
            quantity: quantityInput.trim() || undefined,
            isSelected: true,
            isScanned: false
        };
        onAdd(newItem);
    }
    setInput('');
    setQuantityInput('');
  };

  const removeIngredient = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
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
      {isScanning && (
          <div className="absolute inset-0 z-50 bg-black flex flex-col animate-fade-in">
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
          </div>
      )}

      {/* Header Section */}
      <div className="bg-white p-6 pb-8 rounded-b-3xl shadow-sm z-10">
        <h2 className="text-2xl font-bold text-gray-800 mb-1">What's in your kitchen?</h2>
        <p className="text-gray-400 text-sm mb-4">Add ingredients or scan barcodes.</p>
        
        {showTip && (
            <div className="mb-4 bg-emerald-50 border border-emerald-100 p-3 rounded-xl flex items-start gap-3 relative animate-fade-in">
                <div className="bg-white p-1.5 rounded-full text-primary shadow-sm shrink-0 mt-0.5">
                    <Icons.Leaf size={16} />
                </div>
                <div className="pr-6">
                    <h4 className="text-sm font-bold text-emerald-800">Save money & reduce waste!</h4>
                    <p className="text-xs text-emerald-700/80 mt-0.5 leading-relaxed">
                        Don't toss it! Add leftovers like <span className="font-semibold">"stale bread"</span> or <span className="font-semibold">"wilted spinach"</span>.
                    </p>
                </div>
                <button onClick={() => setShowTip(false)} className="absolute top-2 right-2 text-emerald-400 hover:text-emerald-600 p-1"><Icons.X size={14} /></button>
            </div>
        )}

        <div className="flex gap-2">
          <div className="flex-[2] flex bg-gray-100 border-0 rounded-xl px-4 py-3 focus-within:ring-2 focus-within:ring-primary transition-all">
             <input 
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addIngredient()}
                placeholder="e.g. Stale bread..."
                className="flex-1 bg-transparent border-none outline-none text-gray-700 placeholder-gray-400 min-w-0"
            />
            <button onClick={() => setIsScanning(true)} className="ml-2 text-gray-400 hover:text-primary transition-colors flex items-center justify-center border-l border-gray-300 pl-3"><Icons.ScanBarcode size={20} /></button>
          </div>
          <div className="flex-1 min-w-[80px] bg-gray-100 border-0 rounded-xl px-3 py-3 focus-within:ring-2 focus-within:ring-primary transition-all">
             <input 
                type="text"
                value={quantityInput}
                onChange={e => setQuantityInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addIngredient()}
                placeholder="Qty"
                className="w-full bg-transparent border-none outline-none text-gray-700 placeholder-gray-400 text-center min-w-0"
            />
          </div>
          <button onClick={() => addIngredient()} className="bg-primary text-white rounded-xl w-12 flex items-center justify-center shadow-lg shadow-primary/20 active:scale-95 transition-all"><Icons.Plus size={24} /></button>
        </div>
      </div>

      {/* List Section */}
      <div className="flex-1 overflow-y-auto p-6 pb-48 space-y-6">
        {pantry.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400 mt-4">
            <Icons.Refrigerator size={48} className="mb-3 opacity-20" />
            <p>Your pantry is empty.</p>
            <button onClick={() => setIsScanning(true)} className="mt-4 text-primary font-semibold text-sm flex items-center gap-2 px-4 py-2 bg-emerald-50 rounded-full"><Icons.ScanBarcode size={16} /> Scan a product</button>
          </div>
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
                        <div>
                            <h3 className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-3 flex items-center gap-2"><Icons.ScanBarcode size={14} /> Identified Products</h3>
                            <div className="grid grid-cols-1 gap-3">
                                {scannedItems.map(item => {
                                    const isSelected = item.isSelected !== false;
                                    return (
                                        <div key={item.id} onClick={() => toggleIngredient(item)} className={`p-3 rounded-2xl flex items-center gap-3 shadow-sm cursor-pointer transition-all border ${isSelected ? 'bg-white border-primary ring-1 ring-primary/20' : 'bg-gray-50 border-transparent opacity-60'}`}>
                                            {item.image ? <img src={item.image} alt={item.name} className="w-12 h-12 rounded-lg object-cover bg-gray-100" /> : <div className="w-12 h-12 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-500"><Icons.ShoppingBag size={20} /></div>}
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-gray-800 truncate text-sm">{item.name}{item.quantity && <span className="font-normal text-gray-500 ml-2 text-xs">({item.quantity})</span>}</p>
                                                {item.brand && <p className="text-xs text-gray-500 truncate">{item.brand}</p>}
                                                {item.nutrition?.calories && <div className="flex items-center gap-2 mt-1 text-[10px] font-medium text-gray-400"><span className="text-orange-500">{Math.round(item.nutrition.calories)} kcal</span><span>•</span><span className="text-blue-500">{Math.round(item.nutrition.protein || 0)}g Pro</span></div>}
                                            </div>
                                            <button onClick={(e) => removeIngredient(item.id, e)} className={`p-2 rounded-full transition-colors ${isSelected ? 'hover:bg-gray-100 text-gray-400' : 'hover:bg-gray-200 text-gray-500'}`}><Icons.X size={16} /></button>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    {manualItems.length > 0 && (
                        <div>
                            {scannedItems.length > 0 && <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2 mt-2"><Icons.List size={14} /> Pantry Staples</h3>}
                            <div className="flex flex-wrap gap-2 content-start">
                                {manualItems.map(item => {
                                const isSelected = item.isSelected !== false;
                                return (
                                    <div key={item.id} onClick={() => toggleIngredient(item)} className={`pl-3 pr-1 py-1.5 rounded-full flex items-center gap-2 shadow-sm cursor-pointer transition-all border ${isSelected ? 'bg-emerald-50 border-primary text-emerald-800 ring-1 ring-primary' : 'bg-gray-100 border-transparent text-gray-400 opacity-60 hover:opacity-80'}`}>
                                        <span className="font-medium text-sm select-none capitalize">{item.name}</span>
                                        {item.quantity && <span className="text-[10px] text-gray-500 bg-white/80 px-1.5 py-0.5 rounded ml-1 border border-gray-200 font-normal">{item.quantity}</span>}
                                        <button onClick={(e) => removeIngredient(item.id, e)} className={`p-1 rounded-full transition-colors ${isSelected ? 'hover:bg-emerald-100 text-emerald-600' : 'hover:bg-gray-200 text-gray-500'}`}><Icons.X size={14} /></button>
                                    </div>
                                )})}
                            </div>
                        </div>
                    )}
                </>
             )}
          </>
        )}
      </div>

      {pantry.length > 0 && (
        <div className="absolute bottom-24 left-0 w-full px-6 space-y-3">
            <div onClick={() => setStrictMode(!strictMode)} className="bg-white/90 backdrop-blur p-3 rounded-xl flex items-center justify-between cursor-pointer border border-gray-200 shadow-sm hover:border-primary/30 transition-colors">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${strictMode ? 'bg-emerald-100 text-primary' : 'bg-gray-100 text-gray-400'}`}>{strictMode ? <Icons.Check size={18} /> : <Icons.ShoppingBag size={18} />}</div>
                    <div><span className="block text-sm font-bold text-gray-800">{strictMode ? "Use only selected ingredients" : "Allow missing ingredients"}</span><span className="block text-xs text-gray-500">{strictMode ? "No shopping required." : "We might suggest extras."}</span></div>
                </div>
                <div className={`w-11 h-6 rounded-full p-1 transition-colors duration-300 ${strictMode ? 'bg-primary' : 'bg-gray-300'}`}><div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-300 ${strictMode ? 'translate-x-5' : ''}`} /></div>
            </div>
            <button onClick={() => onGenerate(strictMode)} disabled={selectedCount === 0} className={`w-full py-4 rounded-xl font-bold shadow-xl flex items-center justify-center gap-2 transition-all ${selectedCount > 0 ? 'bg-white border-2 border-primary text-primary shadow-primary/10 hover:bg-primary hover:text-white' : 'bg-gray-100 text-gray-400 cursor-not-allowed border-2 border-transparent'}`}><Icons.ChefHat className="w-5 h-5" />{selectedCount > 0 ? `Generate Recipes (${selectedCount})` : 'Select ingredients'}</button>
        </div>
      )}
    </div>
  );
};