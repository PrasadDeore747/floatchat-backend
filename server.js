import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";
import natural from "natural"; // npm install natural
import { createClient } from '@supabase/supabase-js';

dotenv.config();

// --- Supabase Initialization ---
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const app = express();
app.use(cors());
app.use(bodyParser.json());

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// --- Safety Words ---
const SAFEWORDS = [
  "violence", "kill", "sex", "porn", "nude", "weapon", "bomb", "hack", "drugs",
  "terror", "racist", "suicide", "murder", "abuse", "crime", "politics"
];

// --- Allowed Topics (environmental + marine + ecology etc.) ---
const ALLOWED_TOPICS = [
  "biosphere","hi","ecosystem","say my name","ecology","environment","nature","wildlife",
  "biodiversity","conservation","sustainability","habitat","species",
  "natural resources","carbon footprint","renewable energy","greenhouse gases",
  "climate","climate change","global warming","environmental protection",
  "deforestation","reforestation","ecosystem balance","ecological footprint",
  "adaptation","resilience","pollution","carbon cycle","nitrogen cycle",
  "oxygen cycle","biogeochemical","biome","ocean","sea","marine","saltwater",
  "oceanography","marine biology","deep sea","coral","coral reef","reefs",
  "marine ecosystem","marine conservation","marine pollution","plastic pollution",
  "microplastics","fish","fisheries","sea life","marine mammals","whale","dolphin",
  "shark","seal","sea turtle","crustacean","plankton","algae","kelp","seaweed",
  "mangrove","estuary","tides","currents","wave","ocean current","upwelling",
  "marine biodiversity","marine habitat","coral bleaching","water","freshwater",
  "hydrosphere","aquatic","wetlands","river","lake","pond","stream","groundwater",
  "watershed","hydrology","water pollution","water cycle","precipitation",
  "evaporation","runoff","ice caps","glaciers","sea level rise","recycling",
  "sustainable development","renewable","solar energy","wind energy","geothermal",
  "carbon emissions","environmental impact","ocean cleanup","marine debris",
  "coastal erosion","acidification","environmental awareness","ocean acidification",
  "ecotourism","marine sanctuary","climate action","blue economy","green energy",
  "temperature","weather","atmosphere","earth system","biosciences",
  "ecotoxicology","environmental science","geoscience","carbon sink",
  "photosynthesis","phytoplankton","zooplankton","nutrient cycle","sediment",
  "coastal ecosystem","marine reserve","ocean floor","hydrothermal vent",
  "marine geology","seamount","polar regions","antarctica","arctic",
  "marine adaptation","migration","climate data"
];

// --- Helper Filters ---
function isUnsafe(input) {
  const lowered = input.toLowerCase();
  return SAFEWORDS.some((word) => lowered.includes(word));
}

function isRelevant(input) {
  const lowered = input.toLowerCase();

  if (ALLOWED_TOPICS.some(word => lowered.includes(word))) return true;

  const tokens = lowered.split(/\W+/).filter(Boolean);
  for (const token of tokens) {
    for (const topic of ALLOWED_TOPICS) {
      const distance = natural.LevenshteinDistance(token, topic);
      const similarity = 1 - distance / Math.max(token.length, topic.length);
      if (similarity > 0.8) return true; // 80% fuzzy match
    }
  }

  return false;
}

// --- Conversation Memory ---
let conversationHistory = [];

// --- Gemini Chat Route ---
app.post("/chat", async (req, res) => {
  try {
    const userMessage = req.body.message;
    console.log("💬 User:", userMessage);

    if (isUnsafe(userMessage)) {
      return res.json({
        reply: "⚠️ FloatChat AI cannot discuss unsafe or sensitive topics. Please ask about the ocean or environment instead."
      });
    }

    if (!isRelevant(userMessage)) {
      return res.json({
        reply: "I am FloatChat AI 🌊. I focuses only on topics related to the ocean, biosphere, and our planet’s ecosystems. How may I help you in related topics?"
      });
    }

    conversationHistory.push({ role: "user", parts: [{ text: userMessage }] });
    if (conversationHistory.length > 10) conversationHistory.shift();

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: {
        role: "system",
        parts: [
          {
            text: `
You are FloatChat AI — a friendly and intelligent assistant dedicated to topics
about oceans, the biosphere, ecology, and the environment.
Stay within these topics and politely redirect unrelated questions.
Speak warmly, helpfully, and clearly.
            `
          }
        ]
      }
    });

    const result = await model.generateContent({ contents: conversationHistory });
    const aiResponse = result.response.text();

    conversationHistory.push({ role: "model", parts: [{ text: aiResponse }] });

    console.log("🤖 AI:", aiResponse);
    res.json({ reply: aiResponse });

  } catch (error) {
    console.error("Chat error:", error);
    res.status(500).json({ error: "Chat failed" });
  }
});

// --- SIGNUP Route ---
app.post("/signup", async (req, res) => {
  try {
    const { email, password } = req.body;
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) throw error;
    res.json({ success: true, message: "Signup successful!", data });
  } catch (error) {
    console.error("Signup Error:", error.message);
    res.status(400).json({ success: false, message: error.message });
  }
});

app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    res.json({ success: true, message: "Login successful!", data });
  } catch (error) {
    console.error("Login Error:", error.message);
    res.status(400).json({ success: false, message: error.message });
  }
});

// --- Start Server ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`✅ FloatChat backend running on http://localhost:${PORT}`)
);
