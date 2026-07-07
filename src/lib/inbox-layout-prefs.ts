const STORAGE_KEY = "pigeon-box:modules-collapsed";

export type InboxModuleId =
  | "overview"
  | "transport"
  | "folders"
  | "mailboxes"
  | "queue"
  | "teamHoles"
  | "inbox";

export type ModuleCollapseState = Record<InboxModuleId, boolean>;

const ACTIVE_MODULE_KEY = "pigeon-box:active-module";

export const DEFAULT_ACTIVE_MODULE: InboxModuleId = "inbox";

export const MODULE_TAB_ORDER: InboxModuleId[] = [
  "overview",
  "transport",
  "folders",
  "mailboxes",
  "queue",
  "teamHoles",
  "inbox"
];

export const MODULE_LABELS: Record<InboxModuleId, string> = {
  overview: "Overview",
  transport: "Transport",
  folders: "Folders & rules",
  mailboxes: "Mailboxes",
  queue: "Queue",
  teamHoles: "Team holes",
  inbox: "Pigeon box"
};

export const DEFAULT_MODULE_COLLAPSE: ModuleCollapseState = {
  overview: false,
  transport: false,
  folders: true,
  mailboxes: false,
  queue: false,
  teamHoles: false,
  inbox: false
};

export function loadModuleCollapseState(): ModuleCollapseState {
  if (typeof window === "undefined") {
    return DEFAULT_MODULE_COLLAPSE;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return DEFAULT_MODULE_COLLAPSE;
    }
    const parsed = JSON.parse(raw) as Partial<ModuleCollapseState>;
    return { ...DEFAULT_MODULE_COLLAPSE, ...parsed };
  } catch {
    return DEFAULT_MODULE_COLLAPSE;
  }
}

export function saveModuleCollapseState(state: ModuleCollapseState) {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function collapseAllModules(): ModuleCollapseState {
  return {
    overview: true,
    transport: true,
    folders: true,
    mailboxes: true,
    queue: true,
    teamHoles: true,
    inbox: true
  };
}

export function expandAllModules(): ModuleCollapseState {
  return {
    overview: false,
    transport: false,
    folders: false,
    mailboxes: false,
    queue: false,
    teamHoles: false,
    inbox: false
  };
}

export function loadActiveModuleId(): InboxModuleId {
  if (typeof window === "undefined") {
    return DEFAULT_ACTIVE_MODULE;
  }
  try {
    const raw = window.localStorage.getItem(ACTIVE_MODULE_KEY);
    if (raw && MODULE_TAB_ORDER.includes(raw as InboxModuleId)) {
      return raw as InboxModuleId;
    }
  } catch {
    // ignore
  }
  return DEFAULT_ACTIVE_MODULE;
}

export function saveActiveModuleId(id: InboxModuleId) {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(ACTIVE_MODULE_KEY, id);
}
