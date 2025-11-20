import { useEffect } from 'react';
import { Button } from './catalyst/button';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  type?: 'info' | 'error' | 'success' | 'warning';
}

export function Modal({ isOpen, onClose, title, children, type = 'info' }: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const typeColors = {
    info: 'border-cyan-500/30 bg-cyan-500/10',
    error: 'border-red-500/30 bg-red-500/10',
    success: 'border-emerald-500/30 bg-emerald-500/10',
    warning: 'border-amber-500/30 bg-amber-500/10',
  };

  const iconColors = {
    info: 'text-cyan-400',
    error: 'text-red-400',
    success: 'text-emerald-400',
    warning: 'text-amber-400',
  };

  const icons = {
    info: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    error: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    success: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    warning: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className={`relative bg-cyber-darker border ${typeColors[type]} rounded-lg shadow-2xl max-w-md w-full`}>
        <div className="p-6">
          {title && (
            <div className="flex items-center gap-3 mb-4">
              <div className={iconColors[type]}>
                {icons[type]}
              </div>
              <h3 className="text-lg font-semibold text-gray-100">{title}</h3>
            </div>
          )}
          
          <div className="text-gray-300 mb-6">
            {children}
          </div>
          
          <div className="flex justify-end">
            <Button onClick={onClose} color="cyan">
              OK
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
