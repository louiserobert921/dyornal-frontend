import { Component, type ReactNode } from 'react';

/**
 * Catches a render fault in one screen instead of blanking the whole app.
 *
 * React unmounts the entire tree when a render throws, which for a bookkeeping
 * app means a single bad figure takes the navigation with it and the user
 * cannot get back to their books. This keeps the shell standing and offers a
 * way out.
 */
export class ErrorBoundary extends Component<
  { children: ReactNode },
  { message: string | null }
> {
  state = { message: null as string | null };

  static getDerivedStateFromError(error: unknown) {
    return { message: error instanceof Error ? error.message : 'Something went wrong.' };
  }

  componentDidCatch(error: unknown) {
    console.error('Screen failed to render:', error);
  }

  render() {
    if (this.state.message === null) return this.props.children;

    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-5">
        <h2 className="m-0 text-base font-bold text-red-800">This screen could not be shown</h2>
        <p className="m-0 mt-1 text-sm text-red-700">{this.state.message}</p>
        <button
          type="button"
          onClick={() => this.setState({ message: null })}
          className="mt-3 cursor-pointer rounded-lg border-none bg-red-700 px-3 py-2 text-sm font-bold text-white hover:bg-red-800"
        >
          Try again
        </button>
      </div>
    );
  }
}
