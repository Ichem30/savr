import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Icons } from './Icons';
import { ProductResult, searchLocalProducts, searchRemoteProducts, getProductByBarcode } from '../services/foodApi';
import { FoodDetailModal } from './FoodDetailModal';
import { auth, searchCachedFoods, saveFoodToCache } from '../services/firebase';
import { Html5Qrcode } from "html5-qrcode";

interface MealDetailModalProps {
    mealType: { id: string, label: string, icon: any, color: string };
    currentDate: string;
    consumedItems: any[];
    savedRecipes: any[];
    onClose: () => void;
    onAddMeal: (item: any) => void;
    onUpdateMeal: (item: any) => void;
    onRemoveMeal: (id: string) => void;
}

export const MealDetailModal: React.FC<MealDetailModalProps> = ({ 
    mealType, 
    currentDate, 
    consumedItems, 
    savedRecipes, 
    onClose, 
    onAddMeal, 
    onUpdateMeal,
    onRemoveMeal 
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<ProductResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<ProductResult | null>(null);
    const [editingItem, setEditingItem] = useState<any | null>(null);
    const [view, setView] = useState<'list' | 'search' | 'recipes'>('list');

    // Scanner State
    const [isScanning, setIsScanning] = useState(false);
    const scannerRef = useRef<Html5Qrcode | null>(null);

    // Scanner Logic
    useEffect(() => {
        let isMounted = true;
        if (isScanning && !scannerRef.current) {
            const scanner = new Html5Qrcode("meal-reader");
            scannerRef.current = scanner;
            scanner.start(
                { facingMode: "environment" },
                { fps: 10, qrbox: { width: 250, height: 250 } },
                (decodedText) => { if (isMounted) handleScanSuccess(decodedText); },
                (errorMessage) => {}
            ).catch(err => {
                console.error("Scanner start error:", err);
                alert("Impossible de démarrer la caméra. Vérifiez les permissions.");
                setIsScanning(false);
            });
        }
        return () => {
            isMounted = false;
            if (scannerRef.current) {
                scannerRef.current.stop().catch(e => console.warn(e)).finally(() => scannerRef.current?.clear());
                scannerRef.current = null;
            }
        };
    }, [isScanning]);

    const handleScanSuccess = async (barcode: string) => {
        if (scannerRef.current) {
             try { await scannerRef.current.stop(); scannerRef.current.clear(); } catch (e) {}
             scannerRef.current = null;
        }
        setIsScanning(false);

        try {
            const product = await getProductByBarcode(barcode);
            if (product) {
                setSelectedProduct(product);
            } else {
                alert("Produit non trouvé dans la base de données.");
            }
        } catch (error) {
            alert("Erreur lors de la récupération du produit.");
        }
    };

    const stopScanner = async () => {
        if (scannerRef.current) {
            try { await scannerRef.current.stop(); scannerRef.current.clear(); } catch (e) {}
            scannerRef.current = null;
        }
        setIsScanning(false);
    };

    // Calculate Totals
    const totalCals = consumedItems.reduce((acc, item) => acc + item.calories, 0);
    const totalProt = consumedItems.reduce((acc, item) => acc + (item.macros?.protein || 0), 0);
    const totalCarbs = consumedItems.reduce((acc, item) => acc + (item.macros?.carbs || 0), 0);
    const totalFat = consumedItems.reduce((acc, item) => acc + (item.macros?.fats || 0), 0);

    // Search Logic
    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            if (searchQuery.length > 1) {
                handleSearch(searchQuery);
            } else {
                setSearchResults([]);
            }
        }, 500);
        return () => clearTimeout(delayDebounceFn);
    }, [searchQuery]);

    const handleSearch = async (query: string) => {
        setIsSearching(true);
        
        // 1. Local Results (Instant)
        const localResults = searchLocalProducts(query);
        let combinedInitial = localResults;

        // 2. Firebase Cache (Fast)
        if (auth.currentUser) {
            try {
                const cachedResults = await searchCachedFoods(auth.currentUser.uid, query);
                const localIds = new Set(localResults.map(p => p.id));
                const uniqueCache = cachedResults.filter((p: any) => !localIds.has(p.id));
                combinedInitial = [...localResults, ...uniqueCache];
            } catch (e) {
                console.warn("Cache search failed", e);
            }
        }
        
        setSearchResults(combinedInitial);
        
        // 3. Remote Results (Slow - Parallel)
        try {
            const remoteResults = await searchRemoteProducts(query);
            
            // Merge unique results
            const existingIds = new Set(combinedInitial.map(p => p.id));
            const uniqueRemote = remoteResults.filter(p => !existingIds.has(p.id));
            
            setSearchResults([...combinedInitial, ...uniqueRemote]);
        } catch (e) {
            console.error(e);
        } finally {
            setIsSearching(false);
        }
    };

    const handleAddProduct = (name: string, calories: number, macros: any, quantity: number) => {
        if (editingItem) {
            onUpdateMeal({
                ...editingItem,
                name,
                calories,
                quantity,
                macros
            });
            setEditingItem(null);
            setSelectedProduct(null);
        } else {
            onAddMeal({
                id: Date.now().toString(),
                type: mealType.id,
                name,
                calories,
                quantity,
                macros,
                productDetails: selectedProduct // Store source info
            });
            
            // Save to personal cache
            if (auth.currentUser && selectedProduct) {
                 saveFoodToCache(auth.currentUser.uid, selectedProduct).catch(console.error);
            }

            setSelectedProduct(null);
            setSearchQuery('');
            setView('list'); 
        }
    };

    const handleEditItem = (item: any) => {
        if (item.productDetails) {
            setEditingItem(item);
            setSelectedProduct(item.productDetails);
        } else {
            alert("Cet aliment ne peut pas être édité (données manquantes). Supprimez-le et ajoutez-le à nouveau.");
        }
    };

    return (
        <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-gray-50 z-[55] flex flex-col"
        >
            {/* Header */}
            <div className="bg-white p-4 border-b border-gray-100 shadow-sm flex items-center gap-4 sticky top-0 z-10">
                <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                    <Icons.ArrowLeft size={24} className="text-gray-600" />
                </button>
                <div className="flex-1">
                    <h2 className="text-xl font-black text-gray-800 flex items-center gap-2">
                        {mealType.label}
                        <span className={`text-xs px-2 py-0.5 rounded-full bg-opacity-10 ${mealType.color.split(' ')[0].replace('text-', 'bg-')} ${mealType.color.split(' ')[0]}`}>
                            {totalCals} kcal
                        </span>
                    </h2>
                    <p className="text-xs text-gray-400 font-medium">{currentDate}</p>
                </div>
                {view === 'list' && (
                    <button 
                        onClick={() => setView('search')}
                        className="w-10 h-10 bg-primary text-white rounded-full flex items-center justify-center shadow-lg shadow-primary/20 active:scale-95 transition-all"
                    >
                        <Icons.Plus size={24} />
                    </button>
                )}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 pb-safe">
                
                {view === 'list' && (
                    <div className="space-y-6">
                        {/* Macros Summary */}
                        <div className="grid grid-cols-3 gap-2">
                            <div className="bg-blue-50 p-3 rounded-xl text-center border border-blue-100">
                                <span className="block text-xs text-blue-400 font-bold uppercase">Protéines</span>
                                <span className="text-lg font-black text-blue-600">{Math.round(totalProt)}g</span>
                            </div>
                            <div className="bg-emerald-50 p-3 rounded-xl text-center border border-emerald-100">
                                <span className="block text-xs text-emerald-400 font-bold uppercase">Glucides</span>
                                <span className="text-lg font-black text-emerald-600">{Math.round(totalCarbs)}g</span>
                            </div>
                            <div className="bg-amber-50 p-3 rounded-xl text-center border border-amber-100">
                                <span className="block text-xs text-amber-400 font-bold uppercase">Lipides</span>
                                <span className="text-lg font-black text-amber-600">{Math.round(totalFat)}g</span>
                            </div>
                        </div>

                        {/* List */}
                        {consumedItems.length > 0 ? (
                            <div className="space-y-2">
                                <h3 className="font-bold text-gray-800">Aliments consommés</h3>
                                {consumedItems.map(item => (
                                    <div 
                                        key={item.id} 
                                        onClick={() => handleEditItem(item)}
                                        className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between group cursor-pointer hover:border-primary/30 transition-all"
                                    >
                                        <div>
                                            <div className="font-bold text-gray-800">{item.name}</div>
                                            <div className="text-xs text-gray-400 font-medium">
                                                {item.quantity ? `${item.quantity}g • ` : ''}
                                                {item.calories} kcal
                                            </div>
                                        </div>
                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onRemoveMeal(item.id);
                                            }}
                                            className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                                        >
                                            <Icons.Trash size={18} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12">
                                <div className={`w-20 h-20 mx-auto rounded-full ${mealType.color} bg-opacity-10 flex items-center justify-center mb-4`}>
                                    <mealType.icon size={40} />
                                </div>
                                <p className="text-gray-400 font-medium">Aucun aliment ajouté pour ce repas.</p>
                                <button onClick={() => setView('search')} className="mt-4 text-primary font-bold hover:underline">
                                    Ajouter un aliment
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {(view === 'search' || view === 'recipes') && (
                    <div className="h-full flex flex-col">
                        {/* Search Bar */}
                        <div className="flex gap-2 mb-4">
                            <div className="flex-1 bg-white border border-gray-200 focus-within:border-primary p-3 rounded-xl flex items-center gap-2 transition-all shadow-sm">
                                <Icons.Search size={20} className="text-gray-400" />
                                <input 
                                    autoFocus
                                    type="text" 
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    className="bg-transparent w-full outline-none text-gray-800 font-medium"
                                    placeholder="Rechercher (ex: Pomme...)"
                                />
                                {isSearching && <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />}
                                
                                <button 
                                    onClick={() => setIsScanning(true)}
                                    className="p-1.5 text-gray-400 hover:text-primary bg-gray-50 hover:bg-primary/10 rounded-lg transition-colors"
                                >
                                    <Icons.ScanBarcode size={20} />
                                </button>
                            </div>
                            <button 
                                onClick={() => setView('list')}
                                className="px-4 font-bold text-gray-500 hover:text-gray-800 transition-colors"
                            >
                                Annuler
                            </button>
                        </div>

                        {/* Tabs */}
                        <div className="flex gap-4 mb-4 border-b border-gray-200">
                            <button 
                                onClick={() => setView('search')}
                                className={`pb-2 text-sm font-bold transition-colors relative ${view === 'search' ? 'text-primary' : 'text-gray-400'}`}
                            >
                                Recherche
                                {view === 'search' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full" />}
                            </button>
                            <button 
                                onClick={() => setView('recipes')}
                                className={`pb-2 text-sm font-bold transition-colors relative ${view === 'recipes' ? 'text-primary' : 'text-gray-400'}`}
                            >
                                Mes Recettes
                                {view === 'recipes' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full" />}
                            </button>
                        </div>

                        {/* Search Results */}
                        {view === 'search' && (
                            <div className="flex-1 space-y-2">
                                {searchResults.map(product => (
                                    <button
                                        key={product.id}
                                        onClick={() => setSelectedProduct(product)}
                                        className="w-full flex items-center gap-3 p-3 bg-white border border-gray-100 hover:border-primary/30 rounded-xl transition-all text-left shadow-sm active:scale-[0.99]"
                                    >
                                        {product.image_url ? (
                                            <img src={product.image_url} className="w-12 h-12 rounded-lg object-cover bg-gray-50" alt="" />
                                        ) : (
                                            <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400"><Icons.ShoppingBag size={20} /></div>
                                        )}
                                        <div className="flex-1">
                                            <div className="font-bold text-gray-800 text-sm line-clamp-1">{product.product_name}</div>
                                            <div className="text-xs text-gray-400">{product.brands || 'Générique'}</div>
                                        </div>
                                        <div className="font-bold text-gray-600 text-xs bg-gray-50 px-2 py-1 rounded-lg border border-gray-100">
                                            {product.nutriments['energy-kcal_100g'] ? `${Math.round(product.nutriments['energy-kcal_100g'])} kcal` : '?'}
                                        </div>
                                    </button>
                                ))}
                                {searchResults.length === 0 && searchQuery.length > 1 && !isSearching && (
                                    <div className="text-center py-8 text-gray-400 text-sm">
                                        Aucun résultat trouvé.
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Recipes List */}
                        {view === 'recipes' && (
                            <div className="flex-1 space-y-2">
                                {savedRecipes.length > 0 ? (
                                    savedRecipes.map(recipe => (
                                        <button 
                                            key={recipe.id || recipe.title}
                                            onClick={() => {
                                                onAddMeal({
                                                    id: Date.now().toString(),
                                                    type: mealType.id,
                                                    name: recipe.title,
                                                    calories: recipe.calories,
                                                    quantity: 1, // 1 serving
                                                    recipeId: recipe.id
                                                });
                                                setView('list');
                                            }}
                                            className="w-full flex items-center justify-between p-3 bg-white border border-gray-100 hover:border-primary/30 rounded-xl text-left shadow-sm transition-all active:scale-[0.99]"
                                        >
                                            <div>
                                                <div className="font-bold text-gray-800">{recipe.title}</div>
                                                <div className="text-xs text-gray-400">{recipe.calories} kcal • {recipe.prepTime}</div>
                                            </div>
                                            <Icons.Plus size={18} className="text-primary" />
                                        </button>
                                    ))
                                ) : (
                                    <div className="text-center py-8 text-gray-400 text-sm">
                                        Aucune recette sauvegardée.
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Scanner Overlay */}
            <AnimatePresence>
            {isScanning && (
                <motion.div 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[60] bg-black flex flex-col"
                >
                     <div className="relative flex-1 flex items-center justify-center overflow-hidden bg-black">
                        <div id="meal-reader" className="w-full h-full object-cover"></div>
                        <div className="absolute inset-0 pointer-events-none border-[50px] border-black/50">
                            <div className="w-full h-full border-2 border-primary/50 animate-pulse relative">
                                <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-primary"></div>
                                <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-primary"></div>
                                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-primary"></div>
                                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-primary"></div>
                            </div>
                        </div>
                        <div className="absolute top-4 right-4 z-50 pointer-events-auto">
                             <button onClick={stopScanner} className="p-3 bg-black/50 backdrop-blur rounded-full text-white"><Icons.X size={24} /></button>
                         </div>
                     </div>
                     <div className="p-8 bg-black text-center pb-safe">
                         <p className="text-white font-bold text-lg mb-2">Scannez un code-barre</p>
                         <p className="text-gray-400 text-sm mb-6">Placez le code-barre dans le cadre pour l'ajouter à votre repas.</p>
                         <button onClick={stopScanner} className="px-8 py-3 bg-gray-800 text-white rounded-full font-bold">Annuler</button>
                     </div>
                </motion.div>
            )}
            </AnimatePresence>

            {/* Food Detail Modal Overlay */}
            <AnimatePresence>
                {selectedProduct && (
                    <FoodDetailModal 
                        product={selectedProduct}
                        mealTypeLabel={mealType.label}
                        onClose={() => { setSelectedProduct(null); setEditingItem(null); }}
                        onAdd={handleAddProduct}
                        initialAmount={editingItem?.quantity}
                        isEditing={!!editingItem}
                    />
                )}
            </AnimatePresence>
        </motion.div>
    );
};

