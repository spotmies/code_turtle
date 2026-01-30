import express from "express";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

const AZURE_ENDPOINT = process.env.AZURE_ENDPOINT;
const AZURE_API_KEY = process.env.AZURE_API_KEY;
const AZURE_DEPLOYMENT = process.env.AZURE_DEPLOYMENT;

if (!AZURE_ENDPOINT || !AZURE_API_KEY || !AZURE_DEPLOYMENT) {
  throw new Error("Missing Azure OpenAI environment variables");
}

const AZURE_URL = `${AZURE_ENDPOINT}/openai/deployments/${AZURE_DEPLOYMENT}/chat/completions?api-version=2024-12-01-preview`;

app.post("/review", async (req, res) => {
  try {
    const { diff } = req.body;

    if (!diff) {
      return res.status(400).json({ error: "diff is required" });
    }

    const payload = {
      messages: [
        {
          role: "system",
          content:
            "You are a senior software engineer. Perform a strict production-grade code review."
        },
        {
          role: "user",
          content: `Review the following git diff:\n\n${diff}`
        }
      ],
      temperature: 0.1
    };

    const response = await axios.post(AZURE_URL, payload, {
      headers: {
        "api-key": AZURE_API_KEY,
        "Content-Type": "application/json"
      }
    });

    res.json(response.data);
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({
      error: "Azure OpenAI error",
      details: err.response?.data || err.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Azure OpenAI proxy running on http://localhost:${PORT}`);
});
