import { Component, type ErrorInfo, type ReactNode } from "react";
import { BRUTAL } from "../lib/ui";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

/** Evita que un error de render deje toda la app en blanco durante la demo. */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { hasError: false, message: "" };

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : "Error inesperado de la interfaz.",
    };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("[ui] Error de render:", error, info.componentStack);
  }

  override render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f4efe6] p-4">
        <section
          className={`${BRUTAL.cardLg} w-full max-w-md p-5 text-center`}
          role="alert"
        >
          <p className="font-mono text-[10px] font-black uppercase tracking-[0.18em] text-stone-500">
            ACTA INTERRUMPIDA
          </p>
          <h1 className="mt-1 text-2xl font-black uppercase leading-tight tracking-tight">
            La junta se ha atascado
          </h1>
          <p className="mt-2 border-2 border-dashed border-black bg-[#fef08a] px-2 py-2 font-mono text-xs leading-relaxed">
            {this.state.message}
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className={`${BRUTAL.button} mt-4 w-full bg-black px-4 py-3 font-black uppercase text-[#fef08a]`}
          >
            RECARGAR LA JUNTA
          </button>
        </section>
      </main>
    );
  }
}
