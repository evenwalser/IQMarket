
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

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

    // TODO: Process the query and attachments using OpenAI's API
    // This is where you'll integrate with OpenAI's API to process the search
    // with both the text query and the attachment URLs

    console.log('Processing search query:', query)
    console.log('With attachments:', attachmentUrls)

    return new Response(
      JSON.stringify({ 
        message: 'Search request processed',
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
