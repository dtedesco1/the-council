# OmniChat Comparator

A single-page React application that allows you to communicate with multiple AI models simultaneously (Gemini, Claude, GPT, Grok) in a side-by-side view. It features global comparison capabilities, where models can critique each other's responses, and export functionality.

## Features

- **Multi-Model Chat**: Send one message, get responses from all configured models.
- **Side-by-Side View**: Compare answers in real-time.
- **Global Compare**: One-click feature to feed all other model responses into every model for critique and synthesis.
- **Markdown Export**: Download entire conversation threads as a ZIP of Markdown files.
- **Real API Integration**: Connects to OpenAI, Anthropic, and xAI (Grok) endpoints.
- **Custom Providers**: Easily connect to OpenRouter, LiteLLM, or LocalAI using custom Base URLs.

## Setup & Running Locally

1.  **Clone the repository**.
2.  **Install Dependencies**:
    ```bash
    npm install
    ```
3.  **Configure Environment**:
    *   Rename `env-example.txt` to `.env`.
    *   Open `.env` and add your API keys (e.g., `VITE_OPENAI_API_KEY`, `VITE_GEMINI_API_KEY`).
    *   The app will automatically read these values when you start it.
4.  **Run the App**:
    ```bash
    npm run dev
    ```
    *   **Note**: For Anthropic and standard OpenAI endpoints to work without CORS errors, we recommend using the local proxy or LiteLLM (see below), or ensuring your browser allows cross-origin requests.
    *   To use the built-in local proxy, set your Base URLs in `.env` to:
        ```
        VITE_ANTHROPIC_BASE_URL=/api/anthropic
        VITE_OPENAI_BASE_URL=/api/openai
        ```

## How to Add Custom Models (OpenRouter, LiteLLM, etc.)

1.  Open **Settings** -> **Models**.
2.  Select **Protocol / Interface**: Choose `OpenAI Compatible`.
3.  Expand **Custom Connection Details**.
4.  **Base URL**: Enter your custom provider's URL (e.g., `https://openrouter.ai/api/v1`).
5.  **API Key**: Enter the key for that provider.
6.  **Model ID**: Enter the specific ID (e.g., `deepseek/deepseek-r1`).
7.  Click **Add Model**.

This allows you to mix official OpenAI models with models from other providers in the same interface.

## Tech Stack

- **React 19**
- **Vite** (Build tool & Proxy)
- **Tailwind CSS**
- **Google GenAI SDK**
- **JSZip**
