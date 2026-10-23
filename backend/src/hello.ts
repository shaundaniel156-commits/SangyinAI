import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("GEMINI_API_KEY is missing. Add it to backend/.env.");
  process.exit(1);
}

const model = process.env.GEMINI_MODEL || "gemini-3.8-flash";
const ai = new GoogleGenAI({ apiKey });

console.log(`Asking ${model}...`);

const response = await ai.models.generateContent({
  model,
  contents: "In one short sentence, say hello to a teacher using Sangyin AI.",
});

console.log("Gemini says:", response.text);
console.log(`\nTokens used: ${response.usageMetadata?.promptTokenCount ?? 0} in, ${response.usageMetadata?.candidatesTokenCount ?? 0} out`);