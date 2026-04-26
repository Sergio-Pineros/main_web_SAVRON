import type { Metadata } from 'next';
import { Montserrat, Inter } from 'next/font/google';
import './globals.css';
import LayoutShell from '@/components/layout/LayoutShell';

const montserrat = Montserrat({
    subsets: ['latin'],
    variable: '--font-montserrat',
    display: 'swap',
});

const inter = Inter({
    subsets: ['latin'],
    variable: '--font-inter',
    display: 'swap',
});

export const metadata: Metadata = {
    title: 'SAVRON | Luxury Barbershop Minneapolis',
    description: 'Experience the art of grooming at SAVRON. A members-only club atmosphere for the modern gentleman in Minneapolis.',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" className="scroll-smooth">
            <body className={`${montserrat.variable} ${inter.variable} font-sans bg-savron-black text-white antialiased`}>
                <LayoutShell>
                    {children}
                </LayoutShell>
            </body>
        </html>
    );
}
