import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
	return (
		<main className='container mx-auto p-4'>
			<div className='mb-8 flex items-center justify-between'>
				<div>
					<Skeleton className='h-8 w-48' />
					<Skeleton className='mt-1 h-4 w-32' />
				</div>
				<Skeleton className='h-9 w-32' />
			</div>

			<div className='space-y-4'>
				{[1, 2, 3].map((i) => (
					<div key={i} className='rounded-lg border p-4'>
						<div className='flex items-center justify-between'>
							<div>
								<Skeleton className='h-6 w-64' />
								<Skeleton className='mt-1 h-4 w-96' />
							</div>
							<div className='flex items-center gap-2'>
								<Skeleton className='h-6 w-24' />
								<Skeleton className='h-8 w-8' />
								<Skeleton className='h-8 w-8' />
							</div>
						</div>
					</div>
				))}
			</div>

			<div className='mt-8 text-center'>
				<Skeleton className='mx-auto h-4 w-96' />
			</div>
		</main>
	);
}
