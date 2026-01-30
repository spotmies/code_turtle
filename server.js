import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json({ limit: "5mb" }));

/**
 * REQUIRED ENV VARIABLES (Railway / Server)
 *
 * AZURE_OPENAI_ENDPOINT=https://xxxx.cognitiveservices.azure.com
 * AZURE_OPENAI_KEY=xxxxxxxx
 * AZURE_OPENAI_DEPLOYMENT=gpt-4o
 * AZURE_OPENAI_API_VERSION=2024-12-01-preview
 */

const {
  AZURE_OPENAI_ENDPOINT,
  AZURE_OPENAI_KEY,
  AZURE_OPENAI_DEPLOYMENT,
  AZURE_OPENAI_API_VERSION,
} = process.env;

if (
  !AZURE_OPENAI_ENDPOINT ||
  !AZURE_OPENAI_KEY ||
  !AZURE_OPENAI_DEPLOYMENT ||
  !AZURE_OPENAI_API_VERSION
) {
  console.error("❌ Missing Azure OpenAI environment variables");
  process.exit(1);
}

/**
 * Helper: call Azure OpenAI Chat Completion
 */
async function callAzure(messages, temperature = 0.05) {
  const url =
    `${AZURE_OPENAI_ENDPOINT}/openai/deployments/${AZURE_OPENAI_DEPLOYMENT}` +
    `/chat/completions?api-version=${AZURE_OPENAI_API_VERSION}`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": AZURE_OPENAI_KEY,
    },
    body: JSON.stringify({
      messages,
      temperature,
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw data;
  }

  return data.choices[0].message.content;
}

/**
 * OPENAI-COMPATIBLE ENDPOINT
 * POST /v1/chat/completions
 */
app.post("/v1/chat/completions", async (req, res) => {
  try {
    const { messages, temperature } = req.body;

    if (!messages) {
      return res.status(400).json({ error: "messages required" });
    }

    const output = await callAzure(messages, temperature);

    res.json({
      id: "chatcmpl-proxy",
      object: "chat.completion",
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content: output,
          },
        },
      ],
    });
  } catch (err) {
    res.status(500).json({
      error: "Azure OpenAI error",
      details: err,
    });
  }
});

/**
 * CODE REVIEW ENDPOINT (GitHub Actions)
 * POST /review
 */
app.post("/review", async (req, res) => {
  try {
    const { diff } = req.body;

    if (!diff) {
      return res.status(400).json({ error: "diff required" });
    }

    const messages = [
      {
        role: "system",
        content:
          "You are a senior software engineer. Perform a strict production-grade code review.",
      },
      {
        role: "user",
        content: `Review the following git diff and give clear, actionable feedback:\n\n${diff}`,
      },
    ];

    const review = await callAzure(messages);

    res.json({ review });
  } catch (err) {
    res.status(500).json({
      error: "Azure OpenAI error",
      details: err,
    });
  }
});

/**
 * Health check
 */
app.get("/", (_, res) => {
  res.send("✅ Azure OpenAI Code Reviewer running");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
