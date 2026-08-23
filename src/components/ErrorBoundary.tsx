import { Component, ReactNode, ErrorInfo } from "react";

type Props = { children: ReactNode };
type State = { hasError: boolean; error?: Error };

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("ErrorBoundary:", error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <div className="max-w-md bg-white border border-slate-200 rounded-2xl p-6 flex flex-col gap-3 shadow-sm">
            <h2 className="text-sm font-bold text-slate-800">Algo salió mal</h2>
            <p className="text-xs text-slate-500">
              Ocurrió un error inesperado. Puedes recargar la página. Si persiste, contacta
              a soporte.
            </p>
            {this.state.error && (
              <pre className="text-[10px] bg-slate-50 border border-slate-100 rounded-lg p-2 overflow-auto max-h-32">
                {this.state.error.message}
              </pre>
            )}
            <button
              onClick={this.handleReset}
              className="mt-1 text-xs font-bold bg-slate-900 text-white px-3 py-2 rounded-lg hover:bg-slate-800"
            >
              Recargar
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
