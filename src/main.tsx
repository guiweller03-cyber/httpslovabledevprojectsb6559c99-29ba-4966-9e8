import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Force document title to PetZap
document.title = "PetZap";

createRoot(document.getElementById("root")!).render(<App />);
