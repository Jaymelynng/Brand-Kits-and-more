import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ImageAnalysis {
  assetType: string;
  orientation: string;
  background: string;
  hasTransparency: boolean;
  colorScheme: string;
  variant: number;
  description: string;
}

interface AnalysisResponse {
  suggestedName: string;
  analysis: ImageAnalysis;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageUrl, gymCode, gymName, currentFilename } = await req.json();

    if (!imageUrl || !gymCode || !gymName) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: imageUrl, gymCode, gymName' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY is not configured');
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const systemPrompt = `You are analyzing a gym brand asset for ${gymName} (code: ${gymCode}).

Analyze this image and provide a structured JSON response with:
1. assetType: (logo, divider, icon, hero, banner, pattern, element)
2. orientation: (horizontal, vertical, square, circular, irregular)
3. background: (transparent, white, dark, light, colored)
4. hasTransparency: (true/false)
5. colorScheme: primary colors detected (e.g., "blue-white", "red-black")
6. variant: suggest a variant number (1, 2, 3, etc.)
7. description: brief descriptor combining key features (e.g., "horizontal-dark", "circular-transparent")

Generate a filename following this pattern:
{gymCode}-{assetType}-{description}-v{variant}.{extension}

Examples:
- CRR-logo-horizontal-dark-v1.png
- CRR-divider-vertical-transparent-v2.svg
- CRR-icon-circular-blue-v1.png

Current filename: ${currentFilename}

Respond ONLY with valid JSON in this exact format:
{
  "assetType": "logo",
  "orientation": "horizontal",
  "background": "dark",
  "hasTransparency": true,
  "colorScheme": "blue-white",
  "variant": 1,
  "description": "horizontal-dark",
  "suggestedName": "CRR-logo-horizontal-dark-v1.png"
}`;

    console.log('Calling Lovable AI Gateway for image analysis...');
    
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: systemPrompt },
              { type: 'image_url', image_url: { url: imageUrl } }
            ]
          }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits depleted. Please add funds to continue.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ error: 'AI analysis failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      console.error('No content in AI response');
      return new Response(
        JSON.stringify({ error: 'Invalid AI response' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse JSON from content (handle markdown code blocks if present)
    let analysisResult;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : content;
      analysisResult = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('Failed to parse AI response:', content);
      return new Response(
        JSON.stringify({ error: 'Invalid AI response format' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result: AnalysisResponse = {
      suggestedName: analysisResult.suggestedName || `${gymCode}-asset-v1.png`,
      analysis: {
        assetType: analysisResult.assetType || 'unknown',
        orientation: analysisResult.orientation || 'unknown',
        background: analysisResult.background || 'unknown',
        hasTransparency: analysisResult.hasTransparency || false,
        colorScheme: analysisResult.colorScheme || 'unknown',
        variant: analysisResult.variant || 1,
        description: analysisResult.description || 'asset',
      }
    };

    console.log('Analysis successful:', result.suggestedName);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analyze-image function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
