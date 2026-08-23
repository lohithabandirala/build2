import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

// Initialize the Gemini client
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export async function POST(request: Request) {
  try {
    const { text, imageBase64 } = await request.json();

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ success: false, error: "GEMINI_API_KEY is not configured" }, { status: 500 });
    }

    const prompt = `
      You are an AI assistant for a citizen infrastructure feedback platform in India.
      Analyze the following citizen report and extract key information into a structured JSON format.
      ${imageBase64 ? 'You have also been provided with an image of the issue. Consider the visual severity in your analysis.' : ''}
      
      Citizen Report: "${text}"
      
      Respond ONLY with a valid JSON object matching this schema:
      {
        "category": "Roads & Transport" | "Water & Sanitation" | "Electricity" | "Public Health" | "Education" | "Other",
        "urgency_score": number (1-10),
        "sentiment": "Positive" | "Negative" | "Neutral",
        "key_entities": string[] (List of locations or specific infrastructure mentioned),
        "summary": string (A concise 1-sentence summary of the issue)
      }
    `;

    const contents: any[] = [{ text: prompt }];

    if (imageBase64) {
      contents.push({
        inlineData: {
          data: imageBase64,
          mimeType: "image/jpeg" // Assuming jpeg/png, Gemini handles base64 well
        }
      });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: contents,
      config: {
        responseMimeType: "application/json",
      }
    });

    const resultText = response.text;
    
    if (!resultText) {
       throw new Error("No response from Gemini");
    }

    // Parse the JSON response from Gemini
    const ai_analysis = JSON.parse(resultText);

    return NextResponse.json({ success: true, ai_analysis });
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    return NextResponse.json({ success: false, error: "Failed to process text via Gemini API", details: error.message }, { status: 500 });
  }
}
