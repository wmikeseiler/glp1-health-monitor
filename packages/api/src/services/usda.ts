const USDA_API_BASE = "https://api.nal.usda.gov/fdc/v1";

export type USDAFoodResult = {
  fdcId: number;
  description: string;
  brandName?: string;
  servingSize?: number;
  servingSizeUnit?: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
};

type USDASearchItem = {
  fdcId: number;
  description: string;
  brandName?: string;
  servingSize?: number;
  servingSizeUnit?: string;
  foodNutrients?: { nutrientId: number; value: number }[];
};

type USDASearchResponse = {
  foods?: USDASearchItem[];
};

// Nutrient IDs from USDA FoodData Central
const NUTRIENT_ENERGY = 1008; // Energy (kcal)
const NUTRIENT_PROTEIN = 1003; // Protein (g)
const NUTRIENT_CARBS = 1005; // Carbohydrates (g)
const NUTRIENT_FAT = 1004; // Total lipid/fat (g)

function getNutrientValue(
  nutrients: { nutrientId: number; value: number }[],
  nutrientId: number
): number | undefined {
  const nutrient = nutrients.find((n) => n.nutrientId === nutrientId);
  return nutrient?.value;
}

export async function searchUSDAFoods(
  query: string,
  apiKey: string,
  pageSize = 10
): Promise<USDAFoodResult[]> {
  if (!apiKey) {
    console.warn(
      "USDA_API_KEY is not set. Food search from USDA FoodData Central is unavailable."
    );
    return [];
  }

  const url = `${USDA_API_BASE}/foods/search?api_key=${encodeURIComponent(apiKey)}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, pageSize }),
  });

  if (!response.ok) {
    console.warn(`USDA API request failed with status ${response.status}`);
    return [];
  }

  const data: USDASearchResponse = await response.json();
  const foods = data.foods ?? [];

  return foods.map((food) => {
    const nutrients = food.foodNutrients ?? [];
    return {
      fdcId: food.fdcId,
      description: food.description,
      brandName: food.brandName,
      servingSize: food.servingSize,
      servingSizeUnit: food.servingSizeUnit,
      calories: getNutrientValue(nutrients, NUTRIENT_ENERGY),
      protein: getNutrientValue(nutrients, NUTRIENT_PROTEIN),
      carbs: getNutrientValue(nutrients, NUTRIENT_CARBS),
      fat: getNutrientValue(nutrients, NUTRIENT_FAT),
    };
  });
}
