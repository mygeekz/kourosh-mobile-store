import React, { useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Check, ChevronDown, Store, WalletCards, X } from "../../components/lucide-react";
import { useMiniAppAuth } from "../auth/MiniAppAuthContext";
import { workspaceLabels } from "../navigation/miniAppNavigation";
import type { MiniAppWorkspaceKind } from "../types";

export const MiniAppWorkspacePicker: React.FC = () => {
  const { identity, switchWorkspace } = useMiniAppAuth();
  const navigate = useNavigate();
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  if (!identity) return null;
  const active = identity.kind === "staff" ? "manager" : identity.kind;
  const workspaces = identity.workspaces || [];
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
    {workspaces.length > 1 ? <button ref={trigger} type="button" className="miniapp-workspace-trigger" aria-haspopup="dialog" aria-controls="miniapp-workspaces" aria-label={`تغییر فضای کاری؛ ${label}`} onClick={() => dialog.current?.showModal()}>
      <Icon size={18} aria-hidden="true" /><span>{label}</span><ChevronDown size={16} aria-hidden="true" />
    </button> : <div className="miniapp-workspace-label"><Icon size={18} aria-hidden="true" /><span>{label}</span></div>}
    <dialog ref={dialog} id="miniapp-workspaces" className="miniapp-workspace-dialog" aria-labelledby="miniapp-workspaces-title" onKeyDown={containFocus} onClick={event => { if (event.target === event.currentTarget) { const rect = event.currentTarget.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) close(); } }}>
      <div className="miniapp-workspace-dialog-heading"><h2 id="miniapp-workspaces-title">انتخاب فضای کاری</h2><button type="button" className="miniapp-shell-icon" aria-label="بستن انتخاب فضای کاری" onClick={close}><X size={20} aria-hidden="true" /></button></div>
      <p className="miniapp-caption text-mutedText">فضای کاری موردنظر را برای ادامه انتخاب کنید.</p>
      <div className="miniapp-workspace-options">{workspaces.map(workspace => <button type="button" key={`${workspace.kind}-${workspace.subjectId}`} onClick={() => select(workspace.kind)} aria-pressed={workspace.kind === active} className="miniapp-workspace-option">
        <span><strong>{workspaceLabels[workspace.kind]}</strong><small>{workspace.displayName}</small></span>
        {workspace.kind === active ? <><span className="miniapp-caption">فعال</span><Check size={18} aria-hidden="true" /></> : null}
      </button>)}</div>
    </dialog>
  </>;
};
