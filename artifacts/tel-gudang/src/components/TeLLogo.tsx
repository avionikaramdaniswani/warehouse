import { cn } from '@/lib/utils';

interface TeLLogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function TeLLogo({ size = 'md', className }: TeLLogoProps) {
  const dims = {
    sm: { outer: 'w-10 h-10', text: 'text-[13px]', letterBig: 'text-[15px]' },
    md: { outer: 'w-12 h-12', text: 'text-[16px]', letterBig: 'text-[18px]' },
    lg: { outer: 'w-20 h-20', text: 'text-[24px]', letterBig: 'text-[30px]' },
  }[size];

  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center shrink-0',
        'bg-[#cc1f1f] shadow-lg',
        dims.outer,
        className
      )}
    >
      <span
        className="text-white font-extrabold tracking-tight select-none leading-none"
        style={{ fontFamily: 'inherit' }}
      >
        <span className={dims.letterBig}>T</span>
        <span className={cn(dims.text, 'opacity-90')}>e</span>
        <span className={dims.letterBig}>L</span>
      </span>
    </div>
  );
}
