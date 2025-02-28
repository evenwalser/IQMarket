
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import OpenAI from "https://esm.sh/openai@4.6.0";

// Initialize OpenAI client
const openAI = new OpenAI({
  apiKey: Deno.env.get('OPENAI_API_KEY'),
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Get Assistant ID based on type
function getAssistantId(type: string) {
  const assistantMappings: Record<string, string> = {
    'knowledge': Deno.env.get('FOUNDER_WISDOM_ASSISTANT_ID') || '',
    'frameworks': Deno.env.get('FRAMEWORKS_ASSISTANT_ID') || '',
    'benchmarks': Deno.env.get('BENCHMARKS_ASSISTANT_ID') || '',
  };
  
  return assistantMappings[type] || '';
}

async function handleStructuredOutput(message: string, assistantId: string, threadId: string | null, attachments: any[]) {
  try {
    // Create or retrieve thread
    let thread;
    if (threadId) {
      thread = await openAI.beta.threads.retrieve(threadId);
    } else {
      thread = await openAI.beta.threads.create();
    }
    
    // Handle attachments if present
    let fileIds: string[] = [];
    if (attachments && attachments.length > 0) {
      for (const attachment of attachments) {
        const response = await fetch(attachment.url);
        const blob = await response.blob();
        
        const buffer = await blob.arrayBuffer();
        const file = new Uint8Array(buffer);
        
        // Upload file to OpenAI
        const uploadedFile = await openAI.files.create({
          file,
          purpose: 'assistants',
        });
        
        fileIds.push(uploadedFile.id);
      }
    }
    
    // Create message with structured output instruction
    await openAI.beta.threads.messages.create(thread.id, {
      role: 'user',
      content: `Please respond to the following question with structured data whenever possible. If the information can be represented as a table or chart, please format it accordingly.\n\nQuestion: ${message}`,
      file_ids: fileIds,
    });
    
    // Run the assistant
    const run = await openAI.beta.threads.runs.create(thread.id, {
      assistant_id: assistantId,
    });
    
    // Poll for completion
    let completedRun = await pollRunStatus(openAI, thread.id, run.id);
    
    // Get messages after completion
    const messages = await openAI.beta.threads.messages.list(thread.id, {
      order: 'desc',
      limit: 1,
    });
    
    // Extract visualizations from the response
    const responseContent = messages.data[0]?.content || [];
    let textResponse = '';
    let visualizations = [];
    
    for (const content of responseContent) {
      if (content.type === 'text') {
        textResponse = content.text.value;
        
        // Try to extract structured data (tables, charts)
        visualizations = extractStructuredData(textResponse);
      }
    }
    
    return {
      thread_id: thread.id,
      assistant_id: assistantId,
      response: textResponse,
      visualizations: visualizations
    };
  } catch (error) {
    console.error("Error in handleStructuredOutput:", error);
    throw error;
  }
}

// Extract tables and charts from the response
function extractStructuredData(text: string) {
  const visualizations = [];
  
  // Extract tables
  const tableRegex = /```(?:json|csv)?\s*\n((?:.*\n)+?)```/g;
  let tableMatch;
  
  while ((tableMatch = tableRegex.exec(text)) !== null) {
    try {
      const tableContent = tableMatch[1].trim();
      
      // Try to parse JSON
      if (tableContent.startsWith('[') || tableContent.startsWith('{')) {
        try {
          const parsedData = JSON.parse(tableContent);
          if (Array.isArray(parsedData) && parsedData.length > 0) {
            const headers = Object.keys(parsedData[0]);
            visualizations.push({
              type: 'table',
              data: parsedData,
              headers: headers
            });
          }
        } catch (e) {
          console.error("Failed to parse JSON table:", e);
        }
      } 
      // Parse CSV
      else if (tableContent.includes(',')) {
        const rows = tableContent.split('\n');
        const headers = rows[0].split(',').map(h => h.trim());
        const data = [];
        
        for (let i = 1; i < rows.length; i++) {
          if (!rows[i].trim()) continue;
          
          const values = rows[i].split(',').map(v => v.trim());
          const rowData: Record<string, any> = {};
          
          headers.forEach((header, index) => {
            rowData[header] = values[index] || '';
          });
          
          data.push(rowData);
        }
        
        if (data.length > 0) {
          visualizations.push({
            type: 'table',
            data: data,
            headers: headers
          });
        }
      }
    } catch (e) {
      console.error("Error processing table:", e);
    }
  }
  
  // Extract charts
  const chartRegex = /```chart\s*\n((?:.*\n)+?)```/g;
  let chartMatch;
  
  while ((chartMatch = chartRegex.exec(text)) !== null) {
    try {
      const chartContent = chartMatch[1].trim();
      const chartData = JSON.parse(chartContent);
      
      if (chartData.type && chartData.data && Array.isArray(chartData.data)) {
        visualizations.push({
          type: 'chart',
          chartType: chartData.type || 'bar',
          data: chartData.data,
          xKey: chartData.xKey || 'x',
          yKeys: chartData.yKeys || ['y'],
          height: chartData.height || 300
        });
      }
    } catch (e) {
      console.error("Error processing chart:", e);
    }
  }
  
  return visualizations;
}

async function pollRunStatus(client: OpenAI, threadId: string, runId: string) {
  let run = await client.beta.threads.runs.retrieve(threadId, runId);
  
  while (run.status === 'queued' || run.status === 'in_progress') {
    // Wait for a bit before checking again
    await new Promise(resolve => setTimeout(resolve, 1000));
    run = await client.beta.threads.runs.retrieve(threadId, runId);
  }
  
  // Handle failure states
  if (run.status === 'failed' || run.status === 'cancelled' || run.status === 'expired') {
    throw new Error(`Run ended with status: ${run.status}`);
  }
  
  return run;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, assistantType, attachments = [], structuredOutput = false, threadId = null } = await req.json();
    
    // Validate input
    if (!message) {
      return new Response(
        JSON.stringify({ error: 'Message is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Get assistant ID based on type
    const assistantId = getAssistantId(assistantType);
    if (!assistantId) {
      return new Response(
        JSON.stringify({ error: 'Invalid assistant type' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Handle based on output type request
    let result;
    if (structuredOutput) {
      result = await handleStructuredOutput(message, assistantId, threadId, attachments);
    } else {
      // Create or retrieve thread
      let thread;
      if (threadId) {
        thread = await openAI.beta.threads.retrieve(threadId);
      } else {
        thread = await openAI.beta.threads.create();
      }
      
      // Handle attachments if present
      let fileIds: string[] = [];
      if (attachments && attachments.length > 0) {
        for (const attachment of attachments) {
          const response = await fetch(attachment.url);
          const blob = await response.blob();
          
          const buffer = await blob.arrayBuffer();
          const file = new Uint8Array(buffer);
          
          // Upload file to OpenAI
          const uploadedFile = await openAI.files.create({
            file,
            purpose: 'assistants',
          });
          
          fileIds.push(uploadedFile.id);
        }
      }
      
      // Create message
      await openAI.beta.threads.messages.create(thread.id, {
        role: 'user',
        content: message,
        file_ids: fileIds,
      });
      
      // Run the assistant
      const run = await openAI.beta.threads.runs.create(thread.id, {
        assistant_id: assistantId,
      });
      
      // Poll for completion
      let completedRun = await pollRunStatus(openAI, thread.id, run.id);
      
      // Get messages after completion
      const messages = await openAI.beta.threads.messages.list(thread.id, {
        order: 'desc',
        limit: 1,
      });
      
      // Extract response text
      const responseContent = messages.data[0]?.content || [];
      let textResponse = '';
      
      for (const content of responseContent) {
        if (content.type === 'text') {
          textResponse = content.text.value;
        }
      }
      
      result = {
        thread_id: thread.id,
        assistant_id: assistantId,
        response: textResponse,
        visualizations: []
      };
    }
    
    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in chat-with-assistant function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
