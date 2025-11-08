import React from 'react';

interface TouchButtonProps {
  children: React.ReactNode;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  fullWidth?: boolean;
  className?: string;
}

export function TouchButton({
  children,
  onClick,
  variant = 'primary',
  disabled = false,
  fullWidth = false,
  className = ''
}: TouchButtonProps) {
  const baseClasses = 'min-h-[44px] px-6 py-3 rounded-lg font-semibold text-base transition-all active:scale-95';

  const variantClasses = {
    primary: 'bg-indigo-600 text-white hover:bg-indigo-700 active:bg-indigo-800',
    secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300 active:bg-gray-400',
    danger: 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800'
  };

  const disabledClasses = 'opacity-50 cursor-not-allowed';
  const widthClasses = fullWidth ? 'w-full' : '';

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${variantClasses[variant]} ${disabled ? disabledClasses : ''} ${widthClasses} ${className}`}
    >
      {children}
    </button>
  );
}
