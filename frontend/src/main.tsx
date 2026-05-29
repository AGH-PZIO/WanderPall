import React from "react";
import { createRoot } from "react-dom/client";

import { App } from "./App";
import { initTheme } from "./shared/theme";
import "./styles.css";

import "./modules/account/ui/account.css";
import "./modules/travel-assistance/ui/travel-assistance.css";
import "./modules/travel-buddies/ui/travel-buddies.css";
import "./modules/maps/ui/maps.css";

initTheme();

createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
