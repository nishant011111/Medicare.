import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { FirestoreErrorInfo } from '../firebase';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
  firestoreError: FirestoreErrorInfo | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      errorMessage: '',
      firestoreError: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    let parsedFirestore: FirestoreErrorInfo | null = null;
    try {
      const candidate = JSON.parse(error.message) as Partial<FirestoreErrorInfo>;
      if (candidate && typeof candidate.error === 'string' && candidate.operationType) {
        parsedFirestore = candidate as FirestoreErrorInfo;
      }
    } catch {
      // Standard runtime error
    }

    return {
      hasError: true,
      errorMessage: parsedFirestore
        ? `Database ${parsedFirestore.operationType} error on ${parsedFirestore.path || 'workspace'}: ${parsedFirestore.error}`
        : error.message || 'An unexpected application error occurred.',
      firestoreError: parsedFirestore,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('MediCore UI ErrorBoundary caught error:', error, errorInfo);
  }

  handleReload = (): void => {
    this.setState({ hasError: false, errorMessage: '', firestoreError: null });
    window.location.reload();
  };

  render(): React.ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F4F7FB] dark:bg-[#0A1929] p-6 text-[#172B43] dark:text-slate-100">
        <div className="max-w-md w-full bg-white dark:bg-[#10253E] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-[#102F4D] dark:text-white">
                Workspace Recovery Needed
              </h1>
              <p className="text-xs text-[#718096] dark:text-slate-400">
                {this.state.firestoreError
                  ? 'A Firestore permission or configuration issue occurred.'
                  : 'Something interrupted the current view.'}
              </p>
            </div>
          </div>

          <p className="text-xs text-[#4A5568] dark:text-slate-300 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-lg p-3 break-words">
            {this.state.errorMessage}
          </p>

          <button
            type="button"
            onClick={this.handleReload}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#0866B2] hover:bg-[#075696] text-white text-sm font-semibold transition-colors cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            Reload MediCore
          </button>
        </div>
      </div>
    );
  }
}
