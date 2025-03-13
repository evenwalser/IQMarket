
// Import specific modules we need rather than the entire OpenAI SDK
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Handle CORS preflight requests
 */
function handleCors() {
  return new Response('ok', { headers: corsHeaders });
}

/**
 * Get Supabase client instance
 */
function getSupabaseClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
  return createClient(supabaseUrl, supabaseAnonKey);
}

/**
 * Fetch the assistant ID for the given assistant type
 */
async function getAssistantId(supabase, assistantType) {
  const { data: assistantId, error: assistantError } = await supabase.rpc(
    'get_assistant_id',
    { assistant_type: assistantType }
  );

  if (assistantError) {
    console.error(`Error fetching assistant ID for ${assistantType}:`, assistantError);
    throw new Error(`Error fetching assistant ID: ${assistantError.message}`);
  }

  if (!assistantId) {
    console.error(`No assistant ID found for type: ${assistantType}`);
    throw new Error(`No assistant ID found for type: ${assistantType}. Please ensure the assistant is properly configured in the database.`);
  }

  console.log(`Using assistant ID for ${assistantType}:`, assistantId);
  return assistantId;
}

/**
 * Create a new thread or use an existing one
 */
async function getOrCreateThread(openAIApiKey, threadId) {
  if (threadId) {
    console.log("Using existing thread ID:", threadId);
    return threadId;
  }

  console.log("Creating new thread via direct API call");
  const threadResponse = await fetch('https://api.openai.com/v1/threads', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
      'OpenAI-Beta': 'assistants=v2'
    },
    body: JSON.stringify({})
  });
  
  if (!threadResponse.ok) {
    const errorData = await threadResponse.json();
    throw new Error(`Failed to create thread: ${JSON.stringify(errorData)}`);
  }
  
  const threadData = await threadResponse.json();
  console.log("Created new thread:", threadData.id);
  return threadData.id;
}

/**
 * Upload a file to OpenAI
 */
async function uploadFileToOpenAI(openAIApiKey, fileBlob, fileName) {
  const formData = new FormData();
  formData.append('purpose', 'assistants');
  formData.append('file', fileBlob, fileName || 'attachment');
  
  console.log(`Uploading file to OpenAI: ${fileName}`);
  const uploadResponse = await fetch('https://api.openai.com/v1/files', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`
    },
    body: formData
  });
  
  if (!uploadResponse.ok) {
    const errorData = await uploadResponse.json();
    throw new Error(`Failed to upload file to OpenAI: ${JSON.stringify(errorData)}`);
  }
  
  const uploadData = await uploadResponse.json();
  console.log(`File uploaded to OpenAI successfully with ID: ${uploadData.id}`);
  return uploadData.id;
}

/**
 * Process attachments for the message
 */
async function processAttachments(openAIApiKey, attachments, messageContent) {
  if (!attachments || attachments.length === 0) {
    return messageContent;
  }

  console.log(`Processing ${attachments.length} attachments for OpenAI`);
  
  for (const attachment of attachments) {
    try {
      // Get the file from the public URL
      console.log(`Fetching file from URL: ${attachment.url}`);
      const fileResponse = await fetch(attachment.url);
      
      if (!fileResponse.ok) {
        console.error(`Failed to fetch file from URL: ${attachment.url}, status: ${fileResponse.status}`);
        continue;
      }
      
      // Get the file as blob
      const fileBlob = await fileResponse.blob();
      
      // Upload file to OpenAI
      const fileId = await uploadFileToOpenAI(openAIApiKey, fileBlob, attachment.file_name);
      
      // Add the file attachment to the message content
      messageContent.push({
        type: 'file_attachment',
        file_id: fileId
      });
    } catch (fileError) {
      console.error(`Error processing attachment: ${fileError.message}`);
    }
  }
  
  return messageContent;
}

/**
 * Add a message to the thread
 */
async function addMessageToThread(openAIApiKey, threadId, messageContent) {
  console.log("Adding message to thread with content:", JSON.stringify(messageContent));
  const messageResponse = await fetch(`https://api.openai.com/v1/threads/${threadId}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
      'OpenAI-Beta': 'assistants=v2'
    },
    body: JSON.stringify({
      role: 'user',
      content: messageContent
    })
  });
  
  if (!messageResponse.ok) {
    const errorData = await messageResponse.json();
    throw new Error(`Failed to add message: ${JSON.stringify(errorData)}`);
  }
}

/**
 * Get enhanced instructions based on assistant type
 */
function getEnhancedInstructions(assistantType, structuredOutput) {
  let instructions = `IMPORTANT: You must ONLY provide information that is available in your vector database. Do not generate or provide information from your general knowledge. If the answer is not in your vector database, explicitly state that the information is not available in your knowledge base.`;
  
  // Add specific formatting instructions for the benchmarks assistant
  if (assistantType === 'benchmarks') {
    instructions += `
Format your response as follows:
1. First, provide a brief introduction to the requested benchmark data.
2. For each key benchmark or metric:
   - Present the data in one of two formats:
     a. For COMPARATIVE data (company vs benchmark), use structured JSON blocks like this:
        \`\`\`json
        {
          "type": "table",
          "title": "Revenue Comparison",
          "data": [
            {"Metric": "ARR", "Company": "$1.5M", "Industry Benchmark": "$2.1M"},
            {"Metric": "Growth Rate", "Company": "15%", "Industry Benchmark": "22%"}
          ]
        }
        \`\`\`
     b. For TREND data, use chart visualizations like this:
        \`\`\`json
        {
          "type": "chart",
          "chartType": "bar",
          "title": "Monthly Active Users",
          "xKey": "Month",
          "yKeys": ["Users"],
          "data": [
            {"Month": "Jan", "Users": 1500},
            {"Month": "Feb", "Users": 1720},
            {"Month": "Mar", "Users": 2100}
          ]
        }
        \`\`\`
3. After each visualization, provide a brief analysis of what the data means.
4. Conclude with overall insights and recommendations.

If you need to include tables directly in the text, still use standard markdown formatting.
`;
  } else if (assistantType === 'frameworks') {
    instructions += `
Format your response as follows:
1. Provide a brief introduction to the requested framework or strategic approach.
2. For key components of the framework:
   - Use clear headings and structured sections
   - Present the core elements in a systematic way
   - Use markdown formatting for better readability
   - Where relevant, use diagrams or structured JSON blocks like this:
      \`\`\`json
      {
        "type": "table",
        "title": "Framework Components",
        "data": [
          {"Step": "Step 1", "Description": "Define the problem", "Key Activities": "Research, stakeholder interviews"},
          {"Step": "Step 2", "Description": "Generate solutions", "Key Activities": "Brainstorming, prioritization"}
        ]
      }
      \`\`\`
3. Conclude with practical implementation advice and potential challenges.

Use examples from the knowledge base whenever possible to illustrate how the framework has been applied successfully.
`;
  } else {
    // Template for JSON visualization
    const jsonTemplate = structuredOutput ? `Please provide structured data for visualization when relevant. For tables and charts, use JSON blocks like this:
\\\`\\\`\\\`json
{
  "type": "table",
  "title": "Key Metrics",
  "data": [
    {"Metric": "Value 1", "Result": "42"},
    {"Metric": "Value 2", "Result": "73"}
  ]
}
\\\`\\\`\\\`
or
\\\`\\\`\\\`json
{
  "type": "chart",
  "chartType": "bar",
  "title": "Monthly Trend",
  "xKey": "Month",
  "yKeys": ["Value"],
  "data": [
    {"Month": "Jan", "Value": 42},
    {"Month": "Feb", "Value": 73}
  ]
}
\\\`\\\`\\\``: "";

    instructions += ` ${jsonTemplate}`;
  }
  
  return instructions;
}

/**
 * Run the assistant on the thread
 */
async function runAssistant(openAIApiKey, threadId, assistantId, instructions) {
  console.log(`Running assistant ${assistantId} with enhanced instructions for thread ${threadId}`);
  const runResponse = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
      'OpenAI-Beta': 'assistants=v2'
    },
    body: JSON.stringify({
      assistant_id: assistantId,
      instructions: instructions
    })
  });
  
  if (!runResponse.ok) {
    const errorData = await runResponse.json();
    throw new Error(`Failed to start run: ${JSON.stringify(errorData)}`);
  }
  
  const runData = await runResponse.json();
  console.log("Started run:", runData.id);
  return runData.id;
}

/**
 * Poll for run completion
 */
async function waitForRunCompletion(openAIApiKey, threadId, runId) {
  let currentRun;
  let runStatus = 'in_progress';
  let retryCount = 0;
  const maxRetries = 30; // Limit retries to avoid infinite loops
  
  while (runStatus !== 'completed' && runStatus !== 'failed' && retryCount < maxRetries) {
    console.log(`Checking run status (attempt ${retryCount + 1}/${maxRetries})...`);
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const runCheckResponse = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs/${runId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v2'
      }
    });
    
    if (!runCheckResponse.ok) {
      const errorData = await runCheckResponse.json();
      console.error(`Failed to check run status: ${JSON.stringify(errorData)}`);
      
      // If we get an error, increment retry count but continue
      retryCount++;
      
      if (retryCount >= maxRetries) {
        throw new Error(`Failed to check run status after ${maxRetries} attempts: ${JSON.stringify(errorData)}`);
      }
      
      continue;
    }
    
    currentRun = await runCheckResponse.json();
    runStatus = currentRun.status;
    console.log(`Run status: ${runStatus}, details:`, JSON.stringify(currentRun.status_details || {}));
    
    // If the run is in a terminal state, break out of the loop
    if (runStatus === 'completed' || runStatus === 'failed' || runStatus === 'cancelled' || runStatus === 'expired') {
      break;
    }
    
    retryCount++;
  }
  
  if (runStatus === 'failed') {
    console.error(`Run failed with details:`, JSON.stringify(currentRun));
    throw new Error(`Run failed with reason: ${currentRun?.last_error?.message || 'Unknown error'}`);
  }
  
  if (runStatus !== 'completed') {
    throw new Error(`Run did not complete successfully. Status: ${runStatus}`);
  }
  
  return currentRun;
}

/**
 * Get the latest assistant message
 */
async function getLatestMessage(openAIApiKey, threadId) {
  console.log("Run completed, retrieving messages");
  const messagesResponse = await fetch(`https://api.openai.com/v1/threads/${threadId}/messages`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
      'OpenAI-Beta': 'assistants=v2'
    }
  });
  
  if (!messagesResponse.ok) {
    const errorData = await messagesResponse.json();
    throw new Error(`Failed to retrieve messages: ${JSON.stringify(errorData)}`);
  }
  
  const messagesData = await messagesResponse.json();
  const assistantMessages = messagesData.data.filter(msg => msg.role === 'assistant');
  
  if (assistantMessages.length === 0) {
    throw new Error("No assistant messages found in thread");
  }
  
  return assistantMessages[0];
}

/**
 * Process the assistant's response
 */
function processAssistantResponse(latestMessage) {
  let responseText = '';
  let visualizations = [];
  
  for (const content of latestMessage.content) {
    if (content.type === 'text') {
      responseText += content.text.value;
    }
  }
  
  // Process structured data for visualization
  const jsonRegex = /```json\n([\s\S]*?)\n```/g;
  let match;
  while ((match = jsonRegex.exec(responseText)) !== null) {
    try {
      const jsonData = JSON.parse(match[1]);
      
      if (jsonData.type && (jsonData.type === 'table' || jsonData.type === 'chart') && jsonData.data) {
        const vizId = crypto.randomUUID();
        const visualization = {
          id: vizId,
          ...jsonData
        };
        visualizations.push(visualization);
      }
    } catch (e) {
      console.error('Error parsing JSON in response:', e);
    }
  }
  
  // Clean up the response
  responseText = responseText.replace(jsonRegex, '');
  
  console.log("Successfully processed response with visualizations:", visualizations.length);
  
  return {
    responseText,
    visualizations
  };
}

/**
 * Main function to handle chat with assistant
 */
Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return handleCors();
  }

  try {
    // Get request body
    const { message, assistantType, attachments = [], structuredOutput = false, threadId } = await req.json();

    console.log("Request received:", { 
      message, 
      assistantType, 
      attachmentsCount: attachments.length, 
      structuredOutput, 
      threadId 
    });

    // Validate the assistant type is one of the allowed values
    const validAssistantTypes = ['knowledge', 'benchmarks', 'frameworks'];
    if (!validAssistantTypes.includes(assistantType)) {
      throw new Error(`Invalid assistant type: ${assistantType}. Must be one of: ${validAssistantTypes.join(', ')}`);
    }

    // Get Supabase client
    const supabase = getSupabaseClient();
    
    // Get assistant ID based on the type
    const assistantId = await getAssistantId(supabase, assistantType);

    // Get OpenAI API key
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error("OpenAI API key is not set");
    }
    
    // Create or retrieve thread
    const threadId2 = await getOrCreateThread(openAIApiKey, threadId);
    
    // Process message content
    let messageContent = [{
      type: 'text',
      text: message
    }];
    
    // Process attachments if present
    if (attachments && attachments.length > 0) {
      messageContent = await processAttachments(openAIApiKey, attachments, messageContent);
    }
    
    // Add message to thread
    await addMessageToThread(openAIApiKey, threadId2, messageContent);
    
    // Get enhanced instructions
    const enhancedInstructions = getEnhancedInstructions(assistantType, structuredOutput);
    
    // Run the assistant
    const runId = await runAssistant(openAIApiKey, threadId2, assistantId, enhancedInstructions);
    
    // Wait for the run to complete
    await waitForRunCompletion(openAIApiKey, threadId2, runId);
    
    // Get the latest message
    const latestMessage = await getLatestMessage(openAIApiKey, threadId2);
    
    // Process the response
    const { responseText, visualizations } = processAssistantResponse(latestMessage);
    
    // Return the response
    return new Response(
      JSON.stringify({
        thread_id: threadId2,
        assistant_id: assistantId,
        response: responseText,
        visualizations: visualizations.length > 0 ? visualizations : []
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error("Function error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
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
