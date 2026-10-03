import { Component, type ErrorInfo, type ReactNode } from "react";
import { useLang } from "../i18n/LanguageContext";
import type { Strings } from "../i18n/strings";

interface Props {
  /** Named so the fallback can say which part failed, not just "something". */
  label: string;
  /** Passed in rather than read from context: an error boundary has to be a
   *  class component, and hooks are not available inside one. */
  t: Strings;
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * A blank white screen is the worst possible failure mode for this app.
 *
 * Not because it looks bad — because the entire claim being made here is
 * "this keeps working when things go wrong." A student in a pod cannot open
 * devtools, cannot read a stack trace, and has no one to ask. One bad query
 * taking down the whole interface is exactly the fragility offline-first is
 * supposed to design away.
 *
 * So failures are contained to the pane that caused them, named, and
 * recoverable without a reload.
 */
class ErrorBoundaryInner extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[${this.props.label}] crashed`, error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="rounded-card border border-danger/30 bg-night-surface p-4">
        <p className="font-display text-sm font-semibold text-danger">
          {this.props.t.crashed(this.props.label)}
        </p>
        <p className="mt-1 text-xs leading-relaxed text-muted">{this.props.t.crashedBody}</p>
        <p className="mt-2 break-words font-mono text-[0.65rem] text-muted/70">
          {error.message}
        </p>
        <button
          onClick={() => this.setState({ error: null })}
          className="mt-3 rounded-card border border-white/15 px-3 py-1.5 text-xs text-paper hover:border-white/35"
        >
          {this.props.t.tryAgain}
        </button>
      </div>
    );
  }
}

/**
 * Hook wrapper so callers do not have to thread strings through by hand.
 */
export function ErrorBoundary({ label, children }: { label: string; children: ReactNode }) {
  const { t } = useLang();
  return (
    <ErrorBoundaryInner label={label} t={t}>
      {children}
    </ErrorBoundaryInner>
  );
}
