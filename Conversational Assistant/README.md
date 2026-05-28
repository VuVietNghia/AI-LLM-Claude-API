# Conversational Assistant

A powerful conversational AI assistant built with a custom tool system, supporting real-time streaming and local LLM execution via LM Studio.

## Architecture

- **Backend**: Node.js + Express + TypeScript
- **Frontend**: Next.js (App Router) + React
- **LLM**: Local execution via LM Studio (OpenAI compatible)
- **Tools**: 
  - `calculator` (Basic, Advanced via mathjs, AI mode)
  - `read_file` / `write_file` / `list_directory` (Sandboxed File Operations)
  - `web_fetch` (Extract content from URL using Cheerio)

## Getting Started

### 1. Prerequisites
- Node.js 18+
- LM Studio running locally with a model loaded on `http://localhost:1234`
- Make sure LM Studio has CORS enabled and is set to the `/v1` endpoint API.

### 2. Run Backend
```bash
cd backend
npm install
npm run dev
```

### 3. Run Frontend
```bash
cd frontend
npm install
npm run dev
```

### 4. Setup Sandbox (Optional)
The system uses a `sandbox` directory to read and write files. It is located at the root of the project `Conversational Assistant/sandbox`.

## Features
- **Real Streaming**: Responses and content stream natively as they are generated.
- **Visual Tool Feedback**: Clean UI showing tool execution status.
- **Graceful Error Handling**: Typed errors returned from tools to the LLM and the frontend.
- **Context Window Management**: Automatically truncates old messages if tokens exceed 12k.
