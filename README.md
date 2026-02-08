# Code Turtle 🐢 - Azure OpenAI Code Review Proxy

A lightweight Node.js middleware that acts as a bridge between GitHub Actions (or other CI/CD tools) and Azure OpenAI. It provides a specialized endpoint to perform automated code reviews on git diffs using a "Senior Software Engineer" persona.

## 🚀 Features

-   **Azure OpenAI Integration**: Proxies requests to your secure Azure OpenAI deployment.
-   **Automated Code Review**: Dedicated `/review` endpoint that accepts a code diff and returns constructive feedback.
-   **OpenAI Compatibility**: Includes a `/v1/chat/completions` endpoint compatible with standard OpenAI client libraries.
-   **Secure**: Keeps your Azure credentials on the server, exposing only the proxy endpoints.

## 🛠️ Prerequisites

-   Node.js (v18 or higher)
-   An Azure OpenAI resource with a deployed model (e.g., GPT-4 or GPT-3.5-Turbo).

## 📦 Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/spotmies/code_turtle.git
    cd code_turtle
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Configure Environment Variables:**
    Copy the example environment file and fill in your Azure details.
    ```bash
    cp .env.example .env
    ```
    
    Edit `.env`:
    ```ini
    AZURE_ENDPOINT=https://your-resource-name.openai.azure.com
    AZURE_API_KEY=your_azure_api_key
    AZURE_DEPLOYMENT=your_deployment_name
    AZURE_API_VERSION=2023-05-15
    PORT=3000
    ```

## 🏃‍♂️ Running Locally

Start the development server with hot-reload:
```bash
npm run dev
```

The server will start at `http://localhost:3000`.

## 🔌 API Endpoints

### 1. Code Review (`POST /review`)

Submit a git diff for review.

**Request:**
```json
POST /review
Content-Type: application/json

{
  "diff": "diff --git a/server.js b/server.js..."
}
```

**Response:**
Returns the AI's critique of the code changes.

### 2. Chat Completions (`POST /v1/chat/completions`)

Standard OpenAI-compatible endpoint.

**Request:**
```json
POST /v1/chat/completions
Content-Type: application/json

{
  "messages": [{ "role": "user", "content": "Hello!" }]
}
```

## 🤖 GitHub Actions Integration

### 1. Add the Workflow to Your Repository

To enable Code Turtle on a repository, creating a new file at `.github/workflows/code-turtle.yml` with the following content:

```yaml
name: Azure AI Code Review

on:
  pull_request_target:
    types: [opened, synchronize]

permissions:
  contents: read
  pull-requests: write
  issues: write

jobs:
  ai_review:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout base repository
        uses: actions/checkout@v4
        with:
          ref: ${{ github.event.pull_request.base.sha }}
          fetch-depth: 0

      - name: Fetch PR head
        run: |
          PR_NUMBER=${{ github.event.pull_request.number }}
          git fetch origin refs/pull/$PR_NUMBER/head:pr-head

      - name: Generate PR diff
        run: |
          BASE_SHA=${{ github.event.pull_request.base.sha }}
          git diff "$BASE_SHA"...pr-head > diff.txt
          # Optional: log line count
          wc -l diff.txt

      - name: Chunk diff
        run: |
          mkdir -p chunks
          # Split into smaller chunks (adjust line count as needed)
          split -l 400 diff.txt chunks/diff_

      - name: Code Turtle Review
        env:
          # Your deployed Code Turtle instance URL
          # Use a secret for the full URL or just the domain
          API_URL: ${{ secrets.CODE_TURTLE_URL }} 
        run: |
          # 1. Prepare the System Prompt
          cat <<'PROMPT' > prompt.txt
          You are a senior software engineer acting as an automated code reviewer
          similar to CodeRabbit.

          Your goal:
          - Help developers improve code quality
          - Be precise, constructive, and actionable
          - Avoid unnecessary criticism

          Review rules:
          - Focus on bugs, security, performance, and maintainability
          - Ignore formatting-only or whitespace-only changes
          - Suggest fixes or alternatives, not just problems

          Output format:
          ## 🤖 Code Turtle Review
          ### 📌 Summary
          - Short bullet summary
          ---
          ### 💬 Inline Comments
          - **File**: line number - comment
          ---
          ### ⚠️ High-Risk Issues
          - Security/Performance issues
          PROMPT

          echo "## 🤖 Code Turtle Review" > combined_review.md
          echo "" >> combined_review.md

          # 2. Iterate through diff chunks and send to Code Turtle
          for CHUNK in chunks/*; do
            # Ensure we wrap the diff and prompt in a JSON object
            jq -n \
              --arg diff "$(cat "$CHUNK")" \
              --arg prompt "$(cat prompt.txt)" \
              '{diff: $diff, prompt: $prompt}' > payload.json

            RESPONSE=$(curl -s -X POST "$API_URL/review" \
              -H "Content-Type: application/json" \
              -d @payload.json)

            # Extract the content. 
            # Note: Adjust jq path based on your server.js response format.
            # If server.js returns { message: "..." } or similar, update here.
            # Assuming standard OpenAI format or direct text:
            echo "$RESPONSE" | jq -r '.review // .choices[0].message.content // "⚠️ Review failed for this chunk."' >> combined_review.md
            echo -e "\n---\n" >> combined_review.md
          done

      - name: Post Comment on PR
        uses: actions/github-script@v6
        with:
          script: |
            const fs = require('fs');
            const reviewBody = fs.readFileSync('combined_review.md', 'utf8');
            
            if (reviewBody.trim().length === 0) return;

            await github.rest.issues.createComment({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.issue.number,
              body: reviewBody
            });

      - name: Add ai-reviewed label
        uses: actions/github-script@v6
        with:
          script: |
            await github.rest.issues.addLabels({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.issue.number,
              labels: ['ai-reviewed']
            });
```

### 2. Configure Secrets

You must add the `CODE_TURTLE_URL` secret to your repository settings:

1.  Go to **Settings** > **Secrets and variables** > **Actions**.
2.  Click **New repository secret**.
3.  Name: `CODE_TURTLE_URL`
4.  Value: `https://your-deployed-code-turtle-instance.com` (e.g., your Railway or Azure app URL).

### 3. Usage

Once configured, **Code Turtle** will automatically run on:
-   New Pull Requests.
-   New commits pushed to an existing Pull Request.

It will analyze the diff, look for bugs and improvements, and post a consolidated review as a comment on the PR.

## 📄 License

MIT