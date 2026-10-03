import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { LanguageProvider } from "./i18n/LanguageContext";
import { LearnerProvider } from "./learner/LearnerContext";
// Self-hosted, before anything else. Fonts were coming from Google's CDN,
// which meant a cold offline boot rendered the whole app in fallback faces —
// a visible wobble in the one claim this project is making. 360KB of latin +
// latin-ext woff2 (latin-ext is what carries the French accents) is a cheap
// price for the shell being genuinely self-contained.
import "./fonts.css";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <LanguageProvider>
      <LearnerProvider>
        <App />
      </LearnerProvider>
    </LanguageProvider>
  </StrictMode>
);
