import { Component, type ReactNode } from "react";
export class ErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <main className="empty">
        <h1>Something went wrong.</h1>
        <p>
          Your saved wardrobe is safe. Reload to try again; unsaved changes may
          be lost.
        </p>
        <button className="primary" onClick={() => location.reload()}>
          Reload Wardrobe
        </button>
      </main>
    ) : (
      this.props.children
    );
  }
}
