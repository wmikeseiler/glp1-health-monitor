// Follow this pattern for Supabase Edge Functions
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

Deno.serve(async (req) => {
  try {
    const { photoUrl } = await req.json();

    // TODO: Call Claude Vision API to analyze the food photo
    // const anthropic = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY") });
    // const response = await anthropic.messages.create(...)

    return new Response(
      JSON.stringify({
        items: [
          {
            name: "Analysis pending — Claude Vision integration coming soon",
            estimatedCalories: 0,
            estimatedProtein: 0,
            estimatedCarbs: 0,
            estimatedFat: 0,
            confidence: 0,
          },
        ],
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Failed to analyze photo" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }
});
