'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
	useEffect(() => {
		console.error(error);
	}, [error]);

	return (
		<main className='container mx-auto flex min-h-[80vh] flex-col items-center justify-center p-4'>
			<div className='text-center'>
				<h1 className='mb-2 text-4xl font-bold'>Something went wrong!</h1>
				<p className='mb-8 text-muted-foreground'>An unexpected error occurred. Please try again.</p>
				<Button onClick={reset}>
					<RefreshCw className='mr-2 h-4 w-4' />
					Try Again
				</Button>
			</div>
		</main>
	);
}
