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
  PORT = 3000
} = process.env;

// Health check
app.get("/", (_, res) => {
  res.send("Azure AI Code Reviewer is running");
});

// OpenAI-compatible endpoint
app.post("/v1/chat/completions", async (req, res) => {
  try {
    const url = `${AZURE_ENDPOINT}/openai/deployments/${AZURE_DEPLOYMENT}/chat/completions?api-version=${AZURE_API_VERSION}`;

    const response = await axios.post(url, req.body, {
      headers: {
        "api-key": AZURE_API_KEY,
        "Content-Type": "application/json"
      }
    });

    res.json(response.data);
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
  const { diff } = req.body;

  if (!diff) {
    return res.status(400).json({ error: "diff is required" });
  }

  try {
    const url = `${AZURE_ENDPOINT}/openai/deployments/${AZURE_DEPLOYMENT}/chat/completions?api-version=${AZURE_API_VERSION}`;

    const response = await axios.post(
      url,
      {
        messages: [
          {
            role: "system",
            content: "You are a senior software engineer performing a strict code review."
          },
          {
            role: "user",
            content: `Review the following diff:\n\n${diff}`
          }
        ],
        temperature: 0.1
      },
      {
        headers: {
          "api-key": AZURE_API_KEY,
          "Content-Type": "application/json"
        }
      }
    );

    res.json(response.data);
  } catch (err) {
    console.error("Azure review error:", err.response?.data || err.message);
    res.status(500).json({
      error: "Azure OpenAI error",
      details: err.response?.data || err.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Azure OpenAI proxy running on http://localhost:${PORT}`);
});
