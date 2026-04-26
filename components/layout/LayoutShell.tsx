"use client";

import { usePathname } from 'next/navigation';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

export default function LayoutShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    // Hide Header/Footer on dashboard routes (they have their own sidebar layouts)
    const isDashboard =
        pathname.startsWith('/admin') ||
        pathname.startsWith('/barber') ||
        pathname.startsWith('/membership') ||
        pathname.startsWith('/host');

    if (isDashboard) {
        return <>{children}</>;
    }

    return (
        <>
            <Header />
            {children}
            <Footer />
        </>
    );
}
