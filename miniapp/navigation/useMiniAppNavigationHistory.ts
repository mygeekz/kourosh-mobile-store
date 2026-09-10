import { useCallback, useLayoutEffect, useRef } from "react";
import { useLocation, useNavigate, useNavigationType } from "react-router-dom";

// Only entries observed inside this workspace are eligible for history back.
// A direct Telegram launch falls back to the destination's known parent.
export const useMiniAppNavigationHistory = (workspaceKey: string, fallback: string) => {
  const location = useLocation();
  const action = useNavigationType();
  const navigate = useNavigate();
  const history = useRef({ workspaceKey, keys: [location.key], index: 0 });
  const positions = useRef(new Map<string, number>());
  const previousPath = useRef(location.pathname);

  useLayoutEffect(() => {
    const current = history.current;
    if (current.workspaceKey !== workspaceKey) {
      history.current = { workspaceKey, keys: [location.key], index: 0 };
      positions.current.clear();
    }
    if (current.workspaceKey === workspaceKey && current.keys[current.index] !== location.key) {
      const index = current.keys.indexOf(location.key);
      if (action === "POP" && index >= 0) current.index = index;
      else if (action === "PUSH") {
        current.keys = [...current.keys.slice(0, current.index + 1), location.key];
        current.index++;
      } else if (action === "REPLACE") {
        positions.current.set(location.key, positions.current.get(current.keys[current.index]) || 0);
        current.keys[current.index] = location.key;
      } else history.current = { workspaceKey, keys: [location.key], index: 0 };
    }
    const changedPage = previousPath.current !== location.pathname;
    previousPath.current = location.pathname;
    const target = action === "POP" ? positions.current.get(location.key) : undefined;
    let restoring = target !== undefined;
    const main = document.getElementById("miniapp-content");
    if (changedPage) main?.focus({ preventScroll: true });
    if (changedPage && !restoring) window.scrollTo(0, 0);
    // Lists may still be loading when history returns. Restore once their height
    // permits it, bounded to two seconds and cancelled on user interaction.
    const observer = new ResizeObserver(() => restore());
    const stop = () => { restoring = false; observer.disconnect(); };
    const restore = () => {
      if (!restoring || target === undefined) return;
      window.scrollTo(0, target);
      if (Math.abs(window.scrollY - target) < 2) stop();
    };
    if (restoring && main) observer.observe(main);
    const frame = requestAnimationFrame(restore);
    const timeout = window.setTimeout(stop, 2000);
    const remember = () => { if (!restoring) positions.current.set(location.key, window.scrollY); };
    window.addEventListener("scroll", remember, { passive: true });
    window.addEventListener("touchstart", stop, { passive: true });
    window.addEventListener("wheel", stop, { passive: true });
    return () => {
      cancelAnimationFrame(frame); clearTimeout(timeout); observer.disconnect();
      window.removeEventListener("scroll", remember);
      window.removeEventListener("touchstart", stop);
      window.removeEventListener("wheel", stop);
    };
  }, [action, location.key, location.pathname, workspaceKey]);

  return useCallback(() => {
    const current = history.current;
    if (current.workspaceKey === workspaceKey && current.index > 0) navigate(-1);
    else navigate(fallback, { replace: true });
  }, [fallback, navigate, workspaceKey]);
};
