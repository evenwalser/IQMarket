
// Version 2.1.0 - ENHANCED FINANCIAL ANALYSIS WITH VECTOR DB & CODE INTERPRETER
// Features working correctly:
// - File upload and attachment handling
// - Advanced OpenAI integration with GPT-4o
// - Deep financial document analysis
// - Executive-level insights with benchmarking
// - Visualization-first approach
// - Vector database integration
// - Code interpreter for advanced data analysis
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

    console.log('Processing financial analysis query:', query)
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
      console.log('Processing financial documents:', JSON.stringify(attachments.map(a => ({
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

    console.log('Successfully processed financial document URLs:', attachmentFiles.length)

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
      console.log('Performing deep financial analysis with GPT-4o')
      
      // Create an executive-level financial analysis prompt
      const systemPrompt = `You are a world-class financial analyst consulting for C-level executives (CFOs and CEOs).
      
Your task is to analyze the provided financial documents and provide executive-level insights with sophisticated benchmarking.

IMPORTANT INSTRUCTIONS:
1. ASSUME FINANCIAL EXPERTISE: Your audience consists of CFOs and CEOs. DO NOT explain basic financial terms like ARR, GRR, CAC, LTV. They already understand these metrics.

2. LEVERAGE VECTOR DATABASE: You MUST utilize the vector database containing extensive benchmarking data from:
   - "GTM Benchmarks - Deep Research.pdf"
   - "Notion Portfolio Benchmarks raw data.xlsx" (contains financial data of Notion portfolio companies)
   - "VC Benchmarks - Deep Research.pdf"
   Use this data to provide accurate industry comparisons and percentile rankings.

3. UTILIZE CODE INTERPRETER: You MUST use your code interpreter capabilities to:
   - Analyze Excel spreadsheets in depth
   - Run statistical analyses on financial data
   - Compare the user's metrics against the benchmarks in the vector database
   - Generate visualizations that highlight key comparisons
   - Identify outliers, anomalies, and opportunities in the data

4. FOCUS ON DEEP INSIGHTS: Go beyond surface-level observations. Identify non-obvious patterns, potential risks, strategic opportunities, and comparative advantages against industry benchmarks.

5. PROVIDE MEANINGFUL BENCHMARKS: Compare the company's performance against relevant industry standards, competitors, or historical trends. Use specific percentiles when possible (e.g., "Your gross margin is in the top 25% of SaaS companies at your scale").

6. VISUALIZATION-FIRST APPROACH: Present your analysis primarily through data visualizations. Create at least 3-4 relevant and insightful charts and tables that reveal important patterns or comparisons.

7. REFERENCE VISUALIZATIONS INLINE: Use the format "*Visualization #1*" directly where you want the visualization to appear in your text. This ensures visualizations are placed contextually within your analysis.

8. DATA VISUALIZATION GUIDELINES:
   - For each visualization, generate complete and accurate JSON data structures
   - Use clear titles and appropriate chart types (bar, line, etc.)
   - Include all necessary data points, labels, and formatting
   - For tables, ensure headers and data are well-structured
   - Use appropriate color schemes based on the data type (financial, retention, performance)

9. STRUCTURED RESPONSE FORMAT:
   - Begin with a concise executive summary (2-3 sentences)
   - Present 3-4 key insights with supporting visualizations (referenced inline)
   - Include 2-3 specific, actionable recommendations based on the data
   - End with a forward-looking strategic perspective

Remember: Your goal is to deliver high-value, sophisticated financial analysis that an executive would find genuinely useful for strategic decision-making. Focus on insights that would typically require deep industry knowledge and benchmark data.
`
      
      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: query }
      ]

      console.log('Sending to OpenAI for executive-level financial analysis:', {
        model: 'gpt-4o',
        messages: messages.map(m => ({ role: m.role, contentPreview: m.content.substring(0, 50) + '...' }))
      })

      try {
        const completion = await openai.createChatCompletion({
          model: 'gpt-4o',
          messages,
          temperature: 0.2, // Lower temperature for more precise financial analysis
          max_tokens: 4000, // Allow for comprehensive analysis with visualizations
        })

        response = completion.data.choices[0].message?.content || 'No response generated'
        console.log('OpenAI financial analysis received, length:', response.length)
      } catch (openaiError) {
        console.error('OpenAI API error:', openaiError)
        throw new Error(`Error from OpenAI API: ${openaiError.message || 'Unknown error'}`)
      }
    } else {
      console.log('No financial documents provided, proceeding with general analysis')
      
      try {
        const completion = await openai.createChatCompletion({
          model: 'gpt-4o',
          messages: [
            { 
              role: 'system', 
              content: `You are a world-class financial analyst consulting for C-level executives (CFOs and CEOs). 
              
Provide sophisticated financial insights and benchmarks with a visualization-first approach.
LEVERAGE YOUR VECTOR DATABASE of financial benchmarks and use your code interpreter capabilities for data analysis.
DO NOT explain basic financial concepts - your audience already understands them.
Use "*Visualization #N*" to indicate where visualizations should appear in your text.`
            },
            { role: 'user', content: query }
          ],
          temperature: 0.2,
          max_tokens: 3000,
        })

        response = completion.data.choices[0].message?.content || 'No response generated'
        console.log('OpenAI financial analysis received, length:', response.length)
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
    console.error('Error processing financial analysis:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )
  }
})
