import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";
import App from "./App";
import { MiniAppAuthProvider } from "./auth/MiniAppAuthContext";
import { MiniAppErrorBoundary } from "./components/MiniAppErrorBoundary";
import { MiniAppPermissionProvider } from "./permission/MiniAppPermissionContext";
import { applyTelegramEnvironment, getTelegramWebApp, initializeTelegramWebApp } from "./telegram";
import "../styles/themes.css";
import "./tailwind.css";

const rootElement = document.getElementById("miniapp-root");
if (!rootElement) throw new Error("Mini App root element is missing");

const webApp = initializeTelegramWebApp();
const refreshTelegramEnvironment = () => applyTelegramEnvironment();
webApp?.onEvent("themeChanged", refreshTelegramEnvironment);
webApp?.onEvent("safeAreaChanged", refreshTelegramEnvironment);
webApp?.onEvent("contentSafeAreaChanged", refreshTelegramEnvironment);

ReactDOM.createRoot(rootElement).render(
  <MiniAppErrorBoundary>
    <HashRouter>
      <MiniAppAuthProvider>
        <MiniAppPermissionProvider>
          <App />
        </MiniAppPermissionProvider>
      </MiniAppAuthProvider>
    </HashRouter>
  </MiniAppErrorBoundary>,
);

window.addEventListener("pagehide", () => {
  const current = getTelegramWebApp();
  current?.offEvent("themeChanged", refreshTelegramEnvironment);
  current?.offEvent("safeAreaChanged", refreshTelegramEnvironment);
  current?.offEvent("contentSafeAreaChanged", refreshTelegramEnvironment);
});
