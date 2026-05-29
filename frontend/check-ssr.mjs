import React from "react";
import { renderToString } from "react-dom/server";

import { App } from "./src/App.tsx";

const html = renderToString(React.createElement(App));
console.log("OK", html.length);
