import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  /** Shown in place of the children when they throw. */
  fallback: ReactNode;
  /** Included in the console message so a report can be traced to a feature. */
  label: string;
}

/**
 * Contains a render error to one part of the page.
 *
 * Without a boundary, React unmounts the entire tree when anything throws — a
 * failure inside one component takes the header, the nav, and the rest of the
 * page with it. That matters most around React.lazy, which rejects by design
 * when a chunk fails to download: a visitor on a flaky connection would
 * otherwise lose the whole page rather than one panel.
 */
export default class ErrorBoundary extends Component<Props, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[${this.props.label}] render failed:`, error, info.componentStack);
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
