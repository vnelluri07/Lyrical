import { Component, type ReactNode } from "react";

export default class ErrorBoundary extends Component<{ children: ReactNode }, { error: string | null }> {
  state = { error: null as string | null };
  static getDerivedStateFromError(e: Error) { return { error: e.message }; }
  render() {
    if (this.state.error) return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <p className="text-red-400 text-lg">Something went wrong</p>
          <p className="text-zinc-500 text-sm">{this.state.error}</p>
          <button onClick={() => this.setState({ error: null })} className="text-sm text-zinc-400 hover:text-white">Try again</button>
        </div>
      </div>
    );
    return this.props.children;
  }
}
