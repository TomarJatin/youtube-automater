import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ThemeToggle } from '@/components/ThemeToggle';
import Providers from './providers';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
	title: 'YouTube Channel Automater',
	description: 'Automate your YouTube channel content creation with AI',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang='en' suppressHydrationWarning>
			<body className={inter.className}>
				<Providers>
					<div className='relative min-h-screen'>
						<header className='border-b'>
							<div className='container mx-auto flex items-center justify-between p-4'>
								<a href='/' className='cursor-pointer text-xl font-bold'>
									YouTube Automater
								</a>
								<ThemeToggle />
							</div>
						</header>
						{children}
					</div>
				</Providers>
			</body>
		</html>
	);
}
