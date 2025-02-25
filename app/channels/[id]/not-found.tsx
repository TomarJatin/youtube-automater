import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function NotFound() {
	return (
		<main className='container mx-auto flex min-h-[80vh] flex-col items-center justify-center p-4'>
			<div className='text-center'>
				<h1 className='mb-2 text-4xl font-bold'>Channel Not Found</h1>
				<p className='mb-8 text-muted-foreground'>
					The channel you&apos;re looking for doesn&apos;t exist or has been deleted.
				</p>
				<Link href='/'>
					<Button>
						<ArrowLeft className='mr-2 h-4 w-4' />
						Back to Home
					</Button>
				</Link>
			</div>
		</main>
	);
}
