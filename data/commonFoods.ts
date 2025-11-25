import { ProductResult } from '../services/foodApi';

export const COMMON_FOODS: ProductResult[] = [
    // --- FRUITS ---
    {
        id: 'gen_banana',
        product_name: 'Banane',
        brands: 'Fruit',
        image_url: 'https://images.unsplash.com/photo-1571771896429-70deeaa12778?q=80&w=200&auto=format&fit=crop',
        nutriments: { 'energy-kcal_100g': 89, 'proteins_100g': 1.1, 'carbohydrates_100g': 22.8, 'fat_100g': 0.3, 'sugars_100g': 12.2, 'fiber_100g': 2.6 },
        serving_size: '150 g'
    },
    {
        id: 'gen_apple',
        product_name: 'Pomme',
        brands: 'Fruit',
        image_url: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?q=80&w=200&auto=format&fit=crop',
        nutriments: { 'energy-kcal_100g': 52, 'proteins_100g': 0.3, 'carbohydrates_100g': 14, 'fat_100g': 0.2, 'fiber_100g': 2.4, 'sugars_100g': 10 },
        serving_size: '180 g'
    },
    {
        id: 'gen_avocado',
        product_name: 'Avocat',
        brands: 'Fruit',
        image_url: 'https://images.unsplash.com/photo-1523049673856-388668a946b8?q=80&w=200&auto=format&fit=crop',
        nutriments: { 'energy-kcal_100g': 160, 'proteins_100g': 2, 'carbohydrates_100g': 8.5, 'fat_100g': 14.7, 'fiber_100g': 6.7 },
        serving_size: '200 g'
    },
    {
        id: 'gen_orange',
        product_name: 'Orange',
        brands: 'Fruit',
        image_url: 'https://images.unsplash.com/photo-1547514701-42782101795e?q=80&w=200&auto=format&fit=crop',
        nutriments: { 'energy-kcal_100g': 47, 'proteins_100g': 0.9, 'carbohydrates_100g': 12, 'fat_100g': 0.1, 'fiber_100g': 2.4 },
        serving_size: '130 g'
    },
    {
        id: 'gen_strawberry',
        product_name: 'Fraise',
        brands: 'Fruit',
        image_url: 'https://images.unsplash.com/photo-1464965911861-746a04b4bca6?q=80&w=200&auto=format&fit=crop',
        nutriments: { 'energy-kcal_100g': 32, 'proteins_100g': 0.7, 'carbohydrates_100g': 7.7, 'fat_100g': 0.3, 'fiber_100g': 2 },
        serving_size: '150 g'
    },
    {
        id: 'gen_grape',
        product_name: 'Raisin',
        brands: 'Fruit',
        image_url: 'https://images.unsplash.com/photo-1537640538965-14f56b220484?q=80&w=200&auto=format&fit=crop',
        nutriments: { 'energy-kcal_100g': 67, 'proteins_100g': 0.6, 'carbohydrates_100g': 17, 'fat_100g': 0.4, 'fiber_100g': 0.9 },
        serving_size: '100 g'
    },
    {
        id: 'gen_lemon',
        product_name: 'Citron (jus)',
        brands: 'Fruit',
        image_url: 'https://images.unsplash.com/photo-1590502593747-42a996133562?q=80&w=200&auto=format&fit=crop',
        nutriments: { 'energy-kcal_100g': 29, 'proteins_100g': 1.1, 'carbohydrates_100g': 9, 'fat_100g': 0.3 },
        serving_size: '50 ml'
    },
    {
        id: 'gen_kiwi',
        product_name: 'Kiwi',
        brands: 'Fruit',
        image_url: 'https://images.unsplash.com/photo-1585059895524-72359e06133a?q=80&w=200&auto=format&fit=crop',
        nutriments: { 'energy-kcal_100g': 61, 'proteins_100g': 1.1, 'carbohydrates_100g': 15, 'fat_100g': 0.5, 'fiber_100g': 3 },
        serving_size: '75 g'
    },

    // --- VEGETABLES ---
    {
        id: 'gen_carrot',
        product_name: 'Carotte (crue)',
        brands: 'Légume',
        image_url: 'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?q=80&w=200&auto=format&fit=crop',
        nutriments: { 'energy-kcal_100g': 41, 'proteins_100g': 0.9, 'carbohydrates_100g': 10, 'fat_100g': 0.2, 'fiber_100g': 2.8 },
        serving_size: '100 g'
    },
    {
        id: 'gen_broccoli',
        product_name: 'Brocoli (cuit)',
        brands: 'Légume',
        image_url: 'https://images.unsplash.com/photo-1459411621453-7b03977f4bfc?q=80&w=200&auto=format&fit=crop',
        nutriments: { 'energy-kcal_100g': 35, 'proteins_100g': 2.4, 'carbohydrates_100g': 7.2, 'fat_100g': 0.4, 'fiber_100g': 3.3 },
        serving_size: '150 g'
    },
    {
        id: 'gen_spinach',
        product_name: 'Épinards (cuits)',
        brands: 'Légume',
        image_url: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?q=80&w=200&auto=format&fit=crop',
        nutriments: { 'energy-kcal_100g': 23, 'proteins_100g': 2.9, 'carbohydrates_100g': 3.6, 'fat_100g': 0.4, 'fiber_100g': 2.2 },
        serving_size: '150 g'
    },
    {
        id: 'gen_tomato',
        product_name: 'Tomate',
        brands: 'Légume',
        image_url: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?q=80&w=200&auto=format&fit=crop',
        nutriments: { 'energy-kcal_100g': 18, 'proteins_100g': 0.9, 'carbohydrates_100g': 3.9, 'fat_100g': 0.2, 'fiber_100g': 1.2 },
        serving_size: '120 g'
    },
    {
        id: 'gen_cucumber',
        product_name: 'Concombre',
        brands: 'Légume',
        image_url: 'https://images.unsplash.com/photo-1449300079323-02e209d9d3a6?q=80&w=200&auto=format&fit=crop',
        nutriments: { 'energy-kcal_100g': 15, 'proteins_100g': 0.7, 'carbohydrates_100g': 3.6, 'fat_100g': 0.1, 'fiber_100g': 0.5 },
        serving_size: '100 g'
    },
    {
        id: 'gen_zucchini',
        product_name: 'Courgette',
        brands: 'Légume',
        image_url: 'https://images.unsplash.com/photo-1597362925123-77861d3fbac7?q=80&w=200&auto=format&fit=crop',
        nutriments: { 'energy-kcal_100g': 17, 'proteins_100g': 1.2, 'carbohydrates_100g': 3.1, 'fat_100g': 0.3, 'fiber_100g': 1 },
        serving_size: '150 g'
    },
    {
        id: 'gen_pepper_red',
        product_name: 'Poivron Rouge',
        brands: 'Légume',
        image_url: 'https://images.unsplash.com/photo-1563565375-f3fdf5ec2e97?q=80&w=200&auto=format&fit=crop',
        nutriments: { 'energy-kcal_100g': 31, 'proteins_100g': 1, 'carbohydrates_100g': 6, 'fat_100g': 0.3, 'fiber_100g': 2.1 },
        serving_size: '100 g'
    },
    {
        id: 'gen_potato',
        product_name: 'Pomme de terre (cuite)',
        brands: 'Féculent',
        image_url: 'https://images.unsplash.com/photo-1518977676601-b53f82a6b69d?q=80&w=200&auto=format&fit=crop',
        nutriments: { 'energy-kcal_100g': 87, 'proteins_100g': 1.9, 'carbohydrates_100g': 20, 'fat_100g': 0.1, 'fiber_100g': 1.8 },
        serving_size: '150 g'
    },
    {
        id: 'gen_sweet_potato',
        product_name: 'Patate douce (cuite)',
        brands: 'Féculent',
        image_url: 'https://images.unsplash.com/photo-1596097635121-14b63b7a0c19?q=80&w=200&auto=format&fit=crop',
        nutriments: { 'energy-kcal_100g': 86, 'proteins_100g': 1.6, 'carbohydrates_100g': 20, 'fat_100g': 0.1, 'fiber_100g': 3 },
        serving_size: '150 g'
    },

    // --- PROTEINS ---
    {
        id: 'gen_egg',
        product_name: 'Oeuf (entier)',
        brands: 'Produit laitier',
        image_url: 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?q=80&w=200&auto=format&fit=crop',
        nutriments: { 'energy-kcal_100g': 155, 'proteins_100g': 13, 'carbohydrates_100g': 1.1, 'fat_100g': 11, 'sugars_100g': 1.1 },
        serving_size: '50 g'
    },
    {
        id: 'gen_chicken_breast',
        product_name: 'Blanc de Poulet (cuit)',
        brands: 'Viande',
        image_url: 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?q=80&w=200&auto=format&fit=crop',
        nutriments: { 'energy-kcal_100g': 165, 'proteins_100g': 31, 'carbohydrates_100g': 0, 'fat_100g': 3.6 },
        serving_size: '120 g'
    },
    {
        id: 'gen_beef_mince',
        product_name: 'Boeuf haché 5%',
        brands: 'Viande',
        image_url: 'https://images.unsplash.com/photo-1588168333986-5078d3ae3976?q=80&w=200&auto=format&fit=crop',
        nutriments: { 'energy-kcal_100g': 137, 'proteins_100g': 21, 'carbohydrates_100g': 0, 'fat_100g': 5 },
        serving_size: '100 g'
    },
    {
        id: 'gen_salmon',
        product_name: 'Saumon (cuit)',
        brands: 'Poisson',
        image_url: 'https://images.unsplash.com/photo-1599084993091-1a831dcbc217?q=80&w=200&auto=format&fit=crop',
        nutriments: { 'energy-kcal_100g': 208, 'proteins_100g': 20, 'carbohydrates_100g': 0, 'fat_100g': 13 },
        serving_size: '120 g'
    },
    {
        id: 'gen_tuna_canned',
        product_name: 'Thon au naturel (boîte)',
        brands: 'Poisson',
        image_url: 'https://images.unsplash.com/photo-1534483509529-75830919b52c?q=80&w=200&auto=format&fit=crop',
        nutriments: { 'energy-kcal_100g': 116, 'proteins_100g': 26, 'carbohydrates_100g': 0, 'fat_100g': 1 },
        serving_size: '100 g'
    },
    {
        id: 'gen_tofu',
        product_name: 'Tofu nature',
        brands: 'Végétal',
        image_url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=200&auto=format&fit=crop',
        nutriments: { 'energy-kcal_100g': 76, 'proteins_100g': 8, 'carbohydrates_100g': 1.9, 'fat_100g': 4.8 },
        serving_size: '100 g'
    },

    // --- GRAINS ---
    {
        id: 'gen_rice_white',
        product_name: 'Riz Blanc (cuit)',
        brands: 'Céréale',
        image_url: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?q=80&w=200&auto=format&fit=crop',
        nutriments: { 'energy-kcal_100g': 130, 'proteins_100g': 2.7, 'carbohydrates_100g': 28, 'fat_100g': 0.3 },
        serving_size: '150 g'
    },
    {
        id: 'gen_pasta',
        product_name: 'Pâtes (cuites)',
        brands: 'Féculent',
        image_url: 'https://images.unsplash.com/photo-1612966874574-e0a92d8707d3?q=80&w=200&auto=format&fit=crop',
        nutriments: { 'energy-kcal_100g': 131, 'proteins_100g': 5, 'carbohydrates_100g': 25, 'fat_100g': 1.1 },
        serving_size: '150 g'
    },
    {
        id: 'gen_oats',
        product_name: 'Flocons d\'avoine',
        brands: 'Céréale',
        image_url: 'https://images.unsplash.com/photo-1586444248902-2f64eddc13df?q=80&w=200&auto=format&fit=crop',
        nutriments: { 'energy-kcal_100g': 389, 'proteins_100g': 16.9, 'carbohydrates_100g': 66, 'fat_100g': 6.9, 'fiber_100g': 10.6 },
        serving_size: '40 g'
    },
    {
        id: 'gen_bread_whole',
        product_name: 'Pain complet',
        brands: 'Céréale',
        image_url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?q=80&w=200&auto=format&fit=crop',
        nutriments: { 'energy-kcal_100g': 265, 'proteins_100g': 9, 'carbohydrates_100g': 49, 'fat_100g': 3.2, 'fiber_100g': 7 },
        serving_size: '60 g'
    },
    {
        id: 'gen_bread_white',
        product_name: 'Pain Baguette',
        brands: 'Céréale',
        image_url: 'https://images.unsplash.com/photo-1530610476181-d83430b64dcd?q=80&w=200&auto=format&fit=crop',
        nutriments: { 'energy-kcal_100g': 265, 'proteins_100g': 9, 'carbohydrates_100g': 57, 'fat_100g': 1.2, 'fiber_100g': 3 },
        serving_size: '80 g'
    },
    {
        id: 'gen_quinoa',
        product_name: 'Quinoa (cuit)',
        brands: 'Céréale',
        image_url: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?q=80&w=200&auto=format&fit=crop', // Placeholder
        nutriments: { 'energy-kcal_100g': 120, 'proteins_100g': 4.4, 'carbohydrates_100g': 21, 'fat_100g': 1.9, 'fiber_100g': 2.8 },
        serving_size: '150 g'
    },
    {
        id: 'gen_lentils',
        product_name: 'Lentilles (cuites)',
        brands: 'Légumineuse',
        image_url: 'https://images.unsplash.com/photo-1515543904379-3d757afe72e?q=80&w=200&auto=format&fit=crop',
        nutriments: { 'energy-kcal_100g': 116, 'proteins_100g': 9, 'carbohydrates_100g': 20, 'fat_100g': 0.4, 'fiber_100g': 7.9 },
        serving_size: '150 g'
    },

    // --- DAIRY ---
    {
        id: 'gen_yogurt',
        product_name: 'Yaourt Nature',
        brands: 'Produit laitier',
        image_url: 'https://images.unsplash.com/photo-1563185860-3ac227378cb7?q=80&w=200&auto=format&fit=crop',
        nutriments: { 'energy-kcal_100g': 59, 'proteins_100g': 3.5, 'carbohydrates_100g': 4.7, 'fat_100g': 3.3 },
        serving_size: '125 g'
    },
    {
        id: 'gen_milk',
        product_name: 'Lait demi-écrémé',
        brands: 'Produit laitier',
        image_url: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?q=80&w=200&auto=format&fit=crop',
        nutriments: { 'energy-kcal_100g': 47, 'proteins_100g': 3.4, 'carbohydrates_100g': 4.9, 'fat_100g': 1.6 },
        serving_size: '200 ml'
    },
    {
        id: 'gen_cheese_mozarella',
        product_name: 'Mozzarella',
        brands: 'Produit laitier',
        image_url: 'https://images.unsplash.com/photo-1588195538326-c5b1e9f80a42?q=80&w=200&auto=format&fit=crop',
        nutriments: { 'energy-kcal_100g': 280, 'proteins_100g': 28, 'carbohydrates_100g': 3.1, 'fat_100g': 17 },
        serving_size: '30 g'
    },
    {
        id: 'gen_butter',
        product_name: 'Beurre',
        brands: 'Matière grasse',
        image_url: 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?q=80&w=200&auto=format&fit=crop',
        nutriments: { 'energy-kcal_100g': 717, 'proteins_100g': 0.9, 'carbohydrates_100g': 0.1, 'fat_100g': 81 },
        serving_size: '10 g'
    },

    // --- OTHERS ---
    {
        id: 'gen_olive_oil',
        product_name: 'Huile d\'olive',
        brands: 'Matière grasse',
        image_url: 'https://images.unsplash.com/photo-1474979266404-7cadd259c308?q=80&w=200&auto=format&fit=crop',
        nutriments: { 'energy-kcal_100g': 884, 'proteins_100g': 0, 'carbohydrates_100g': 0, 'fat_100g': 100 },
        serving_size: '10 ml'
    },
    {
        id: 'gen_almonds',
        product_name: 'Amandes',
        brands: 'Fruit à coque',
        image_url: 'https://images.unsplash.com/photo-1623687377267-7df8d4262528?q=80&w=200&auto=format&fit=crop',
        nutriments: { 'energy-kcal_100g': 579, 'proteins_100g': 21, 'carbohydrates_100g': 22, 'fat_100g': 50, 'fiber_100g': 12.5 },
        serving_size: '30 g'
    },
    {
        id: 'gen_walnuts',
        product_name: 'Noix',
        brands: 'Fruit à coque',
        image_url: 'https://images.unsplash.com/photo-1585785727774-847049e93988?q=80&w=200&auto=format&fit=crop',
        nutriments: { 'energy-kcal_100g': 654, 'proteins_100g': 15, 'carbohydrates_100g': 14, 'fat_100g': 65, 'fiber_100g': 7 },
        serving_size: '30 g'
    },
    {
        id: 'gen_honey',
        product_name: 'Miel',
        brands: 'Sucre',
        image_url: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?q=80&w=200&auto=format&fit=crop',
        nutriments: { 'energy-kcal_100g': 304, 'proteins_100g': 0.3, 'carbohydrates_100g': 82, 'fat_100g': 0, 'sugars_100g': 82 },
        serving_size: '20 g'
    },
    {
        id: 'gen_dark_chocolate',
        product_name: 'Chocolat Noir 70%',
        brands: 'Plaisir',
        image_url: 'https://images.unsplash.com/photo-1511381939415-e44019ccf974?q=80&w=200&auto=format&fit=crop',
        nutriments: { 'energy-kcal_100g': 598, 'proteins_100g': 7.8, 'carbohydrates_100g': 46, 'fat_100g': 43, 'sugars_100g': 24 },
        serving_size: '20 g'
    },
    {
        id: 'gen_tomato_sauce',
        product_name: 'Sauce Tomate (nature)',
        brands: 'Légume',
        image_url: 'https://images.unsplash.com/photo-1558818498-28c1e002b655?q=80&w=200&auto=format&fit=crop',
        nutriments: { 'energy-kcal_100g': 29, 'proteins_100g': 1.3, 'carbohydrates_100g': 4.9, 'fat_100g': 0.3 },
        serving_size: '100 g'
    }
];
