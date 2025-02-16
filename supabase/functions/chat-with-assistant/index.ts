
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Helper function to parse markdown-style tables
function parseMarkdownTable(text: string) {
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  let tableData = [];
  let headers: string[] = [];
  let isParsingTable = false;
  let currentTable = { data: [], headers: [] as string[] };

  for (let line of lines) {
    // Check if line contains | to identify table content
    if (line.includes('|')) {
      // Clean up the line
      line = line.replace(/^\||\|$/g, '').trim();
      const cells = line.split('|').map(cell => cell.trim());

      // Skip separator lines (containing ---)
      if (line.includes('---')) {
        continue;
      }

      if (!isParsingTable) {
        // This is a header row
        headers = cells;
        isParsingTable = true;
        currentTable.headers = headers;
      } else {
        // This is a data row
        const row: Record<string, any> = {};
        cells.forEach((cell, index) => {
          if (index < headers.length) {
            const header = headers[index];
            // Clean up the cell value and convert to appropriate type
            let value = cell.replace(/\*\*/g, '').trim();
            
            // Handle different value formats
            if (value.includes('~')) {
              value = value.replace('~', '');
            }
            if (value.includes('$')) {
              value = value.replace('$', '').replace('K', '000').replace('M', '000000');
            }
            if (value.includes('%')) {
              value = value.replace('%', '');
            }
            if (value === '-' || value === 'N/A' || value === '') {
              value = null;
            }
            
            // Convert to number if possible
            const numValue = parseFloat(value);
            row[header] = isNaN(numValue) ? value : numValue;
          }
        });
        currentTable.data.push(row);
      }
    } else {
      // If we were parsing a table and hit a non-table line, store the current table
      if (isParsingTable && currentTable.data.length > 0) {
        tableData.push({
          type: 'table',
          data: currentTable.data,
          headers: currentTable.headers
        });
        // Reset for next table
        currentTable = { data: [], headers: [] };
        isParsingTable = false;
      }
    }
  }

  // Add the last table if we were still parsing one
  if (isParsingTable && currentTable.data.length > 0) {
    tableData.push({
      type: 'table',
      data: currentTable.data,
      headers: currentTable.headers
    });
  }

  return tableData;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 204,
      headers: corsHeaders 
    });
  }

  try {
    const { message, assistantType, attachments } = await req.json();
    console.log('Received request:', { 
      message, 
      assistantType, 
      attachments: attachments?.map(a => ({ url: a.url, name: a.name }))
    });

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not found');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Get the assistant ID
    const { data: assistantId, error: assistantError } = await supabase
      .rpc('get_assistant_id', { assistant_type: assistantType });

    if (assistantError || !assistantId) {
      console.error('Error getting assistant ID:', assistantError);
      throw new Error(`Failed to get assistant ID for type ${assistantType}`);
    }

    console.log('Using assistant ID:', assistantId);

    // Create a thread first
    const threadResponse = await fetch('https://api.openai.com/v1/threads', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v2'
      },
    });

    if (!threadResponse.ok) {
      const error = await threadResponse.text();
      console.error('Thread creation error:', error);
      throw new Error(`Failed to create thread: ${error}`);
    }

    const thread = await threadResponse.json();
    console.log('Thread created:', thread);

    // Upload files to OpenAI and add them to the thread
    const uploadedFiles = [];
    if (attachments && attachments.length > 0) {
      console.log(`Processing ${attachments.length} attachments...`);
      
      for (const attachment of attachments) {
        console.log('Processing attachment:', {
          name: attachment.name,
          url: attachment.url,
          type: attachment.type
        });
        
        try {
          // Fetch the file from the Supabase URL
          const response = await fetch(attachment.url);
          console.log('Fetch response status:', response.status);
          
          if (!response.ok) {
            throw new Error(`Failed to fetch file from URL: ${response.statusText}`);
          }

          // Get the file data
          const fileBlob = await response.blob();
          console.log('File blob size:', fileBlob.size);
          
          // Create form data
          const formData = new FormData();
          formData.append('file', fileBlob, attachment.name);
          formData.append('purpose', 'assistants');
          
          // Upload to OpenAI
          console.log('Uploading to OpenAI...');
          const uploadResponse = await fetch('https://api.openai.com/v1/files', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${openAIApiKey}`
            },
            body: formData,
          });
          
          if (!uploadResponse.ok) {
            const errorText = await uploadResponse.text();
            console.error('OpenAI upload error:', errorText);
            throw new Error(`Failed to upload file to OpenAI: ${errorText}`);
          }
          
          const fileData = await uploadResponse.json();
          console.log('File uploaded successfully to OpenAI:', fileData);
          
          // Add file to thread
          const fileAttachmentResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/messages`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${openAIApiKey}`,
              'Content-Type': 'application/json',
              'OpenAI-Beta': 'assistants=v2'
            },
            body: JSON.stringify({
              role: 'user',
              content: '',
              file_ids: [fileData.id]
            }),
          });

          if (!fileAttachmentResponse.ok) {
            const errorText = await fileAttachmentResponse.text();
            console.error('File attachment error:', errorText);
            throw new Error(`Failed to attach file to thread: ${errorText}`);
          }

          uploadedFiles.push(fileData.id);
        } catch (error) {
          console.error('Error processing attachment:', error);
        }
      }
    }

    // Send the user's message to the thread
    const messageResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v2'
      },
      body: JSON.stringify({
        role: 'user',
        content: message
      }),
    });

    if (!messageResponse.ok) {
      const error = await messageResponse.text();
      console.error('Message creation error:', error);
      throw new Error(`Failed to create message: ${error}`);
    }

    const messageResult = await messageResponse.json();
    console.log('Message created:', messageResult);

    // Start the run
    const runResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/runs`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v2'
      },
      body: JSON.stringify({
        assistant_id: assistantId,
      }),
    });

    if (!runResponse.ok) {
      const error = await runResponse.text();
      console.error('Run creation error:', error);
      throw new Error(`Failed to create run: ${error}`);
    }

    const run = await runResponse.json();
    console.log('Run created:', run);

    // Poll for completion
    let runStatus;
    let attempts = 0;
    const maxAttempts = 60;

    do {
      if (attempts >= maxAttempts) {
        throw new Error('Run timed out after 60 seconds');
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const statusResponse = await fetch(
        `https://api.openai.com/v1/threads/${thread.id}/runs/${run.id}`,
        {
          headers: {
            'Authorization': `Bearer ${openAIApiKey}`,
            'Content-Type': 'application/json',
            'OpenAI-Beta': 'assistants=v2'
          },
        }
      );

      if (!statusResponse.ok) {
        const error = await statusResponse.text();
        console.error('Status check error:', error);
        throw new Error(`Failed to check run status: ${error}`);
      }

      runStatus = await statusResponse.json();
      console.log('Run status:', runStatus.status);
      attempts++;
    } while (runStatus.status === 'in_progress' || runStatus.status === 'queued');

    if (runStatus.status === 'completed') {
      const messagesResponse = await fetch(
        `https://api.openai.com/v1/threads/${thread.id}/messages?limit=1`,
        {
          headers: {
            'Authorization': `Bearer ${openAIApiKey}`,
            'Content-Type': 'application/json',
            'OpenAI-Beta': 'assistants=v2'
          },
        }
      );

      if (!messagesResponse.ok) {
        const error = await messagesResponse.text();
        console.error('Messages retrieval error:', error);
        throw new Error(`Failed to retrieve messages: ${error}`);
      }

      const messagesData = await messagesResponse.json();
      const lastMessage = messagesData.data[0];
      console.log('Last message:', lastMessage);

      let responseText = '';
      let visualizations = [];

      if (lastMessage.content && Array.isArray(lastMessage.content)) {
        for (const content of lastMessage.content) {
          if (content.type === 'text') {
            const text = content.text.value;
            responseText = text;

            // Parse any tables in the response
            const tables = parseMarkdownTable(text);
            if (tables.length > 0) {
              visualizations.push(...tables);
            }
          }
        }
      }

      return new Response(
        JSON.stringify({
          response: responseText,
          thread_id: thread.id,
          assistant_id: assistantId,
          visualizations: visualizations
        }),
        { 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          } 
        }
      );
    } else {
      console.error('Run failed with status:', runStatus);
      throw new Error(`Run ended with status: ${runStatus.status}`);
    }

  } catch (error) {
    console.error('Error in chat-with-assistant:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.stack 
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        }
      }
    );
  }
});
