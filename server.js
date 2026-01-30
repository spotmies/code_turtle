import express from "express";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

// =========================
// ENV VARIABLES (REQUIRED)
// =========================
const {
  AZURE_ENDPOINT,       // https://xxxx.cognitiveservices.azure.com
  AZURE_API_KEY,        // Azure OpenAI Key
  AZURE_DEPLOYMENT,     // Deployment name (NOT model name)
  AZURE_API_VERSION,    // e.g. 2024-12-01-preview
  PORT = 3000
} = process.env;

if (!AZURE_ENDPOINT || !AZURE_API_KEY || !AZURE_DEPLOYMENT || !AZURE_API_VERSION) {
  console.error("❌ Missing required Azure OpenAI environment variables");
  process.exit(1);
}

// =========================
// HELPERS
// =========================
function azureChatUrl() {
  return `${AZURE_ENDPOINT}/openai/deployments/${AZURE_DEPLOYMENT}/chat/completions?api-version=${AZURE_API_VERSION}`;
}

// =========================
// 1️⃣ OpenAI-Compatible Proxy
// =========================
app.post("/v1/chat/completions", async (req, res) => {
  try {
    const response = await axios.post(
      azureChatUrl(),
      {
        messages: req.body.messages,
        temperature: req.body.temperature ?? 0.1,
        max_tokens: req.body.max_tokens ?? 800
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
    console.error("Azure OpenAI error:", err.response?.data || err.message);
    res.status(500).json({
      error: "Azure OpenAI error",
      details: err.response?.data || err.message
    });
  }
});

// =========================
// 2️⃣ Code Review Endpoint
// =========================
app.post("/review", async (req, res) => {
  try {
    const {
      repo,        // owner/repo
      pr_number,   // PR number
      diff_url,    // GitHub diff URL
      github_token // GitHub token
    } = req.body;

    if (!repo || !pr_number || !diff_url || !github_token) {
      return res.status(400).json({
        error: "repo, pr_number, diff_url, github_token are required"
      });
    }

    // ---- Fetch PR diff ----
    const diffResponse = await axios.get(diff_url, {
      headers: {
        Authorization: `Bearer ${github_token}`,
        Accept: "application/vnd.github.v3.diff"
      }
    });

    const diff = diffResponse.data;

    // ---- Build prompt ----
    const messages = [
      {
        role: "system",
        content:
          "You are a senior software engineer. Perform a strict, production-grade code review."
      },
      {
        role: "user",
        content: `Review the following GitHub Pull Request diff:\n\n${diff}`
      }
    ];

    // ---- Call Azure OpenAI ----
    const aiResponse = await axios.post(
      azureChatUrl(),
      {
        messages,
        temperature: 0.1,
        max_tokens: 900
      },
      {
        headers: {
          "api-key": AZURE_API_KEY,
          "Content-Type": "application/json"
        }
      }
    );

    const reviewText = aiResponse.data.choices[0].message.content;

    // ---- Post comment to PR ----
    await axios.post(
      `https://api.github.com/repos/${repo}/issues/${pr_number}/comments`,
      { body: reviewText },
      {
        headers: {
          Authorization: `Bearer ${github_token}`,
          Accept: "application/vnd.github.v3+json"
        }
      }
    );

    res.json({ status: "review_posted" });
  } catch (err) {
    console.error("Review error:", err.response?.data || err.message);
    res.status(500).json({
      error: "Review failed",
      details: err.response?.data || err.message
    });
  }
});

// =========================
// START SERVER
// =========================
app.listen(PORT, () => {
  console.log(`✅ Azure OpenAI proxy running on http://localhost:${PORT}`);
});
