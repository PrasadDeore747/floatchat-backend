import dotenv from "dotenv";
import { InferenceClient } from "@huggingface/inference";

dotenv.config();
const HF_TOKEN = process.env.HF_TOKEN;
const hf = new InferenceClient(HF_TOKEN);

async function testChat() {
  console.log("💬 Testing chat model...");
  try {
    const response = await hf.chatCompletion({
      model: "HuggingFaceH4/zephyr-7b-beta",
      messages: [{ role: "user", content: "Hello! Tell me about the Indian Ocean." }],
      max_tokens: 100,
    });

    console.log("✅ Chat success!");
    console.log(response.choices?.[0]?.message?.content);
  } catch (err) {
    console.error("❌ Chat test failed:\n", err);
  }
}

testChat();
