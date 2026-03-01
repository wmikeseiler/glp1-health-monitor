export type FoodPhotoResult = {
  items: {
    name: string;
    estimatedCalories?: number;
    estimatedProtein?: number;
    estimatedCarbs?: number;
    estimatedFat?: number;
    confidence: number; // 0-1
  }[];
};

/**
 * Analyze a food photo using AI vision.
 * This is a stub — will integrate with Claude Vision API via Supabase Edge Function.
 */
export async function analyzeFoodPhoto(photoUrl: string): Promise<FoodPhotoResult> {
  // TODO: Implement with Claude Vision API via Supabase Edge Function
  // For now, return a mock response
  console.warn("analyzeFoodPhoto is a stub — returning mock data for:", photoUrl);
  return {
    items: [
      {
        name: "Detected food item (AI analysis pending)",
        estimatedCalories: 0,
        estimatedProtein: 0,
        estimatedCarbs: 0,
        estimatedFat: 0,
        confidence: 0,
      },
    ],
  };
}
