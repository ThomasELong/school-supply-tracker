import { clsx } from 'clsx';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'orange' | 'yellow' | 'green' | 'blue' | 'gray';
}

export function Badge({ children, variant = 'gray' }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
        variant === 'orange' && 'bg-orange-100 text-orange-800',
        variant === 'yellow' && 'bg-yellow-100 text-yellow-800',
        variant === 'green' && 'bg-green-100 text-green-800',
        variant === 'blue' && 'bg-blue-100 text-blue-800',
        variant === 'gray' && 'bg-gray-100 text-gray-700'
      )}
    >
      {children}
    </span>
  );
}
