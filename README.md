# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## NewsAPI setup

1. Create a `.env` file in the project root.
2. Add your NewsAPI key:

```env
VITE_NEWS_API_KEY=your_newsapi_key_here
```

3. Restart the Vite dev server after adding the key.

The app fetches fresh articles from NewsAPI once per day based on the topics selected during onboarding. If the key is missing or the request fails, the demo stories are shown as a fallback.

## Local LLM recap (fast, zero API cost)

This app can generate AI Recap using a local Ollama model (no paid API).

1. Install [Ollama](https://ollama.com/download)
2. Pull a small fast model:

```bash
ollama pull llama3.2:1b
```

3. (Optional) set model name in `.env`:

```env
VITE_LOCAL_LLM_MODEL=llama3.2:1b
```

4. Keep Ollama running, then restart Vite (`npm run dev`).

The frontend calls Ollama via Vite proxy at `/api/ollama`, so no external LLM API is used.
