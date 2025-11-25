'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';

export default function Navbar() {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    return (
        <nav className="glass border-b border-white/10 sticky top-0 z-50 backdrop-blur-xl">
            <div className="container mx-auto px-4 sm:px-6 py-4">
                <div className="flex items-center justify-between">
                    {/* Logo */}
                    <Link 
                        href="/" 
                        className="text-xl sm:text-2xl font-bold text-[#22B8CF] hover:text-[#2DD4BF] transition-colors"
                        onClick={() => setMobileMenuOpen(false)}
                    >
                        eBay Automation
                    </Link>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex gap-6">
                        <Link 
                            href="/" 
                            className="hover:text-[#22B8CF] transition-colors font-medium text-[#E5E5E5]"
                        >
                            Dashboard
                        </Link>
                        <Link 
                            href="/listings/new" 
                            className="hover:text-[#22B8CF] transition-colors font-medium text-[#E5E5E5]"
                        >
                            New Listing
                        </Link>
                        <Link 
                            href="/admin" 
                            className="hover:text-[#22B8CF] transition-colors font-medium text-[#E5E5E5]"
                        >
                            Settings
                        </Link>
                    </div>

                    {/* Mobile Menu Button */}
                    <button
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        className="md:hidden p-2 text-gray-300 hover:text-white transition-colors"
                        aria-label="Toggle menu"
                    >
                        {mobileMenuOpen ? (
                            <X size={24} />
                        ) : (
                            <Menu size={24} />
                        )}
                    </button>
                </div>

                {/* Mobile Menu */}
                {mobileMenuOpen && (
                    <div className="md:hidden mt-4 pb-4 border-t border-white/10 pt-4">
                        <div className="flex flex-col gap-4">
                            <Link
                                href="/"
                                onClick={() => setMobileMenuOpen(false)}
                                className="hover:text-[#22B8CF] transition-colors font-medium py-2 text-[#E5E5E5]"
                            >
                                Dashboard
                            </Link>
                            <Link
                                href="/listings/new"
                                onClick={() => setMobileMenuOpen(false)}
                                className="hover:text-[#22B8CF] transition-colors font-medium py-2 text-[#E5E5E5]"
                            >
                                New Listing
                            </Link>
                            <Link
                                href="/admin"
                                onClick={() => setMobileMenuOpen(false)}
                                className="hover:text-[#22B8CF] transition-colors font-medium py-2 text-[#E5E5E5]"
                            >
                                Settings
                            </Link>
                        </div>
                    </div>
                )}
            </div>
        </nav>
    );
}

