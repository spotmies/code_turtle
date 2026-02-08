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
    git clone https://github.com/yourusername/code_turtle.git
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

You can integrate this proxy into your GitHub workflows to automatically review Pull Requests.

*(See the `action.yml` or `.github/workflows` directory for configuration examples - [Coming Soon])*

## 📄 License

MIT