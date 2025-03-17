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
async function uploadFileToOpenAI(openAIApiKey, fileUrl, fileName) {
  console.log(`Downloading file from URL: ${fileUrl}`);
  
  try {
    // First, download the file from our Supabase storage URL
    const fileResponse = await fetch(fileUrl);
    
    if (!fileResponse.ok) {
      throw new Error(`Failed to download file from URL: ${fileUrl}, status: ${fileResponse.status}`);
    }
    
    // Get file content type
    const contentType = fileResponse.headers.get('content-type') || 'application/octet-stream';
    console.log(`File content type: ${contentType}`);
    
    // Convert the downloaded file to a blob
    const fileBlob = await fileResponse.blob();
    console.log(`Downloaded file size: ${fileBlob.size} bytes`);
    
    // Prepare form data for OpenAI upload
    const formData = new FormData();
    formData.append('purpose', 'assistants');
    formData.append('file', fileBlob, fileName || 'attachment');
    
    console.log(`Uploading file to OpenAI: ${fileName || 'attachment'}`);
    const uploadResponse = await fetch('https://api.openai.com/v1/files', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`
      },
      body: formData
    });
    
    if (!uploadResponse.ok) {
      const errorData = await uploadResponse.json();
      console.error('Upload error response:', errorData);
      throw new Error(`Failed to upload file to OpenAI: ${JSON.stringify(errorData)}`);
    }
    
    const uploadData = await uploadResponse.json();
    console.log(`File uploaded to OpenAI successfully with ID: ${uploadData.id}`);
    return uploadData.id;
  } catch (error) {
    console.error(`Error processing file from URL ${fileUrl}:`, error);
    throw new Error(`Error processing file: ${error.message}`);
  }
}

/**
 * Process attachments for the message
 */
async function processAttachments(openAIApiKey, attachments) {
  if (!attachments || attachments.length === 0) {
    return [];
  }

  console.log(`Processing ${attachments.length} attachments for OpenAI`);
  const openAIFileIds = [];
  
  for (const attachment of attachments) {
    try {
      if (!attachment.url || !attachment.file_name) {
        console.warn(`Skipping attachment with missing data:`, attachment);
        continue;
      }
      
      console.log(`Processing attachment: ${attachment.file_name} (${attachment.content_type}) from URL: ${attachment.url}`);
      
      // Upload file to OpenAI and get the file ID
      const fileId = await uploadFileToOpenAI(openAIApiKey, attachment.url, attachment.file_name);
      openAIFileIds.push(fileId);
      console.log(`Successfully added file ID ${fileId} to list`);
    } catch (fileError) {
      console.error(`Error processing attachment: ${fileError.message}`);
    }
  }
  
  console.log(`Finished processing attachments, got ${openAIFileIds.length} valid file IDs`);
  return openAIFileIds;
}

/**
 * Add a message to the thread
 */
async function addMessageToThread(openAIApiKey, threadId, message, fileIds = []) {
  console.log(`Adding message to thread with ${fileIds.length} file IDs:`, fileIds);
  
  try {
    // Create the message with file_ids if available
    const messageData = {
      role: 'user',
      content: message,
      file_ids: fileIds.length > 0 ? fileIds : undefined
    };
    
    console.log("Full message data being sent:", JSON.stringify(messageData));
    
    const messageResponse = await fetch(`https://api.openai.com/v1/threads/${threadId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v2'
      },
      body: JSON.stringify(messageData)
    });
    
    if (!messageResponse.ok) {
      const errorData = await messageResponse.json();
      console.error(`Failed message data:`, JSON.stringify(messageData));
      console.error(`Error response:`, errorData);
      throw new Error(`Failed to add message: ${JSON.stringify(errorData)}`);
    }
    
    const messageResponseData = await messageResponse.json();
    const messageId = messageResponseData.id;
    console.log("Message added to thread successfully:", messageId);
    return true;
  } catch (error) {
    console.error("Error adding message to thread:", error);
    throw error;
  }
}

/**
 * Get enhanced instructions based on assistant type
 */
function getEnhancedInstructions(assistantType, structuredOutput) {
  // Base instructions - adding STRONGER vector database constraints
  let instructions = `CRITICAL REQUIREMENT: You MUST ONLY provide information that is EXPLICITLY available in your vector database. DO NOT generate or provide information from your general knowledge. If the answer is not in your vector database, you MUST explicitly state that the information is not available in your knowledge base. DO NOT attempt to be helpful by providing information outside of your vector database.`;
  
  // Add formatting guidelines for all responses
  instructions += `
  
FORMAT YOUR RESPONSE CAREFULLY:
1. Use proper markdown formatting with appropriate spacing:
   - Use "# " for main headings (note the space after #)
   - Use "## " for subheadings (note the space after ##)
   - Use "### " for section headings (note the space after ###)
   - Use proper list formatting with spaces after bullets or numbers
   - Ensure paragraphs have a blank line between them

2. Structure your response clearly:
   - Start with a concise introduction
   - Use clear section headings
   - Present key points in organized lists or paragraphs 
   - End with a brief conclusion or summary

3. DO NOT include citation references like [16:8*source] in your text

4. Present information in a clean, professional, and easy-to-read format

5. If the answer to a user's question is not available in your vector database, state: "I don't have that information in my knowledge base." Do not guess or make up information.
`;
  
  // Add specific formatting instructions for the benchmarks assistant
  if (assistantType === 'benchmarks') {
    instructions += `
VERY IMPORTANT: When analyzing PDF FILES, THOROUGHLY EXTRACT ALL NUMERIC DATA and STATISTICS from the documents. Extract EXACT NUMBERS for metrics like revenue, growth rates, customer counts, etc. DO NOT use placeholder values like "X%" or "$Y" - provide the ACTUAL NUMERIC VALUES found in the documents.

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
   - Use clear headings with proper markdown syntax (e.g., "## Strategy Components")
   - Present the core elements in a systematic way
   - Use proper markdown formatting for better readability
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
    const jsonTemplate = structuredOutput ? `Please provide structured data for visualization when relevant. For tables and charts, use JSON blocks like this:
\`\`\`json
{
  "type": "table",
  "title": "Key Metrics",
  "data": [
    {"Metric": "Value 1", "Result": "42"},
    {"Metric": "Value 2", "Result": "73"}
  ]
}
\`\`\`
or
\`\`\`json
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
\`\`\``: "";

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
  
  // Remove any citation markers
  responseText = responseText.replace(/\[\d+:\d+\*source\]/g, '');
  
  // Fix markdown headings
  responseText = responseText.replace(/^###(?!\s)/gm, '### ');
  responseText = responseText.replace(/^##(?!\s)/gm, '## ');
  responseText = responseText.replace(/^#(?!\s)/gm, '# ');
  
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
    
    // Process attachments if present
    let fileIds = [];
    if (attachments && attachments.length > 0) {
      console.log(`Processing ${attachments.length} attachments for thread ${threadId2}`);
      fileIds = await processAttachments(openAIApiKey, attachments);
      console.log(`Processed ${fileIds.length} file IDs for OpenAI:`, fileIds);
    }
    
    // Add message to thread with file IDs
    await addMessageToThread(openAIApiKey, threadId2, message, fileIds);
    
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
        visualizations: visualizations.length > 0 ? visualizations : [],
        run_id: runId
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
