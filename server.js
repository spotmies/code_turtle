name: Azure AI Code Review

on:
  pull_request:
    types: [opened, synchronize]

permissions:
  contents: read
  pull-requests: write

jobs:
  ai_review:
    runs-on: ubuntu-latest

    steps:
      # 1️⃣ Checkout full repo history (required for diff)
      - name: Checkout repository
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      # 2️⃣ Generate PR diff
      - name: Generate PR diff
        run: |
          git fetch origin ${{ github.base_ref }}
          git diff origin/${{ github.base_ref }}...HEAD > diff.txt

      # 3️⃣ Send diff to Azure OpenAI reviewer (your proxy)
      - name: Send diff to Azure AI
        id: ai
        run: |
          RESPONSE=$(curl -s -X POST https://coderabbit-production.up.railway.app/review \
            -H "Content-Type: application/json" \
            -d "$(jq -n --arg diff "$(cat diff.txt)" '{diff: $diff}')")

          echo "$RESPONSE" > response.json

      # 4️⃣ Post AI review as PR comment
      - name: Comment on PR
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          BODY=$(cat response.json | jq -r '.review // .choices[0].message.content')

          if [ -z "$BODY" ] || [ "$BODY" = "null" ]; then
            BODY="⚠️ AI review failed or returned empty response."
          fi

          curl -s -X POST \
            -H "Authorization: Bearer $GITHUB_TOKEN" \
            -H "Content-Type: application/json" \
            https://api.github.com/repos/${{ github.repository }}/issues/${{ github.event.pull_request.number }}/comments \
            -d "$(jq -n --arg body "$BODY" '{body: $body}')"
