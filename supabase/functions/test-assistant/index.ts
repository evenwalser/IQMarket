
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const openAiApiKey = Deno.env.get('OPENAI_API_KEY');
    const assistantId = Deno.env.get('BENCHMARKS_ASSISTANT_ID');

    console.log('Starting API test with assistant ID:', assistantId);

    // Step 1: Create a thread with the initial message
    const createThreadResponse = await fetch("https://api.openai.com/v1/threads", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openAiApiKey}`,
        "Content-Type": "application/json",
        "OpenAI-Beta": "assistants=v2"
      },
      body: JSON.stringify({
        messages: [{
          role: "user",
          content: `Here is our financial data for analysis:
Annual Recurring Revenue (ARR): $5M
Year-over-Year Growth Rate: 120%
Net Revenue Retention (NRR): 115%
Customer Acquisition Cost (CAC) Payback: 18 months

Please extract these metrics and list them as raw values without any additional commentary.`
        }]
      })
    });

    const threadData = await createThreadResponse.json();
    console.log('Thread created with message:', threadData);

    if (!createThreadResponse.ok) {
      throw new Error(`Failed to create thread: ${JSON.stringify(threadData)}`);
    }

    // Step 2: Create a run to process the message with specific instructions for the benchmarks format
    const runResponse = await fetch(`https://api.openai.com/v1/threads/${threadData.id}/runs`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openAiApiKey}`,
        "Content-Type": "application/json",
        "OpenAI-Beta": "assistants=v2"
      },
      body: JSON.stringify({
        assistant_id: assistantId,
        model: "gpt-4o-mini",  // Explicitly specify the model
        instructions: `Always structure your responses in the following format for the Benchmarks assistant:

1. Restate the question/request from the user
2. Opening statement that frames the analysis
3. Point 1: Concise text explanation followed by relevant data visualization (chart, graph, or table)
4. Point 2: Concise text explanation followed by relevant data visualization
5. Continue with additional points as needed, each with text and visual data
6. Conclusion with clear, actionable recommendations
7. Data visualization showing forecasted outcomes based on recommendations

For all data visualizations:
- Use JSON format that can be rendered as charts or tables
- For charts, specify: type (bar, line, area, radar), title, data, and color scheme
- For tables, include headers and formatted data
- Use color schemes appropriate to the data (financial, retention, performance, operational)
- Present data in comparative format where possible (current vs. benchmark, before vs. after, etc.)

Keep explanatory text concise and focused on insights. Let the visualizations do most of the communication.`
      })
    });

    const runData = await runResponse.json();
    console.log('Run created:', runData);

    if (!runResponse.ok) {
      throw new Error(`Failed to create run: ${JSON.stringify(runData)}`);
    }

    // Step 3: Poll for run completion
    let runStatus = runData.status;
    let attempts = 0;
    const maxAttempts = 60;
    
    while (runStatus === 'queued' || runStatus === 'in_progress') {
      if (attempts >= maxAttempts) {
        throw new Error('Assistant run timed out');
      }

      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const statusResponse = await fetch(
        `https://api.openai.com/v1/threads/${threadData.id}/runs/${runData.id}`,
        {
          headers: {
            "Authorization": `Bearer ${openAiApiKey}`,
            "Content-Type": "application/json",
            "OpenAI-Beta": "assistants=v2"
          }
        }
      );

      const statusData = await statusResponse.json();
      console.log(`Status check attempt ${attempts + 1}:`, statusData);

      if (!statusResponse.ok) {
        throw new Error(`Failed to check run status: ${JSON.stringify(statusData)}`);
      }

      runStatus = statusData.status;
      attempts++;
    }

    if (runStatus !== 'completed') {
      throw new Error(`Assistant run failed with status: ${runStatus}`);
    }

    // Step 4: Retrieve the assistant's response
    const messagesResponse = await fetch(
      `https://api.openai.com/v1/threads/${threadData.id}/messages`,
      {
        headers: {
          "Authorization": `Bearer ${openAiApiKey}`,
          "Content-Type": "application/json",
          "OpenAI-Beta": "assistants=v2"
        }
      }
    );

    const messagesData = await messagesResponse.json();
    console.log('Final messages:', messagesData);

    if (!messagesResponse.ok) {
      throw new Error(`Failed to retrieve messages: ${JSON.stringify(messagesData)}`);
    }

    const extractedResponse = messagesData.data[0]?.content[0]?.text?.value;

    // Validate that the response contains key metrics
    const validationResults = {
      containsARR: extractedResponse.includes('5M') || extractedResponse.includes('5 million'),
      containsGrowthRate: extractedResponse.includes('120%'),
      containsNRR: extractedResponse.includes('115%'),
      containsCACPayback: extractedResponse.includes('18') && extractedResponse.includes('month'),
    };

    return new Response(
      JSON.stringify({ 
        threadId: threadData.id,
        runId: runData.id,
        status: 'Test completed successfully',
        extractedResponse,
        validationResults,
        metricsFound: Object.values(validationResults).filter(v => v).length,
        totalMetrics: Object.keys(validationResults).length,
        testPassed: Object.values(validationResults).every(v => v)
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('Test error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.stack
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
