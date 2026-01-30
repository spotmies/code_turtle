import express from "express";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

const {
  AZURE_ENDPOINT,
  AZURE_API_KEY,
  AZURE_DEPLOYMENT,
  AZURE_API_VERSION,
  PORT
} = process.env;

// 🔴 Safety check
if (!AZURE_ENDPOINT || !AZURE_API_KEY || !AZURE_DEPLOYMENT) {
  console.error("❌ Missing Azure environment variables");
  process.exit(1);
}

// Azure Chat Completions URL
const azureUrl = `${AZURE_ENDPOINT}/openai/deployments/${AZURE_DEPLOYMENT}/chat/completions?api-version=${AZURE_API_VERSION}`;

app.post("/v1/chat/completions", async (req, res) => {
  try {
    const response = await axios.post(
      azureUrl,
      req.body,
      {
        headers: {
          "api-key": AZURE_API_KEY,
       
          "Content-Type": "application/json"
        }
      }
    );

    // Transform the response to match the standard OpenAI format
    const transformedResponse = {
      id: response.data.id,
      object: response.data.object,
      created: response.data.created,
      model: response.data.model,
      choices: response.data.choices.map((choice) => ({
        index: choice.index,
        message: {
          role: choice.message.role,
          content: choice.message.content,
          refusal: choice.message.refusal || null,
          annotations: choice.message.annotations || []
        },
        logprobs: choice.logprobs || null,
        finish_reason: choice.finish_reason
      })),
      usage: response.data.usage,
      service_tier: "default",
      system_fingerprint: response.data.system_fingerprint
    };

    res.json(transformedResponse);
  } catch (err) {
    console.error("Azure error:", err.response?.data || err.message);
    res.status(500).json({
      error: "Azure OpenAI error",
      details: err.response?.data || err.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Azure OpenAI proxy running on http://localhost:${PORT}`);
});
