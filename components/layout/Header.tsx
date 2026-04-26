import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import Image from 'next/image';

const navLinks = [
    { href: '#about', label: 'About' },
    { href: '#services', label: 'Services' },
    { href: '/portal', label: 'Join Team' },
];

const Header = () => {
    return (
        <header className="fixed top-0 left-0 right-0 z-50 bg-savron-black/90 backdrop-blur-xl">
            {/* Thin silver accent line at very top */}
            <div className="h-px w-full bg-gradient-to-r from-transparent via-savron-silver/30 to-transparent" />

            <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-24 h-20 flex items-center justify-between">

                {/* Logo */}
                <Link href="/" className="relative w-28 h-7 md:w-36 md:h-9 opacity-90 hover:opacity-100 transition-opacity duration-300">
                    <Image
                        src="/logo.png"
                        alt="SAVRON"
                        fill
                        className="object-contain object-left"
                        priority
                    />
                </Link>

                {/* Desktop Navigation */}
                <nav className="hidden md:flex items-center gap-10">
                    {navLinks.map(({ href, label }) => (
                        <Link
                            key={href}
                            href={href}
                            className="relative text-[11px] uppercase tracking-[0.2em] text-savron-silver hover:text-white transition-colors duration-300 group"
                        >
                            {label}
                            <span className="absolute -bottom-1 left-0 w-0 h-px bg-savron-gold group-hover:w-full transition-all duration-500" />
                        </Link>
                    ))}
                </nav>

                {/* CTA */}
                <Link href="/booking">
                    <Button size="sm">Book Now</Button>
                </Link>
            </div>

            {/* Subtle bottom border */}
            <div className="h-px w-full bg-white/[0.04]" />
        </header>
    );
};

export default Header;
