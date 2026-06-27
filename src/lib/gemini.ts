import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;
const hasApiKey = !!apiKey && apiKey !== "YOUR_GEMINI_API_KEY";

let ai: any = null;

if (hasApiKey) {
  try {
    ai = new GoogleGenAI({ apiKey });
  } catch (error) {
    console.error("Failed to initialize Google GenAI SDK:", error);
  }
}

export interface AIAnalysisResult {
  category: string;
  aiSummary: string;
  priorityScore: number;
  severity: "low" | "medium" | "high" | "critical";
  crisisFlag: boolean;
  assignedDepartment: string;
  safetyInstructions: string;
}

/**
 * Summarizes, categorizes, scores, and flags crisis-level civic issues.
 */
export async function analyzeReport(
  title: string,
  description: string
): Promise<AIAnalysisResult> {
  const prompt = `
Analyze the following civic issue report and provide a structured JSON response.

Title: "${title}"
Description: "${description}"

Respond ONLY with a JSON object in this format (no markdown, no backticks, just raw JSON):
{
  "category": "one of: pothole, garbage, water_leak, broken_streetlight, drainage, unsafe_road, flooding, fire, gas_leak, other",
  "aiSummary": "A concise 1-2 sentence summary of the issue",
  "priorityScore": a number between 0.0 (lowest priority) and 1.0 (highest priority/hazard)",
  "severity": "one of: low, medium, high, critical",
  "crisisFlag": true if it is an immediate threat to life/safety (fire, gas leak, active flooding, road collapse), else false,
  "assignedDepartment": "the name of the municipal department best suited (e.g. Public Works Department, Water Utilities, Fire Department, Traffic & Roads Division)",
  "safetyInstructions": "A short, actionable safety instruction for citizens nearby (especially if crisisFlag is true)"
}
`;

  if (ai) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        },
      });

      const text = response.text || "";
      const cleanedText = text.replace(/```json/g, "").replace(/```/g, "").trim();
      const result = JSON.parse(cleanedText);
      return {
        category: result.category || "other",
        aiSummary: result.aiSummary || `${title}: ${description.substring(0, 100)}...`,
        priorityScore: parseFloat(result.priorityScore) || 0.5,
        severity: result.severity || "medium",
        crisisFlag: !!result.crisisFlag,
        assignedDepartment: result.assignedDepartment || "General Administration",
        safetyInstructions: result.safetyInstructions || "Please exercise caution when in the vicinity.",
      };
    } catch (error) {
      console.error("Gemini AI API call failed, falling back to local analysis:", error);
    }
  }

  // Fallback heuristic/mock AI analysis
  return mockAnalyzeReport(title, description);
}

/**
 * Uses Gemini to determine if a new report is a duplicate of any existing reports.
 */
export async function detectDuplicateReport(
  newReport: { title: string; description: string },
  existingReports: Array<{ id: string; title: string; aiSummary: string }>
): Promise<{ isDuplicate: boolean; duplicateOfId: string | null; confidence: number; reasoning: string }> {
  if (existingReports.length === 0) {
    return { isDuplicate: false, duplicateOfId: null, confidence: 0, reasoning: "No existing reports to compare." };
  }

  const reportsText = existingReports
    .map((r) => `ID: ${r.id}\nTitle: ${r.title}\nSummary: ${r.aiSummary}`)
    .join("\n\n---\n\n");

  const prompt = `
Compare this new civic report to the list of existing nearby reports. Determine if the new report describes the EXACT SAME incident/complaint (e.g., the same pothole, the same water leak, the same garbage pile).

New Report:
Title: "${newReport.title}"
Description: "${newReport.description}"

Existing Nearby Reports:
${reportsText}

Respond ONLY with a JSON object in this format (no markdown, no backticks, just raw JSON):
{
  "isDuplicate": true if it is a duplicate of one of the existing reports, else false,
  "duplicateOfId": "the ID of the existing report if it is a duplicate, otherwise null",
  "confidence": a number between 0.0 and 1.0 representing your match confidence,
  "reasoning": "A short sentence explaining your duplicate decision"
}
`;

  if (ai) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        },
      });

      const text = response.text || "";
      const cleanedText = text.replace(/```json/g, "").replace(/```/g, "").trim();
      const result = JSON.parse(cleanedText);
      return {
        isDuplicate: !!result.isDuplicate,
        duplicateOfId: result.duplicateOfId || null,
        confidence: parseFloat(result.confidence) || 0.5,
        reasoning: result.reasoning || "",
      };
    } catch (error) {
      console.error("Gemini duplicate detection failed, falling back to mock:", error);
    }
  }

  // Mock duplicate detection (simple string similarity matching)
  return mockDetectDuplicate(newReport, existingReports);
}

// Local mock function for offline development
function mockAnalyzeReport(title: string, description: string): AIAnalysisResult {
  const combined = `${title} ${description}`.toLowerCase();
  
  let category = "other";
  let department = "Public Works Department";
  let severity: "low" | "medium" | "high" | "critical" = "medium";
  let priorityScore = 0.4;
  let crisisFlag = false;
  let safetyInstructions = "Use caution when traveling in this area and report any changes in status.";

  if (combined.includes("pothole") || combined.includes("road") || combined.includes("street")) {
    category = "pothole";
    department = "Roads & Traffic Division";
    severity = "medium";
    priorityScore = 0.5;
    if (combined.includes("deep") || combined.includes("accident") || combined.includes("broken")) {
      severity = "high";
      priorityScore = 0.75;
    }
  } else if (combined.includes("garbage") || combined.includes("trash") || combined.includes("waste") || combined.includes("overflow")) {
    category = "garbage";
    department = "Sanitation & Waste Management";
    severity = "low";
    priorityScore = 0.3;
    if (combined.includes("smell") || combined.includes("chemical")) {
      severity = "medium";
      priorityScore = 0.5;
    }
  } else if (combined.includes("water") || combined.includes("leak") || combined.includes("pipe") || combined.includes("burst")) {
    category = "water_leak";
    department = "Water Utilities Department";
    severity = "medium";
    priorityScore = 0.6;
    if (combined.includes("flood") || combined.includes("gushing")) {
      category = "flooding";
      severity = "high";
      priorityScore = 0.8;
    }
  } else if (combined.includes("light") || combined.includes("streetlight") || combined.includes("dark")) {
    category = "broken_streetlight";
    department = "Municipal Lighting & Power";
    severity = "low";
    priorityScore = 0.25;
  } else if (combined.includes("drain") || combined.includes("block") || combined.includes("sewer") || combined.includes("drainage")) {
    category = "drainage";
    department = "Stormwater & Sewer Division";
    severity = "medium";
    priorityScore = 0.5;
  } else if (combined.includes("flood") || combined.includes("inundat") || combined.includes("water rise")) {
    category = "flooding";
    department = "Emergency Services & Public Safety";
    severity = "high";
    priorityScore = 0.85;
    crisisFlag = true;
    safetyInstructions = "Avoid walking or driving through flooded waters. Stay tuned to emergency broadcasts.";
  } else if (combined.includes("fire") || combined.includes("smoke") || combined.includes("blaze") || combined.includes("burn")) {
    category = "fire";
    department = "Fire & Rescue Department";
    severity = "critical";
    priorityScore = 0.98;
    crisisFlag = true;
    safetyInstructions = "Evacuate the immediate area. Call emergency services. Avoid inhaling smoke.";
  } else if (combined.includes("gas") || combined.includes("smell") || combined.includes("leak")) {
    category = "gas_leak";
    department = "Gas Utilities & Safety Division";
    severity = "critical";
    priorityScore = 0.95;
    crisisFlag = true;
    safetyInstructions = "Extinguish all open flames. Do not use electrical switches. Evacuate immediately.";
  }

  return {
    category,
    aiSummary: `Local issue reported: ${title}. ${description.slice(0, 80)}${description.length > 80 ? "..." : ""}`,
    priorityScore,
    severity,
    crisisFlag,
    assignedDepartment: department,
    safetyInstructions,
  };
}

function mockDetectDuplicate(
  newReport: { title: string; description: string },
  existingReports: Array<{ id: string; title: string; aiSummary: string }>
) {
  const newText = `${newReport.title} ${newReport.description}`.toLowerCase();
  
  for (const r of existingReports) {
    const existingText = `${r.title} ${r.aiSummary}`.toLowerCase();
    
    // Check overlapping keywords
    const keywords = ["leak", "fire", "pothole", "garbage", "pipe", "light", "street"];
    let matchCount = 0;
    let relevantKeywords = 0;
    
    for (const kw of keywords) {
      const hasNew = newText.includes(kw);
      const hasExist = existingText.includes(kw);
      if (hasNew || hasExist) {
        relevantKeywords++;
        if (hasNew && hasExist) matchCount++;
      }
    }
    
    if (relevantKeywords > 0 && matchCount / relevantKeywords > 0.7) {
      return {
        isDuplicate: true,
        duplicateOfId: r.id,
        confidence: 0.8,
        reasoning: `Matched keywords suggest identical issue (ID: ${r.id}).`,
      };
    }
  }

  return {
    isDuplicate: false,
    duplicateOfId: null,
    confidence: 0.1,
    reasoning: "No matching reports found with similar keywords.",
  };
}
