import { COMMON_FOODS } from '../data/commonFoods';

const API_URL = 'https://world.openfoodfacts.org/cgi/search.pl';

export interface ProductResult {
  id: string; // code barre
  product_name: string;
  brands?: string;
  image_url?: string;
  nutriments: {
    'energy-kcal_100g'?: number;
    'proteins_100g'?: number;
    'carbohydrates_100g'?: number;
    'fat_100g'?: number;
    'fiber_100g'?: number;
    'sugars_100g'?: number;
    'salt_100g'?: number;
    'sodium_100g'?: number;
    // Vitamins & Minerals placeholder
    'vitamin-c_100g'?: number;
    'calcium_100g'?: number;
  };
  serving_size?: string; // "150 g"
  quantity?: string; // "330ml"
}

const searchCache: Record<string, ProductResult[]> = {};

export const searchLocalProducts = (query: string): ProductResult[] => {
    const lowerQuery = query.toLowerCase();
    return COMMON_FOODS.filter(p => 
        p.product_name.toLowerCase().includes(lowerQuery)
    );
};

export const searchRemoteProducts = async (query: string): Promise<ProductResult[]> => {
    if (searchCache[query]) return searchCache[query];

    try {
        const response = await fetch(`${API_URL}?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=20&sort_by=unique_scans_n&fields=code,product_name,brands,image_url,nutriments,serving_size,quantity`);
        const data = await response.json();
        
        if (data && data.products) {
            const rawResults = data.products.map((p: any) => ({
                id: p.code,
                product_name: p.product_name || "Produit inconnu",
                brands: p.brands,
                image_url: p.image_url,
                nutriments: p.nutriments || {},
                serving_size: p.serving_size,
                quantity: p.quantity
            }));

            // --- Intelligent Cleaning ---
            const seenNames = new Set<string>();
            const results = rawResults.filter((p: ProductResult) => {
                // 1. Remove invalid names
                if (!p.product_name || p.product_name.toLowerCase().includes('produit inconnu') || p.product_name.trim() === '') return false;
                
                // 2. Remove items without calories (useless for tracking)
                if (!p.nutriments || (p.nutriments['energy-kcal_100g'] === undefined && p.nutriments['energy-kcal'] === undefined)) return false;

                // 3. Deduplication by Name (keep first occurrence which is usually most popular due to API sort)
                const normalizedName = p.product_name.toLowerCase().trim();
                if (seenNames.has(normalizedName)) return false;
                seenNames.add(normalizedName);

                return true;
            });
            
            searchCache[query] = results;
            return results;
        }
        return [];
    } catch (error) {
        console.error("Error searching products:", error);
        return [];
    }
};

export const searchProducts = async (query: string): Promise<ProductResult[]> => {
  const localResults = searchLocalProducts(query);
  const remoteResults = await searchRemoteProducts(query);
  return [...localResults, ...remoteResults];
};

export const getProductByBarcode = async (barcode: string): Promise<ProductResult | null> => {
    try {
        const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json?fields=code,product_name,brands,image_url,nutriments,serving_size,quantity`);
        const data = await response.json();
        if (data && data.product) {
            return {
                id: data.product.code,
                product_name: data.product.product_name || "Produit inconnu",
                brands: data.product.brands,
                image_url: data.product.image_url,
                nutriments: data.product.nutriments || {},
                serving_size: data.product.serving_size,
                quantity: data.product.quantity
            };
        }
        return null;
    } catch (error) {
        console.error(error);
        return null;
    }
};

