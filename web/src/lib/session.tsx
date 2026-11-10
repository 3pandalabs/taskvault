"use client";

import { createContext, useContext, useMemo, useSyncExternalStore } from "react";
import { getMe, getMembers, getTokens, subscribeTokens } from "./api";
import { useAsync } from "./hooks";
import type { Member, User } from "./types";

export function useSignedIn() {
  return useSyncExternalStore(
    subscribeTokens,
    () => getTokens().access !== null || getTokens().refresh !== null,
    () => false,
  );
}

type Session = {
  user: User;
  members: Member[];
  setUser: (u: User) => void;
  /** Name for an owner/assignee id; null = "Both". */
  memberName: (id: string | null) => string;
  /** One or two letters for an avatar; null = every member's initial. */
  memberInitials: (id: string | null) => string;
};

const Ctx = createContext<Session | null>(null);

export function useSession(): Session {
  const s = useContext(Ctx);
  if (!s) throw new Error("useSession outside SessionProvider");
  return s;
}

const initial = (n: string) => (n.trim()[0] ?? "?").toUpperCase();

export function SessionProvider({
  user,
  members,
  setUser,
  children,
}: {
  user: User;
  members: Member[];
  setUser: (u: User) => void;
  children: React.ReactNode;
}) {
  const value = useMemo<Session>(() => {
    // /members includes me; keep my own (possibly just-renamed) name current.
    const ms = members.map((m) => (m.id === user.id ? { ...m, name: user.name } : m));
    const byId = new Map(ms.map((m) => [m.id, m.name]));
    return {
      user,
      members: ms,
      setUser,
      memberName: (id) => (id === null ? "Both" : (byId.get(id) ?? "Someone")),
      memberInitials: (id) =>
        id === null ? ms.map((m) => initial(m.name)).join("").slice(0, 2) || "∗" : initial(byId.get(id) ?? "?"),
    };
  }, [user, members, setUser]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSessionLoader(enabled: boolean) {
  return useAsync(async () => {
    const [user, members] = await Promise.all([getMe(), getMembers()]);
    return { user, members };
  }, enabled ? "session" : null);
}
