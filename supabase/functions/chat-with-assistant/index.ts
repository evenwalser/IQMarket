// Import specific modules we need rather than the entire OpenAI SDK
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get request body
    const { message, assistantType, attachments = [], structuredOutput = false, threadId } = await req.json();

    console.log("Request received:", { message, assistantType, attachmentsCount: attachments.length, structuredOutput, threadId });

    // Get Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    // Get our assistant ID based on the type from our database function
    const { data: assistantId, error: assistantError } = await supabase.rpc(
      'get_assistant_id',
      { assistant_type: assistantType }
    );

    if (assistantError) {
      throw new Error(`Error fetching assistant ID: ${assistantError.message}`);
    }

    // If no assistant ID was returned, throw an error
    if (!assistantId) {
      throw new Error(`No assistant ID found for type: ${assistantType}`);
    }

    console.log("Using assistant ID:", assistantId);

    // Get OpenAI API key
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error("OpenAI API key is not set");
    }
    
    // Create or retrieve thread using v2 API
    let threadId2 = threadId;
    if (!threadId2) {
      console.log("Creating new thread via direct API call");
      const threadResponse = await fetch('https://api.openai.com/v1/threads', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
          'OpenAI-Beta': 'assistants=v2'  // Update to v2
        },
        body: JSON.stringify({})
      });
      
      if (!threadResponse.ok) {
        const errorData = await threadResponse.json();
        throw new Error(`Failed to create thread: ${JSON.stringify(errorData)}`);
      }
      
      const threadData = await threadResponse.json();
      threadId2 = threadData.id;
    }
    
    console.log("Using thread ID:", threadId2);
    
    // Process file attachments for benchmarks if provided
    let fileIds = [];
    
    if (attachments.length > 0 && assistantType === 'benchmarks') {
      console.log("Processing attachments for benchmark analysis");
      
      for (const attachment of attachments) {
        try {
          // Download the file from Supabase storage
          const { data: fileData, error: downloadError } = await supabase
            .storage
            .from('chat-attachments')
            .download(attachment.file_path);
            
          if (downloadError) {
            console.error("Error downloading file:", downloadError);
            throw downloadError;
          }
          
          // Upload the file to OpenAI
          const formData = new FormData();
          formData.append('file', fileData, attachment.file_name);
          formData.append('purpose', 'assistants');
          
          const uploadResponse = await fetch('https://api.openai.com/v1/files', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${openAIApiKey}`
            },
            body: formData
          });
          
          if (!uploadResponse.ok) {
            const uploadError = await uploadResponse.json();
            console.error("Error uploading file to OpenAI:", uploadError);
            throw new Error(`Failed to upload file to OpenAI: ${JSON.stringify(uploadError)}`);
          }
          
          const uploadData = await uploadResponse.json();
          fileIds.push(uploadData.id);
          console.log(`File ${attachment.file_name} uploaded to OpenAI with ID ${uploadData.id}`);
        } catch (error) {
          console.error("Error processing file attachment:", error);
          // Continue with other files
        }
      }
    }
    
    // Add message content based on type
    let messageContent = message;
    
    // If it's a benchmark request with files, add special instructions
    if (assistantType === 'benchmarks' && attachments.length > 0) {
      messageContent = `${message}\n\nI'm attaching ${attachments.length} file(s) with data for analysis. Please:
1. Parse and analyze the data
2. Generate appropriate visualizations (charts/graphs)
3. Provide benchmark comparisons where possible
4. Highlight key trends and anomalies`;
    }
    
    // Add message to thread with v2 API
    console.log("Adding message to thread");
    const messageResponse = await fetch(`https://api.openai.com/v1/threads/${threadId2}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v2'  // Update to v2
      },
      body: JSON.stringify({
        role: 'user',
        content: messageContent,
        // Add file attachments if available
        ...(fileIds.length > 0 ? { file_ids: fileIds } : {})
      })
    });
    
    if (!messageResponse.ok) {
      const errorData = await messageResponse.json();
      throw new Error(`Failed to add message: ${JSON.stringify(errorData)}`);
    }
    
    // Configure run options based on assistant type
    const runOptions = {
      assistant_id: assistantId,
      // Add special instructions for benchmark assistant to format output
      instructions: assistantType === 'benchmarks' 
        ? "Please provide analysis with visualizations. Format data for clear display. For spreadsheets and data files, use Python to generate charts and tables. Ensure all numeric data is formatted properly in tables. Include detailed explanations of trends and insights."
        : (structuredOutput 
            ? "Please provide structured data for visualization when relevant. Format data as clean arrays of objects for tables and charts. Include clear, descriptive headers."
            : undefined)
    };
    
    // Run the assistant with v2 API
    console.log("Running assistant with options:", runOptions);
    const runResponse = await fetch(`https://api.openai.com/v1/threads/${threadId2}/runs`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v2'  // Update to v2
      },
      body: JSON.stringify(runOptions)
    });
    
    if (!runResponse.ok) {
      const errorData = await runResponse.json();
      throw new Error(`Failed to start run: ${JSON.stringify(errorData)}`);
    }
    
    const runData = await runResponse.json();
    const runId = runData.id;
    console.log("Started run:", runId);
    
    // Poll for run completion with v2 API
    let currentRun;
    let runStatus = 'in_progress';
    
    while (runStatus !== 'completed' && runStatus !== 'failed') {
      console.log("Checking run status...");
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const runCheckResponse = await fetch(`https://api.openai.com/v1/threads/${threadId2}/runs/${runId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
          'OpenAI-Beta': 'assistants=v2'  // Update to v2
        }
      });
      
      if (!runCheckResponse.ok) {
        const errorData = await runCheckResponse.json();
        throw new Error(`Failed to check run status: ${JSON.stringify(errorData)}`);
      }
      
      currentRun = await runCheckResponse.json();
      runStatus = currentRun.status;
      console.log("Run status:", runStatus);
    }
    
    if (runStatus === 'failed') {
      throw new Error(`Run failed with reason: ${currentRun?.last_error?.message || 'Unknown error'}`);
    }
    
    // Get messages with v2 API
    console.log("Run completed, retrieving messages");
    const messagesResponse = await fetch(`https://api.openai.com/v1/threads/${threadId2}/messages`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v2'  // Update to v2
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
    
    const latestMessage = assistantMessages[0];
    
    // Process the response
    let responseText = '';
    let visualizations = [];
    
    // Handle different content types (text, image, etc.)
    for (const content of latestMessage.content) {
      if (content.type === 'text') {
        responseText += content.text.value;
      } else if (content.type === 'image_file') {
        // Process image created by the assistant
        try {
          // Get file content
          const imageId = content.image_file.file_id;
          console.log("Processing image file:", imageId);
          
          // Get image information
          const fileInfoResponse = await fetch(`https://api.openai.com/v1/files/${imageId}`, {
            headers: {
              'Authorization': `Bearer ${openAIApiKey}`,
              'OpenAI-Beta': 'assistants=v2'
            }
          });
          
          if (!fileInfoResponse.ok) {
            throw new Error("Failed to get file info");
          }
          
          const fileInfo = await fileInfoResponse.json();
          console.log("File info:", fileInfo);
          
          // Get file content
          const fileResponse = await fetch(`https://api.openai.com/v1/files/${imageId}/content`, {
            headers: {
              'Authorization': `Bearer ${openAIApiKey}`,
              'OpenAI-Beta': 'assistants=v2'
            }
          });
          
          if (!fileResponse.ok) {
            throw new Error("Failed to get file content");
          }
          
          // Extract image data
          const imageBlob = await fileResponse.blob();
          const reader = new FileReader();
          const imageDataPromise = new Promise<string>((resolve) => {
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(imageBlob);
          });
          
          const imageData = await imageDataPromise;
          
          // Create a visualization for the image
          const vizId = crypto.randomUUID();
          const imageVisualization = {
            id: vizId,
            type: 'chart',
            chartType: 'image',
            title: 'Generated Chart',
            imageData: imageData
          };
          
          visualizations.push(imageVisualization);
          console.log("Added image visualization");
          
          // Add a placeholder in the text
          responseText += `\n\n[Chart: Generated visualization from your data]\n\n`;
        } catch (error) {
          console.error("Error processing image file:", error);
        }
      }
    }
    
    // Process structured data for visualization (from markdown code blocks)
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
