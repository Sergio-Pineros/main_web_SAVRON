import React from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
    isLoading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = 'primary', size = 'md', isLoading, children, ...props }, ref) => {

        const baseStyles = "inline-flex items-center justify-center font-medium transition-all duration-300 focus:outline-none disabled:opacity-40 disabled:pointer-events-none uppercase tracking-[0.15em] font-heading rounded-savron";

        const variants = {
            primary: "bg-savron-green text-white hover:bg-savron-green-light active:scale-[0.98]",
            secondary: "bg-white text-savron-black hover:bg-white/90 active:scale-[0.98]",
            outline: "border border-white/25 text-white hover:border-savron-silver hover:text-savron-silver active:scale-[0.98]",
            ghost: "text-savron-silver hover:text-white hover:bg-white/5 active:scale-[0.98]",
        };

        const sizes = {
            sm: "h-9 px-5 text-[10px]",
            md: "h-11 px-7 text-xs",
            lg: "h-13 px-10 text-xs",
        };

        return (
            <button
                ref={ref}
                className={cn(baseStyles, variants[variant], sizes[size], className)}
                disabled={isLoading || props.disabled}
                {...props}
            >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {children}
            </button>
        );
    }
);
Button.displayName = "Button";

export { Button };
