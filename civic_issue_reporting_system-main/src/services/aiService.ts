import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export const classifyIssue = async (description: string) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-latest",
      contents: `Classify the following civic issue description into a priority level: Normal, High, or Emergency. Return only the word.
      Description: ${description}`,
    });
    return response.text.trim();
  } catch (error) {
    console.error("AI Classification failed", error);
    return "Normal";
  }
};
