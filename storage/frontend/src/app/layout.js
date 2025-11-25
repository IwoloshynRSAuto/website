import { Inter } from 'next/font/google';
import './globals.css';
import Script from 'next/script';
import Navbar from '@/components/Navbar';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
    title: 'eBay Listing Automation',
    description: 'AI-powered eBay listing management and automation',
};

export default function RootLayout({ children }) {
    return (
        <html lang="en">
            <head>
                <Script src="/api-config.js" strategy="beforeInteractive" />
            </head>
            <body className={inter.className}>
                <Navbar />
                <main className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
                    {children}
                </main>
            </body>
        </html>
    );
}
