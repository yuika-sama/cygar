import React from 'react';

type Props = {
  text?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  inline?: boolean;
};

export default function Loading({ text = 'Đang tải...', size = 'md', className = '', inline = false }: Props) {
  const sizeClass = size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-8 h-8' : 'w-6 h-6';
  const containerClass = inline ? 'flex-row items-center gap-3' : 'flex-col items-center';
  const Root: any = inline ? 'span' : 'div';

  return (
    <Root className={`flex ${containerClass} ${className}`} role="status" aria-live="polite">
      <svg
        className={`${sizeClass} animate-spin text-current`}
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
        ></path>
      </svg>
      <span className={`${inline ? 'text-sm' : 'text-base'} text-current`}>{text}</span>
    </Root>
  );
}
