
// Version 1.0.0 - BASELINE STABLE VERSION
// Features working correctly:
// - File upload and attachment handling
// - OpenAI integration with GPT-4o
// - Processing of attachments in search queries
// - CORS support and error handling

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import { Configuration, OpenAIApi } from 'https://esm.sh/openai@3.2.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { query, attachments } = await req.json()
    
    if (!query) {
      throw new Error('No search query provided')
    }

    console.log('Processing search query:', query)
    console.log('Attachments received:', attachments?.length || 0)

    // Configure Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase credentials')
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Process attachment information
    const attachmentFiles = []
    
    if (attachments && attachments.length > 0) {
      console.log('Processing attachments:', JSON.stringify(attachments.map(a => ({
        file_path: a.file_path,
        file_name: a.file_name,
        content_type: a.content_type
      }))))
      
      for (const attachment of attachments) {
        try {
          // Ensure we have the necessary attachment data
          if (!attachment.file_path || !attachment.file_name) {
            console.warn('Skipping attachment with missing data:', attachment)
            continue
          }
          
          // Get public URL for the attachment
          const { data: { publicUrl } } = supabase
            .storage
            .from('chat-attachments')
            .getPublicUrl(attachment.file_path)
            
          console.log(`Generated public URL for ${attachment.file_name}:`, publicUrl)
          
          attachmentFiles.push({
            url: publicUrl,
            type: attachment.content_type || 'application/octet-stream',
            name: attachment.file_name
          })
        } catch (error) {
          console.error(`Error processing attachment ${attachment.file_name}:`, error)
          // Continue with other attachments instead of failing the entire request
        }
      }
    }

    console.log('Successfully processed attachment URLs:', attachmentFiles.length)

    // Get OpenAI API key
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey) {
      throw new Error('OpenAI API key is not set')
    }

    // Configure OpenAI API
    const configuration = new Configuration({
      apiKey: openaiApiKey,
    })
    const openai = new OpenAIApi(configuration)

    let response = ''
    
    if (attachmentFiles.length > 0) {
      console.log('Querying OpenAI with attachments')
      
      // Create a detailed system prompt for handling attachments
      const systemPrompt = `You are a helpful assistant that analyzes documents and answers questions.
You have been provided with the following attachments:
${attachmentFiles.map(a => `- ${a.name} (${a.type}): ${a.url}`).join('\n')}

For each attachment, first analyze its content based on the URL, then use that information to answer the user's query.
If you cannot access or process an attachment, please mention this specifically in your response.
Be detailed and thorough in your answers.`
      
      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: query }
      ]

      console.log('Sending to OpenAI:', {
        model: 'gpt-4o',
        messages: messages.map(m => ({ role: m.role, contentPreview: m.content.substring(0, 50) + '...' }))
      })

      try {
        const completion = await openai.createChatCompletion({
          model: 'gpt-4o',
          messages,
        })

        response = completion.data.choices[0].message?.content || 'No response generated'
        console.log('OpenAI response received, length:', response.length)
      } catch (openaiError) {
        console.error('OpenAI API error:', openaiError)
        throw new Error(`Error from OpenAI API: ${openaiError.message || 'Unknown error'}`)
      }
    } else {
      console.log('Querying OpenAI without attachments')
      
      try {
        const completion = await openai.createChatCompletion({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: 'You are a helpful assistant.' },
            { role: 'user', content: query }
          ],
        })

        response = completion.data.choices[0].message?.content || 'No response generated'
        console.log('OpenAI response received, length:', response.length)
      } catch (openaiError) {
        console.error('OpenAI API error:', openaiError)
        throw new Error(`Error from OpenAI API: ${openaiError.message || 'Unknown error'}`)
      }
    }

    return new Response(
      JSON.stringify({ 
        message: response,
        query,
        attachments: attachmentFiles
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )
  } catch (error) {
    console.error('Error processing search:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )
  }
})
