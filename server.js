import express from "express";
import axios from "axios";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";

dotenv.config();

// --- Environment Variable Validation ---
const requiredEnvVars = ['AZURE_ENDPOINT', 'AZURE_API_KEY', 'AZURE_DEPLOYMENT', 'AZURE_API_VERSION'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`❌ Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
}

const {
  AZURE_ENDPOINT,
  AZURE_API_KEY,
  AZURE_DEPLOYMENT,
  AZURE_API_VERSION,
  PORT = 3000
} = process.env;

const app = express();

// --- Middleware ---
// Request body size limit (1MB)
app.use(express.json({ limit: '1mb' }));

// Rate limiting: 100 requests per 15 minutes per IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." }
});
app.use(limiter);

// --- Helper Function ---
/**
 * Calls Azure OpenAI with the given messages.
 * @param {Array} messages - Array of message objects with role and content
 * @param {Object} options - Optional parameters like temperature
 * @returns {Promise<Object>} - The response data from Azure OpenAI
 */
async function callAzureOpenAI(messages, options = {}) {
  const url = `${AZURE_ENDPOINT}/openai/deployments/${AZURE_DEPLOYMENT}/chat/completions?api-version=${AZURE_API_VERSION}`;

  const payload = {
    messages,
    ...options
  };

  const response = await axios.post(url, payload, {
    headers: {
      "api-key": AZURE_API_KEY,
      "Content-Type": "application/json"
    }
  });

  return response.data;
}

// --- Routes ---

// Health check
app.get("/", (_, res) => {
  res.send("🐢 Code Turtle is running");
});

// OpenAI-compatible endpoint
app.post("/v1/chat/completions", async (req, res) => {
  try {
    const data = await callAzureOpenAI(req.body.messages, {
      temperature: req.body.temperature,
      max_tokens: req.body.max_tokens,
      ...req.body
    });
    res.json(data);
  } catch (err) {
    console.error("Azure error:", err.response?.data || err.message);
    res.status(500).json({
      error: "Azure OpenAI error",
      details: err.response?.data || err.message
    });
  }
});

// Review endpoint (used by GitHub Actions)
app.post("/review", async (req, res) => {
  const { diff, prompt } = req.body;

  if (!diff) {
    return res.status(400).json({ error: "diff is required" });
  }

  // Use custom prompt if provided, otherwise use default
  const systemContent = prompt || "You are a senior software engineer performing a strict code review.";

  try {
    const data = await callAzureOpenAI(
      [
        {
          role: "system",
          content: systemContent
        },
        {
          role: "user",
          content: `Review the following diff:\n\n${diff}`
        }
      ],
      { temperature: 0.1 }
    );
    res.json(data);
  } catch (err) {
    console.error("Azure review error:", err.response?.data || err.message);
    res.status(500).json({
      error: "Azure OpenAI error",
      details: err.response?.data || err.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`🐢 Code Turtle running on http://localhost:${PORT}`);
});
