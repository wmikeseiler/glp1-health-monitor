const OFF_API_BASE = "https://world.openfoodfacts.org/api/v2";

export type BarcodeResult = {
  barcode: string;
  productName: string;
  brandName?: string;
  servingSize?: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  imageUrl?: string;
} | null;

export async function lookupBarcode(barcode: string): Promise<BarcodeResult> {
  try {
    const response = await fetch(`${OFF_API_BASE}/product/${encodeURIComponent(barcode)}.json`);
    if (!response.ok) return null;

    const data = await response.json();
    if (data.status !== 1 || !data.product) return null;

    const product = data.product;
    const nutriments = product.nutriments || {};

    return {
      barcode,
      productName: product.product_name || "Unknown Product",
      brandName: product.brands || undefined,
      servingSize: product.serving_size || undefined,
      calories: nutriments["energy-kcal_100g"] || nutriments["energy-kcal"] || undefined,
      protein: nutriments.proteins_100g || nutriments.proteins || undefined,
      carbs: nutriments.carbohydrates_100g || nutriments.carbohydrates || undefined,
      fat: nutriments.fat_100g || nutriments.fat || undefined,
      imageUrl: product.image_front_url || undefined,
    };
  } catch (error) {
    console.error("OpenFoodFacts lookup failed:", error);
    return null;
  }
}
