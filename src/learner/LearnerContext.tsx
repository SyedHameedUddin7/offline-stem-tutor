import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import {
  clearActiveLearner,
  createLearner as createLearnerRow,
  deleteLearner as deleteLearnerRow,
  resolveActiveLearner,
  setActiveLearnerId,
  touchLearner,
} from "../lib/learners";
import type { Learner } from "../types";

interface LearnerValue {
  /** null means nobody has been chosen yet — show the picker. */
  learner: Learner | null;
  /** True until the remembered learner has been looked up. */
  loading: boolean;
  select: (learner: Learner) => Promise<void>;
  create: (name: string) => Promise<Learner>;
  remove: (id: string) => Promise<void>;
  /** Hand the device back. Does not delete anything. */
  signOut: () => void;
}

const LearnerContext = createContext<LearnerValue | null>(null);

export function LearnerProvider({ children }: { children: ReactNode }) {
  const [learner, setLearner] = useState<Learner | null>(null);
  const [loading, setLoading] = useState(true);

  // `loading` exists to avoid a flash of the picker for a student who is
  // already signed in — the lookup is an async IndexedDB read, and rendering
  // "Who's learning today?" for 50ms before their own name appears is the
  // kind of wobble that makes an app feel untrustworthy.
  useEffect(() => {
    resolveActiveLearner()
      .then(setLearner)
      .catch((err) => console.error("Could not resolve the active learner", err))
      .finally(() => setLoading(false));
  }, []);

  const select = useCallback(async (next: Learner) => {
    setActiveLearnerId(next.id);
    await touchLearner(next.id);
    setLearner({ ...next, lastActiveAt: Date.now() });
  }, []);

  const create = useCallback(async (name: string) => {
    const created = await createLearnerRow(name);
    setActiveLearnerId(created.id);
    setLearner(created);
    return created;
  }, []);

  const remove = useCallback(
    async (id: string) => {
      await deleteLearnerRow(id);
      if (learner?.id === id) setLearner(null);
    },
    [learner]
  );

  const signOut = useCallback(() => {
    clearActiveLearner();
    setLearner(null);
  }, []);

  return (
    <LearnerContext.Provider value={{ learner, loading, select, create, remove, signOut }}>
      {children}
    </LearnerContext.Provider>
  );
}

export function useLearner(): LearnerValue {
  const value = useContext(LearnerContext);
  if (!value) throw new Error("useLearner must be used inside LearnerProvider");
  return value;
}
