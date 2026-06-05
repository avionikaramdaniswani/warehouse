import { cn } from '@/lib/utils';

interface TeLLogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function TeLLogo({ size = 'md', className }: TeLLogoProps) {
  const dims = {
    sm: 'h-9 w-auto',
    md: 'h-12 w-auto',
    lg: 'h-20 w-auto',
  }[size];

  return (
    <img
      src="/tel-logo-transparent.png"
      alt="PT Tanjungenim Lestari Pulp & Paper"
      className={cn(dims, 'object-contain select-none', className)}
      draggable={false}
    />
  );
}
