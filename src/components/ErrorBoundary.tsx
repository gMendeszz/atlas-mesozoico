// If something breaks while drawing the UI, shows a message instead of a blank screen.
// (React only catches errors like this with a class component.)
import { Component, type ReactNode } from "react";
import { CARD } from "./classes";

export class ErrorBoundary extends Component<{ children: ReactNode }, { error: boolean }> {
  state = { error: false };

  static getDerivedStateFromError() {
    return { error: true };
  }

  componentDidCatch(error: unknown) {
    console.error(error);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div role="alert" className={`${CARD} absolute top-4 left-4 max-w-[calc(100%-32px)] px-4 py-3.5`}>
        <h1 className="text-xl font-bold">Mesozoic Atlas</h1>
        <p className="mt-1 text-md font-semibold text-error">Something went wrong while building the map. Please reload the page.</p>
      </div>
    );
  }
}
