'use client';
import { ThemeProvider } from '@/components/theme-providers';
import { TooltipProvider } from '@/components/ui/tooltip';

const Providers = ({ children }: { children: React.ReactNode }) => {
	return (
		<ThemeProvider attribute='class' defaultTheme='system' disableTransitionOnChange>
			<TooltipProvider>{children}</TooltipProvider>
		</ThemeProvider>
	);
};

export default Providers;
