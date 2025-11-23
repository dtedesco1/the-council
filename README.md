# OmniChat Comparator

A single-page React application that allows you to communicate with multiple AI models simultaneously (Gemini, Claude, GPT, Grok) in a side-by-side view. It features global comparison capabilities, where models can critique each other's responses, and export functionality.

## Features

- **Multi-Model Chat**: Send one message, get responses from all configured models.
- **Side-by-Side View**: Compare answers in real-time.
- **Global Compare**: One-click feature to feed all other model responses into every model for critique and synthesis.
- **Markdown Export**: Download entire conversation threads as a ZIP of Markdown files.
- **Real API Integration**: Connects to OpenAI, Anthropic, and xAI (Grok) endpoints.

## Setup

1.  **Clone the repository**.
2.  **Install Dependencies**:
    ```bash
    npm install
    ```
3.  **Environment Setup**:
    *   Create a `.env` file.
    *   Add your API Keys: `REACT_APP_OPENAI_API_KEY`, `REACT_APP_ANTHROPIC_API_KEY`, `REACT_APP_GEMINI_API_KEY`, `REACT_APP_XAI_API_KEY`.
4.  **Run Locally**:
    ```bash
    npm run dev
    ```
    *   **IMPORTANT**: You must run this via Vite (`npm run dev` or `vite`) for the API proxies to work. This solves the CORS issues with Anthropic and OpenAI automatically.

## How CORS is Solved

This project uses a `vite.config.ts` file to proxy requests:
- Requests to `/api/anthropic` -> Forwarded to `https://api.anthropic.com/v1`
- Requests to `/api/openai` -> Forwarded to `https://api.openai.com/v1`

This bypasses browser security restrictions allowing you to use the real APIs from `localhost` seamlessly.

## Tech Stack

- **React 19**
- **Vite** (Build tool & Proxy)
- **Tailwind CSS**
- **Google GenAI SDK**
- **JSZip**