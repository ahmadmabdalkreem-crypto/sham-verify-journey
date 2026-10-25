import { useSyncExternalStore } from "react";

export type ChatCustomerRef = {
  customerKey: string;
  name: string | null;
  sessionId: string | null;
  emails: string[];
  requestId: string | null;
};

type State = { open: ChatCustomerRef | null; unreadByKey: Record<string, number>; enabled: boolean };

let state: State = { open: null, unreadByKey: {}, enabled: false };
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function setChatState(patch: Partial<State>) {
  state = { ...state, ...patch };
  emit();
}
export function openAdminChat(ref: ChatCustomerRef) {
  setChatState({ open: ref });
}
export function useChatState() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
    () => state,
  );
}
