import { createClient } from 'npm:@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Use HTML Canvas to capture the screen
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    // Set canvas size to viewport size
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    // Draw the current page content to the canvas
    context.drawImage(document, 0, 0);
    
    // Convert canvas to base64 image
    const screenshot = canvas.toDataURL('image/png');

    return new Response(
      JSON.stringify({ screenshot }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Screen capture failed:', error);
    
    return new Response(
      JSON.stringify({ error: 'Failed to capture screen' }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});