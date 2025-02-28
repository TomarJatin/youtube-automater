'use client';

import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export default function ErrorPage() {
	const searchParams = useSearchParams();
	const router = useRouter();
	const message = searchParams.get('message') || 'An error occurred';

	return (
		<div className='flex min-h-screen flex-col items-center justify-center'>
			<div className='mx-auto max-w-md text-center'>
				<h1 className='mb-4 text-4xl font-bold text-destructive'>Error</h1>
				<p className='mb-8 text-lg text-muted-foreground'>{decodeURIComponent(message)}</p>
				<Button onClick={() => router.push('/')} variant='default' className='w-full'>
					Return to Home
				</Button>
			</div>
		</div>
	);
}
