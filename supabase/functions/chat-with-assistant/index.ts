
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

function generateThreadId() {
  return 'thread_' + crypto.randomUUID();
}

async function fetchPdfContent(url: string): Promise<string> {
  const response = await fetch(url);
  const text = await response.text();
  return text;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, assistantType, attachments } = await req.json();
    console.log('Processing request:', { message, assistantType, attachments });

    const threadId = generateThreadId();
    const assistantId = `${assistantType}_assistant`;

    let systemMessage = `You are a data analyst specializing in SaaS benchmarks and metrics analysis. 
Your role is to analyze financial metrics and provide benchmark comparisons. Focus on:
1. Extracting key metrics from documents
2. Comparing with industry benchmarks
3. Providing Python code for visualization
4. Generating actionable insights`;

    let userContent = message;

    // Process attachments if present
    const contentParts: any[] = [];
    
    if (attachments && attachments.length > 0) {
      console.log('Processing attachments:', attachments);

      for (const attachment of attachments) {
        if (attachment.type === 'image') {
          contentParts.push({
            type: "image_url",
            image_url: { url: attachment.url }
          });
        } else {
          // For PDFs, just add the URL for OpenAI to fetch
          userContent += `\nPlease analyze the PDF document at: ${attachment.url}`;
        }
      }
    }

    contentParts.unshift({ type: "text", text: userContent });

    console.log('Sending request to OpenAI');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: systemMessage
          },
          {
            role: "user",
            content: contentParts
          }
        ],
        max_tokens: 4096,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI error:', errorData);
      throw new Error(`Failed to get response from OpenAI: ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    const assistantResponse = data.choices[0].message.content;

    return new Response(
      JSON.stringify({
        response: assistantResponse,
        thread_id: threadId,
        assistant_id: assistantId
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
