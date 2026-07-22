import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";
import App from "./app/App.jsx";
import "./styles.css";

// HashRouter keeps routes in the URL after a "#", which lets pages survive
// a refresh on GitHub Pages (a static host that can't do server-side routing).
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>
);
