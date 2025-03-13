
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
    console.log('With attachments:', attachments?.length || 0)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const attachmentUrls = []

    // Get public URLs for all attachments
    if (attachments && attachments.length > 0) {
      for (const attachment of attachments) {
        const { data: { publicUrl } } = supabase
          .storage
          .from('chat-attachments')
          .getPublicUrl(attachment.file_path)
        
        attachmentUrls.push({
          url: publicUrl,
          type: attachment.content_type,
          name: attachment.file_name
        })
      }
    }

    console.log('Processed attachment URLs:', attachmentUrls)

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

    let response
    if (attachmentUrls.length > 0) {
      console.log('Querying OpenAI with attachments')
      // For now, we'll just send a basic query with the URLs as text
      // In a more advanced implementation, you would process different file types differently
      const messages = [{
        role: 'system',
        content: 'You are a helpful assistant that can answer questions based on the provided context and attachments. Analyze any attachments carefully to provide accurate information.'
      }, {
        role: 'user',
        content: `Query: ${query}\nAttachments: ${attachmentUrls.map(a => `${a.name} (${a.type}): ${a.url}`).join('\n')}`
      }]

      const completion = await openai.createChatCompletion({
        model: 'gpt-4',
        messages,
      })

      response = completion.data.choices[0].message?.content || 'No response generated'
    } else {
      console.log('Querying OpenAI without attachments')
      const completion = await openai.createChatCompletion({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: query }
        ],
      })

      response = completion.data.choices[0].message?.content || 'No response generated'
    }

    console.log('Generated response:', response.substring(0, 100) + '...')

    return new Response(
      JSON.stringify({ 
        message: response,
        query,
        attachments: attachmentUrls
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
