import { ButtonHTMLAttributes, forwardRef } from 'react';
import clsx from 'clsx';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={clsx(
          'relative inline-flex items-center justify-center font-medium transition-all duration-200',
          'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-cyber-black',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          {
            // Primary Variant
            'bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:from-cyan-400 hover:to-blue-500':
              variant === 'primary' && !disabled,
            'shadow-neon-cyan hover:shadow-lg hover:shadow-cyan-500/50': variant === 'primary' && !disabled,
            'focus:ring-cyan-500': variant === 'primary',
            
            // Secondary Variant
            'border border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10 hover:border-cyan-400':
              variant === 'secondary' && !disabled,
            'shadow-sm hover:shadow-neon-cyan': variant === 'secondary' && !disabled,
            'focus:ring-cyan-400': variant === 'secondary',
            
            // Danger Variant
            'bg-gradient-to-r from-pink-500 to-red-600 text-white hover:from-pink-400 hover:to-red-500':
              variant === 'danger' && !disabled,
            'shadow-neon-magenta hover:shadow-lg hover:shadow-pink-500/50': variant === 'danger' && !disabled,
            'focus:ring-pink-500': variant === 'danger',
            
            // Ghost Variant
            'text-gray-300 hover:text-cyan-400 hover:bg-cyber-gray': variant === 'ghost' && !disabled,
            
            // Sizes
            'px-3 py-1.5 text-sm rounded': size === 'sm',
            'px-4 py-2 text-base rounded-md': size === 'md',
            'px-6 py-3 text-lg rounded-lg': size === 'lg',
          },
          className
        )}
        {...props}
      >
        {isLoading && (
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
