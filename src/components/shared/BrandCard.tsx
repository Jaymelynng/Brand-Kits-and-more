import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface BrandCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'hero' | 'compact';
  style?: React.CSSProperties;
}

export const BrandCard = ({ children, className, variant = 'default', ...props }: BrandCardProps) => {
  const variants = {
    default: "bg-card border-2 border-border shadow-xl",
    hero: "bg-card border-2 border-border shadow-2xl",
    compact: "bg-card border-2 border-border shadow-lg hover:shadow-xl"
  };

  return (
    <div 
      className={cn(
        "rounded-2xl transition-smooth",
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export const BrandCardHeader = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div className={cn("p-6 pb-4", className)}>
    {children}
  </div>
);

export const BrandCardContent = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div className={cn("px-5 pb-5", className)}>
    {children}
  </div>
);

export const BrandCardTitle = ({ children, className }: { children: ReactNode; className?: string }) => (
  <h3 className={cn("text-xl font-semibold text-foreground", className)}>
    {children}
  </h3>
);
