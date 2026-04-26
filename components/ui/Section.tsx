import React from 'react';
import { cn } from '@/lib/utils';

interface SectionProps extends React.HTMLAttributes<HTMLElement> {
    children: React.ReactNode;
    id?: string;
    className?: string;
}

const Section: React.FC<SectionProps> = ({ children, id, className, ...props }) => {
    return (
        <section
            id={id}
            className={cn("py-20 px-6 md:px-12 lg:px-24 w-full flex flex-col justify-center", className)}
            {...props}
        >
            <div className="max-w-7xl mx-auto w-full">
                {children}
            </div>
        </section>
    );
};

export default Section;
