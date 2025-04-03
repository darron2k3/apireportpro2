import { GoogleGenerativeAI } from "npm:@google/generative-ai@^0.2.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InspectionData {
  inspectionType: string;
  facilityName: string;
  equipmentId: string;
  inspectionDate: string;
  inspectorName: string;
  findings: string;
  recommendations: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not set');
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    const data: InspectionData = await req.json();

    const prompt = `Generate a detailed inspection report for ${data.inspectionType} inspection with the following information:
    
Facility: ${data.facilityName}
Equipment ID: ${data.equipmentId}
Inspection Date: ${data.inspectionDate}
Inspector: ${data.inspectorName}

Findings:
${data.findings}

Recommendations:
${data.recommendations}

Please format the report professionally, including:
1. Executive Summary
2. Inspection Details
3. Findings and Observations
4. Analysis
5. Recommendations
6. Compliance Status
7. Next Steps

Follow ${data.inspectionType} standards and best practices.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    return new Response(
      JSON.stringify({ report: text }),
      {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      },
    );
  }
});