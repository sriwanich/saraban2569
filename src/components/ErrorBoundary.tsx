import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in UI component:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[400px] w-full flex items-center justify-center p-6 bg-[var(--bg-base)]">
          <div className="max-w-md w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 shadow-xl text-center">
            <div className="w-14 h-14 mx-auto mb-4 bg-amber-500/10 text-amber-500 rounded-2xl flex items-center justify-center">
              <AlertTriangle className="w-7 h-7" />
            </div>
            
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">
              {this.props.fallbackTitle || 'เกิดข้อผิดพลาดในการแสดงผล'}
            </h2>
            
            <p className="text-sm text-[var(--text-secondary)] mb-6">
              ระบบตรวจพบข้อขัดข้องชั่วคราว ข้อมูลของคุณยังปลอดภัยอยู่ กรุณาลองใหม่อีกครั้งหรือรีเฟรชหน้าต่าง
            </p>

            <div className="flex flex-col sm:flex-row gap-2 justify-center mb-4">
              <button
                type="button"
                onClick={this.handleReset}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                ลองใหม่อีกครั้ง
              </button>
              
              <button
                type="button"
                onClick={this.handleReload}
                className="px-4 py-2.5 bg-[var(--bg-hover)] hover:bg-[var(--border-color)] text-[var(--text-primary)] border border-[var(--border-color)] text-sm font-medium rounded-xl transition flex items-center justify-center gap-2"
              >
                รีเฟรชหน้าต่าง
              </button>
              
              <button
                type="button"
                onClick={this.handleGoHome}
                className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-medium rounded-xl transition flex items-center justify-center gap-2"
              >
                <Home className="w-4 h-4" />
                หน้าหลัก
              </button>
            </div>

            {Boolean(import.meta.env.DEV && this.state.error) && (
              <details className="mt-4 text-left">
                <summary className="text-xs text-[var(--text-secondary)] cursor-pointer hover:underline">
                  ดูรายละเอียดข้อผิดพลาด (โหมดพัฒนา)
                </summary>
                <div className="mt-2 p-3 bg-red-950/30 border border-red-500/20 rounded-lg text-xs font-mono text-red-400 overflow-x-auto max-h-40">
                  {String(this.state.error || '')}
                  {this.state.errorInfo?.componentStack}
                </div>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
