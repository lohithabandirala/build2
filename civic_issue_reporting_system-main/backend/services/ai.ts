import { GoogleGenAI } from "@google/genai";
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

/**
 * Call Gemini with retry and model fallback
 * Tries gemini-2.0-flash-lite first, falls back to gemini-2.0-flash on 429
 */
async function callGeminiWithRetry(parts: any[], maxRetries = 2): Promise<string> {
  const models = ["gemini-2.0-flash-lite", "gemini-2.0-flash"];
  
  for (const model of models) {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const result = await genAI.models.generateContent({
          model,
          contents: [{ role: "user", parts }]
        });
        return result.text;
      } catch (err: any) {
        if (err?.status === 429) {
          console.warn(`⚠️ Rate limited on ${model} (attempt ${attempt + 1}). ${attempt < maxRetries - 1 ? 'Retrying in 3s...' : 'Trying next model...'}`);
          if (attempt < maxRetries - 1) {
            await new Promise(r => setTimeout(r, 3000));
          }
        } else {
          throw err; // Re-throw non-rate-limit errors
        }
      }
    }
  }
  throw new Error('All Gemini models rate-limited. Please try again later.');
}

/**
 * Detect MIME type from file extension
 */
function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const mimeMap: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.bmp': 'image/bmp',
  };
  return mimeMap[ext] || 'image/jpeg';
}

/**
 * Build image parts for Gemini from a local image path
 */
function buildImageParts(imageUrl?: string): any[] {
  if (!imageUrl) return [];
  try {
    const imagePath = path.join(process.cwd(), imageUrl);
    if (fs.existsSync(imagePath)) {
      const imageBuffer = fs.readFileSync(imagePath);
      const mimeType = getMimeType(imagePath);
      return [{
        inlineData: {
          data: imageBuffer.toString("base64"),
          mimeType,
        },
      }];
    }
  } catch (e) {
    console.error("Error reading image for AI:", e);
  }
  return [];
}

export async function analyzeIssue(description: string, imageUrl?: string, category?: string) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      console.warn("⚠️ GEMINI_API_KEY not found in .env. Falling back to keyword analysis.");
      return null;
    }

    // Build a prompt that analyzes BOTH image and text together
    let prompt: string;
    if (imageUrl) {
      prompt = `You are a STRICT civic infrastructure complaint verification AI. You have been given a complaint with a CATEGORY (heading), DESCRIPTION (text), and an uploaded IMAGE.

CATEGORY/HEADING: "${category || 'Not specified'}"
DESCRIPTION: "${description}"

YOUR #1 JOB: Determine if the uploaded image ACTUALLY MATCHES the description and category heading.

STRICT RULES FOR FAKE DETECTION:
1. The image MUST show the specific civic issue described in the heading AND description.
2. If the description says "pothole" but the image shows a cat, food, selfie, meme, or anything unrelated → mark as FAKE.
3. If the description says "garbage overflow" but the image shows a clean road, a building, or something irrelevant → mark as FAKE.
4. If the image shows ANY of these unrelated content, it is FAKE regardless of description:
   - Selfies, portraits, people posing
   - Food, animals, pets
   - Memes, screenshots, social media posts
   - Random landscapes with NO visible civic issue
   - Interiors of homes (unless showing water leak/damage)
   - Product photos, advertisements
   - AI-generated or stock photos of civic issues
5. Even if the image shows SOME civic issue, if it does NOT match the SPECIFIC issue described (e.g., description says "broken streetlight" but image shows a pothole), it should be flagged with low coherence and isLikelyFake = true.
6. The description text and heading MUST be logically consistent with what the image shows. ANY mismatch = FAKE.

Analyze step-by-step:
1. What does the image ACTUALLY show? Describe it objectively.
2. Does the image show a real civic infrastructure problem?
3. Does the civic problem shown in the image match the category heading "${category || 'Not specified'}"?
4. Does the civic problem shown in the image match what the description says: "${description}"?
5. Overall verdict: Is this a genuine matching report or a fake/mismatched submission?

Return a JSON object with:
{
  "category": One of ["Potholes", "Garbage Overflow", "Road Damage", "Broken Streetlight", "Water Leakage", "Drainage Problem", "Public Facility Damage", "Other"],
  "priority": One of ["Emergency", "High", "Normal"],
  "severityScore": number 1-10 (10 = most severe),
  "summary": "1-sentence summary explaining your verdict",
  "isLikelyFake": boolean (TRUE if image does not match description/heading, or image is unrelated/irrelevant),
  "fakeReason": "string explaining WHY it is fake (e.g., 'Image shows a dog but description says pothole') or 'Genuine report - image matches description' if real",
  "imageDescription": "objective description of what the image ACTUALLY shows",
  "imageTextMatch": boolean (true ONLY if the image content genuinely matches BOTH the heading AND description),
  "imageTextCoherenceScore": number 0-100 (100 = perfect match, 0 = completely unrelated. Score below 40 = definite mismatch),
  "imageAnalysis": {
    "showsCivicIssue": boolean (does the image show ANY civic issue at all?),
    "issueType": "what type of civic issue the image shows, or 'none/unrelated' if not a civic issue",
    "matchesHeading": boolean (does the image match the category heading?),
    "matchesDescription": boolean (does the image match what the text description says?),
    "condition": "description of the condition shown in the image"
  }
}

BE VERY STRICT. When in doubt, flag as fake. Real civic reports will have clear, matching images.
ONLY return the JSON object, nothing else.`;
    } else {
      prompt = `Analyze this civic issue report (no image provided).
Description: "${description}"
Category: "${category || 'Not specified'}"

Return a JSON object with:
{
  "category": One of ["Potholes", "Garbage Overflow", "Road Damage", "Broken Streetlight", "Water Leakage", "Drainage Problem", "Public Facility Damage", "Other"],
  "priority": One of ["Emergency", "High", "Normal"],
  "severityScore": number 1-10 (10 = most severe),
  "summary": "1-sentence concise summary of the issue",
  "isLikelyFake": boolean (true if description is nonsensical or obviously fake),
  "fakeReason": "reason if fake, or 'Text-only report appears genuine' if real",
  "imageDescription": null,
  "imageTextMatch": null,
  "imageTextCoherenceScore": null,
  "imageAnalysis": null
}

ONLY return the JSON object, nothing else.`;
    }

    const parts: any[] = [{ text: prompt }];
    parts.push(...buildImageParts(imageUrl));

    const text = await callGeminiWithRetry(parts);


    
    // Clean up response (Gemini sometimes adds markdown blocks)
    const jsonStr = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(jsonStr);
    console.log("✅ AI Analysis Result:", JSON.stringify(parsed, null, 2));
    return parsed;
  } catch (err) {
    console.error("AI Analysis Error:", err);
    return null;
  }
}

/**
 * Deep NLP analysis for fake detection with image-text coherence,
 * sentiment analysis, and comprehensive category analysis
 */
export async function analyzeIssueDeep(description: string, imageUrl?: string, category?: string) {
  try {
    // 1. Text-based NLP heuristic analysis (always runs, even without API key)
    const nlpResult = performNLPAnalysis(description, category);
    
    if (!process.env.GEMINI_API_KEY) {
      console.warn("⚠️ GEMINI_API_KEY not found. Using heuristic NLP analysis only.");
      return nlpResult;
    }

    // 2. AI-powered deep analysis with Gemini
    const hasImage = !!imageUrl;
    const prompt = `You are a STRICT civic infrastructure complaint verification system with advanced NLP and computer vision capabilities.

REPORT:
- Description: "${description}"
- Claimed Category/Heading: "${category || 'Not specified'}"
- Has Image: ${hasImage ? 'YES - Analyze the attached image carefully' : 'NO'}

${hasImage ? `CRITICAL IMAGE-TEXT MATCHING RULES:
You MUST analyze the provided image and determine if it matches the description AND category heading.

FAKE DETECTION RULES (BE VERY STRICT):
1. The image MUST visually depict the EXACT type of civic issue described in the heading AND description.
2. If the category says "Potholes" but the image shows a dog, selfie, food, meme → isFake = true, imageTextCoherence.score = 0
3. If the category says "Garbage Overflow" but the image shows a clean street → isFake = true
4. If the image shows a DIFFERENT civic issue than described (e.g., heading says "Water Leakage" but image shows potholes) → isFake = true, score < 30
5. UNRELATED images are ALWAYS fake regardless of description:
   - Selfies, portraits, people posing casually
   - Food, drinks, restaurant photos
   - Animals, pets
   - Memes, cartoons, screenshots
   - Random scenic photos without civic issues
   - Product advertisements
   - Home interiors (unless showing actual damage/leakage)
   - Stock photos or AI-generated images
6. The image must look like a real on-site photo of the described problem.
7. ANY mismatch between image content and description/heading = FAKE.` : 'No image provided — analyze text only for fake patterns.'}

Perform the following comprehensive analyses and return a JSON object:

{
  "fakeDetection": {
    "isFake": boolean (TRUE if image doesn't match description/heading, image is unrelated, or text is nonsensical),
    "confidence": number (0-100, how confident you are in your fake/genuine verdict),
    "reasons": string[] (list of specific reasons if fake, e.g., "Image shows a cat but description says pothole"),
    "redFlags": string[] (any suspicious patterns detected)
  },
  "sentimentAnalysis": {
    "sentiment": "negative" | "neutral" | "positive",
    "urgency": "low" | "medium" | "high" | "critical",
    "emotionTone": string (e.g., "frustrated", "angry", "concerned", "calm"),
    "genuineness": number (0-100)
  },
  "categoryAnalysis": {
    "suggestedCategory": string (one of: Potholes, Garbage Overflow, Road Damage, Broken Streetlight, Water Leakage, Drainage Problem, Public Facility Damage, Other),
    "categoryMatch": boolean (does description AND image match claimed category?),
    "keywords": string[] (key issue-related words found),
    "department": string (suggested department)
  },
  "textQuality": {
    "coherence": number (0-100),
    "specificity": number (0-100, does it describe a specific issue?),
    "hasLocation": boolean,
    "hasTemporalInfo": boolean,
    "wordCount": number,
    "grammarScore": number (0-100)
  },
  "imageTextCoherence": {
    "score": number (0-100. 0 = completely unrelated image. Below 40 = mismatch. Above 70 = good match. 100 = perfect match),
    "imageDescription": string (what the image ACTUALLY shows - be objective),
    "mismatchDetails": string (explain specifically what doesn't match, e.g., "Description says pothole but image shows a sunset"),
    "showsCivicIssue": boolean (does the image show ANY civic infrastructure issue?),
    "matchesHeading": boolean (does the image match the category heading?),
    "matchesDescription": boolean (does the image match the text description?),
    "isStockPhoto": boolean (does this look like a stock/internet photo?),
    "isAIGenerated": boolean (does this look AI generated?)
  },
  "summary": string (1-2 sentence summary explaining your verdict clearly),
  "overallTrustScore": number (0-100. If image doesn't match description, this MUST be below 30)
}

BE EXTREMELY STRICT about image-text matching. When in doubt, flag as fake.
ONLY return the JSON object, nothing else.`;

    const parts: any[] = [{ text: prompt }];
    parts.push(...buildImageParts(imageUrl));

    const text = await callGeminiWithRetry(parts);


    const jsonStr = text.replace(/```json|```/g, "").trim();
    const aiAnalysis = JSON.parse(jsonStr);
    
    console.log("✅ Deep AI Analysis Result:", JSON.stringify(aiAnalysis, null, 2));
    
    // Merge heuristic NLP with AI analysis — AI takes priority
    return {
      ...nlpResult,
      ...aiAnalysis,
      nlpHeuristic: nlpResult, // keep raw NLP results
      source: 'gemini+nlp'
    };
  } catch (err) {
    console.error("Deep AI Analysis Error:", err);
    // Fall back to NLP-only
    return performNLPAnalysis(description, category);
  }
}

/**
 * Batch analyze all issues — used for the admin analytics page
 */
export async function batchAnalyzeIssues(issues: any[]) {
  const results: any[] = [];
  
  for (const issue of issues) {
    try {
      const analysis = await analyzeIssueDeep(
        issue.description || '',
        issue.imageUrl,
        issue.category
      );
      results.push({
        issueId: issue.id,
        ...analysis
      });
    } catch (err) {
      console.error(`Error analyzing issue ${issue.id}:`, err);
      // Use NLP fallback
      const nlp = performNLPAnalysis(issue.description || '', issue.category);
      results.push({
        issueId: issue.id,
        ...nlp,
        error: true
      });
    }
  }
  
  return results;
}

/**
 * Pure NLP heuristic fake detection — works without any AI API
 * Uses text statistics, pattern matching, keyword analysis, etc.
 */
function performNLPAnalysis(description: string, category?: string) {
  const text = (description || '').trim();
  const words = text.split(/\s+/).filter(w => w.length > 0);
  const wordCount = words.length;
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const avgWordLength = words.reduce((sum, w) => sum + w.length, 0) / (wordCount || 1);
  
  // --- Fake Detection Heuristics ---
  const redFlags: string[] = [];
  let fakeScore = 0;
  
  // 1. Too short description
  if (wordCount < 3) {
    redFlags.push('Description too short (< 3 words)');
    fakeScore += 30;
  } else if (wordCount < 8) {
    redFlags.push('Description is very brief');
    fakeScore += 10;
  }
  
  // 2. Repeated characters/words spam
  const repeatedCharMatch = text.match(/(.)\\1{4,}/g);
  if (repeatedCharMatch) {
    redFlags.push('Contains repeated character spam');
    fakeScore += 25;
  }
  
  const wordFreq: Record<string, number> = {};
  words.forEach(w => { wordFreq[w.toLowerCase()] = (wordFreq[w.toLowerCase()] || 0) + 1; });
  const maxFreq = Math.max(...Object.values(wordFreq));
  if (maxFreq > 3 && wordCount > 5) {
    redFlags.push('Contains excessive word repetition');
    fakeScore += 15;
  }
  
  // 3. All caps
  const capsRatio = (text.match(/[A-Z]/g) || []).length / (text.length || 1);
  if (capsRatio > 0.7 && wordCount > 3) {
    redFlags.push('Excessive use of capital letters');
    fakeScore += 10;
  }
  
  // 4. No civic-related keywords
  const civicKeywords = [
    'road', 'pothole', 'garbage', 'drain', 'water', 'light', 'street', 'pipe', 
    'leak', 'broken', 'damage', 'crack', 'overflow', 'block', 'flood', 'waste',
    'sanitation', 'electric', 'sewer', 'bridge', 'park', 'sidewalk', 'curb',
    'traffic', 'signal', 'sign', 'pollution', 'noise', 'smell', 'stray',
    'animal', 'construction', 'building', 'wall', 'collapsed', 'fallen',
    'tree', 'dangerous', 'hazard', 'unsafe', 'dirty', 'dusty', 'muddy',
    'manhole', 'gutter', 'footpath', 'pavement', 'ditch', 'pit', 'hole',
    'dump', 'trash', 'rubbish', 'filth', 'open', 'exposed', 'wire',
    'pole', 'transformer', 'cable', 'short circuit', 'blackout', 'power',
    'supply', 'pipeline', 'contaminated', 'sewage', 'flooding', 'waterlogging'
  ];
  const lowerText = text.toLowerCase();
  const foundCivicKeywords = civicKeywords.filter(k => lowerText.includes(k));
  const hasCivicKeyword = foundCivicKeywords.length > 0;
  if (!hasCivicKeyword && wordCount > 5) {
    redFlags.push('No civic infrastructure keywords found');
    fakeScore += 20;
  }
  
  // 5. Nonsensical patterns
  const nonAlphaRatio = (text.match(/[^a-zA-Z\s.,!?'-]/g) || []).length / (text.length || 1);
  if (nonAlphaRatio > 0.4) {
    redFlags.push('High ratio of non-alphabetic characters');
    fakeScore += 20;
  }
  
  // 6. Very long words (gibberish)
  const longWords = words.filter(w => w.length > 20);
  if (longWords.length > 0) {
    redFlags.push('Contains unusually long words (possible gibberish)');
    fakeScore += 15;
  }
  
  // 7. Category-description mismatch detection
  let categoryMismatch = false;
  let suggestedCategory = category || 'Other';
  if (category) {
    const catKeywordMap: Record<string, string[]> = {
      'Potholes': ['pothole', 'hole', 'road', 'crack', 'bump', 'uneven', 'damaged road', 'street', 'pit', 'ditch'],
      'Garbage Overflow': ['garbage', 'waste', 'trash', 'dump', 'overflow', 'smell', 'dirty', 'litter', 'rubbish', 'filth'],
      'Road Damage': ['road', 'damage', 'broken', 'crack', 'asphalt', 'tar', 'surface', 'highway', 'pavement', 'footpath'],
      'Broken Streetlight': ['light', 'street', 'lamp', 'dark', 'bulb', 'electric', 'pole', 'blackout', 'power'],
      'Water Leakage': ['water', 'leak', 'pipe', 'burst', 'supply', 'flow', 'tap', 'main', 'pipeline', 'contaminated'],
      'Drainage Problem': ['drain', 'clog', 'block', 'flood', 'water', 'sewer', 'gutter', 'overflow', 'waterlogging', 'sewage'],
      'Public Facility Damage': ['facility', 'bench', 'public', 'park', 'toilet', 'playground', 'bus stop', 'building', 'wall'],
    };
    
    const categoryWords = catKeywordMap[category] || [];
    if (categoryWords.length > 0) {
      const matchCount = categoryWords.filter(k => lowerText.includes(k)).length;
      if (matchCount === 0 && wordCount > 5) {
        categoryMismatch = true;
        redFlags.push(`Description does not match category "${category}"`);
        fakeScore += 10;
        
        // Try to suggest a better category
        let bestMatch = 'Other';
        let bestCount = 0;
        for (const [cat, keywords] of Object.entries(catKeywordMap)) {
          const count = keywords.filter(k => lowerText.includes(k)).length;
          if (count > bestCount) {
            bestCount = count;
            bestMatch = cat;
          }
        }
        if (bestCount > 0) {
          suggestedCategory = bestMatch;
        }
      }
    }
  }

  // --- Sentiment Analysis ---
  const negativeWords = ['broken', 'damaged', 'dangerous', 'hazard', 'terrible', 'horrible', 
    'awful', 'worst', 'bad', 'dirty', 'disgusting', 'pathetic', 'neglected', 'abandoned',
    'urgent', 'immediately', 'emergency', 'critical', 'severe', 'extreme', 'serious'];
  const urgentWords = ['urgent', 'immediately', 'emergency', 'asap', 'danger', 'critical',
    'life-threatening', 'risk', 'accident', 'collapse', 'flood'];
  
  const negCount = negativeWords.filter(w => lowerText.includes(w)).length;
  const urgentCount = urgentWords.filter(w => lowerText.includes(w)).length;
  
  const sentiment = negCount > 2 ? 'negative' : negCount > 0 ? 'neutral' : 'positive';
  const urgency = urgentCount >= 2 ? 'critical' : urgentCount >= 1 ? 'high' : negCount > 1 ? 'medium' : 'low';
  
  // --- Text Quality ---
  const coherenceScore = Math.min(100, Math.max(0, 
    (wordCount >= 10 ? 40 : wordCount * 4) +
    (sentences.length >= 2 ? 20 : 10) +
    (hasCivicKeyword ? 30 : 0) +
    (avgWordLength > 3 && avgWordLength < 12 ? 10 : 0)
  ));
  
  const specificityScore = Math.min(100, Math.max(0,
    (hasCivicKeyword ? 30 : 0) +
    (wordCount > 15 ? 30 : wordCount * 2) +
    (lowerText.match(/\d/) ? 10 : 0) + // has numbers
    (!categoryMismatch ? 20 : 0) +
    (sentences.length >= 2 ? 10 : 0)
  ));

  const isFake = fakeScore >= 40;
  const trustScore = Math.max(0, Math.min(100, 100 - fakeScore));

  return {
    fakeDetection: {
      isFake,
      confidence: Math.min(100, fakeScore + 10),
      reasons: redFlags,
      redFlags
    },
    sentimentAnalysis: {
      sentiment,
      urgency,
      emotionTone: urgentCount > 0 ? 'urgent' : negCount > 2 ? 'frustrated' : negCount > 0 ? 'concerned' : 'calm',
      genuineness: trustScore
    },
    categoryAnalysis: {
      suggestedCategory,
      categoryMatch: !categoryMismatch,
      keywords: foundCivicKeywords,
      department: suggestedCategory ? getCategoryDepartment(suggestedCategory) : 'General'
    },
    textQuality: {
      coherence: coherenceScore,
      specificity: specificityScore,
      hasLocation: /\b(road|street|lane|colony|nagar|area|chowk|square|bridge|highway|junction|near|opposite|behind|beside)\b/i.test(text),
      hasTemporalInfo: /\b(today|yesterday|morning|evening|night|week|month|since|ago|daily|recently)\b/i.test(text),
      wordCount,
      grammarScore: Math.min(100, coherenceScore + 10)
    },
    imageTextCoherence: {
      score: null, // null = not analyzed (NLP cannot do image analysis)
      imageDescription: null,
      mismatchDetails: null,
      showsCivicIssue: null,
      isStockPhoto: false,
      isAIGenerated: false,
    },
    summary: isFake 
      ? `⚠️ Potentially fake report detected with ${redFlags.length} red flag(s): ${redFlags.join(', ')}`
      : `Genuine civic report with ${urgency} urgency. Trust score: ${trustScore}/100.`,
    overallTrustScore: trustScore,
    source: 'nlp-heuristic'
  };
}

function getCategoryDepartment(category: string): string {
  const map: Record<string, string> = {
    'Potholes': 'Roads & Infrastructure',
    'Road Damage': 'Roads & Infrastructure',
    'Garbage Overflow': 'Sanitation Department',
    'Broken Streetlight': 'Electricity Department',
    'Water Leakage': 'Water Supply Board',
    'Drainage Problem': 'Drainage & Sewage',
    'Public Facility Damage': 'Public Works',
    'Roads': 'Roads & Infrastructure',
    'Sanitation': 'Sanitation Department',
    'Drainage': 'Drainage & Sewage',
    'Electricity': 'Electricity Department',
    'Water Supply': 'Water Supply Board',
    'Public Safety': 'Public Safety Division',
  };
  return map[category] || 'General Administration';
}
