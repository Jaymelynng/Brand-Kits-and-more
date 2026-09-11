import { Component, type ErrorInfo, type ReactNode } from 'react';

/** Recover from a render or lazy-chunk failure without exposing internals to visitors. */
export class PageBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Page failed to load', error, info.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;

    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6 text-slate-900">
        <div role="alert" className="w-full max-w-md rounded-2xl border border-slate-300 bg-white p-8 shadow-lg">
          <h1 className="text-2xl font-bold">This page couldn’t load</h1>
          <p className="mt-3 text-base">Reload the page to try again.</p>
          <button type="button" onClick={() => window.location.reload()}
            className="mt-6 min-h-11 cursor-pointer rounded-lg bg-slate-900 px-5 py-3 font-semibold text-white hover:bg-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-slate-900">
            Reload page
          </button>
        </div>
      </main>
    );
  }
}
