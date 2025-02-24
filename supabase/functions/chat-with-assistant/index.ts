
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

function generateThreadId() {
  return 'thread_' + crypto.randomUUID();
}

async function getFileFromStorage(filePath: string) {
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  const { data, error } = await supabase
    .storage
    .from('chat-attachments')
    .download(filePath);

  if (error) {
    console.error('Error downloading file:', error);
    throw new Error(`Failed to download file: ${error.message}`);
  }

  return data;
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

    const contentParts: any[] = [];
    
    if (attachments && attachments.length > 0) {
      console.log('Processing attachments:', attachments);

      for (const attachment of attachments) {
        try {
          console.log(`Fetching file content for: ${attachment.file_path}`);
          const fileData = await getFileFromStorage(attachment.file_path);
          
          if (attachment.content_type.startsWith('image/')) {
            // For images, convert to base64 and use the image_url format
            const base64Data = await fileData.arrayBuffer().then(buffer => 
              btoa(String.fromCharCode(...new Uint8Array(buffer)))
            );
            
            contentParts.push({
              type: "image_url",
              image_url: {
                url: `data:${attachment.content_type};base64,${base64Data}`
              }
            });
          } else {
            // For PDFs and other files, convert to text and include in the message
            const textData = await fileData.text();
            contentParts.push({
              type: "text",
              text: `Content of ${attachment.file_name}:\n${textData}`
            });
          }
        } catch (error) {
          console.error(`Error processing attachment ${attachment.file_name}:`, error);
          throw new Error(`Failed to process attachment ${attachment.file_name}: ${error.message}`);
        }
      }
    }

    // Add the user's message as the first content part
    contentParts.unshift({ type: "text", text: message });

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
    console.log('OpenAI response received');

    return new Response(
      JSON.stringify({
        response: data.choices[0].message.content,
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
