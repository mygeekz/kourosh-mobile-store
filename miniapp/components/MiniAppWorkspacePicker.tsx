import { MiniAppArtwork } from "./MiniAppArtwork";
import React, { useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Check, MoreHorizontal, Store, WalletCards, X } from "../../components/lucide-react";
import { useMiniAppAuth } from "../auth/MiniAppAuthContext";
import { workspaceLabels } from "../navigation/miniAppNavigation";
import type { MiniAppWorkspaceKind } from "../types";

export const MiniAppWorkspacePicker: React.FC<React.PropsWithChildren> = ({ children }) => {
  const { identity, switchWorkspace } = useMiniAppAuth();
  const navigate = useNavigate();
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  if (!identity) return null;
  const active = identity.kind === "staff" ? "manager" : identity.kind;
  // Older responses may omit the workspace list; only the authenticated identity is known.
  const workspaces: Array<{ kind: MiniAppWorkspaceKind; subjectId: number; displayName: string }> = identity.workspaces?.length ? identity.workspaces : [{ kind: active, subjectId: identity.subjectId, displayName: identity.displayName }];
  const showMenu = identity.kind !== "customer" || workspaces.length > 1;
  const label = workspaceLabels[active];
  const Icon = active === "manager" ? Store : WalletCards;
  const close = () => { dialog.current?.close(); trigger.current?.focus(); };
  const select = (kind: MiniAppWorkspaceKind) => {
    close();
    if (kind !== active) void switchWorkspace(kind).then(ok => { if (ok) navigate("/", { replace: true }); });
  };
  const containFocus = (event: React.KeyboardEvent<HTMLDialogElement>) => {
    if (event.key !== "Tab") return;
    const buttons = event.currentTarget.querySelectorAll<HTMLButtonElement>("button:not(:disabled)");
    const first = buttons[0], last = buttons[buttons.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  };

  return <>
    <div className="miniapp-shell-heading"><div className="miniapp-workspace-label"><Icon size={18} aria-hidden="true" /><span>{label}</span></div>{children}</div>
    {showMenu ? <button ref={trigger} type="button" className="miniapp-shell-icon miniapp-workspace-trigger" aria-haspopup="dialog" aria-controls="miniapp-workspaces" aria-label={`تغییر فضای کاری؛ ${label}`} onClick={() => dialog.current?.showModal()}>
      <MoreHorizontal size={20} aria-hidden="true" />
    </button> : null}
    <dialog ref={dialog} id="miniapp-workspaces" className="miniapp-workspace-dialog" dir="rtl" style={{ transformOrigin: "left center" }} aria-labelledby="miniapp-workspaces-title" onClose={() => trigger.current?.focus()} onKeyDown={containFocus} onClick={event => { if (event.target === event.currentTarget) { const rect = event.currentTarget.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) close(); } }}>
      <div className="miniapp-workspace-dialog-heading"><h2 id="miniapp-workspaces-title">انتخاب فضای کاری</h2><button type="button" className="miniapp-shell-icon" aria-label="بستن انتخاب فضای کاری" onClick={close}><X size={20} aria-hidden="true" /></button></div>
      <p className="miniapp-caption text-mutedText">فضای کاری موردنظر را برای ادامه انتخاب کنید.</p>
      <div className="miniapp-workspace-options">{workspaces.map(workspace => <button type="button" key={`${workspace.kind}-${workspace.subjectId}`} onClick={() => select(workspace.kind)} aria-pressed={workspace.kind === active} className="miniapp-workspace-option">
        <MiniAppArtwork kind={workspace.kind === "manager" ? "chart" : workspace.kind === "partner" ? "collaboration" : "shopping"} /><span className="miniapp-workspace-option-copy"><strong>{workspaceLabels[workspace.kind]}</strong><small>{workspace.displayName}</small></span>
        {workspace.kind === active ? <><span className="miniapp-caption">فعال</span><Check size={18} aria-hidden="true" /></> : null}
      </button>)}</div>
    </dialog>
  </>;
};
