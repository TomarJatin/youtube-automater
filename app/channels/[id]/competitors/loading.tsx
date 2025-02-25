import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
	return (
		<main className='container mx-auto p-4'>
			<div className='mb-8'>
				<div className='flex items-center gap-4'>
					<Skeleton className='h-9 w-9' />
					<div>
						<Skeleton className='h-8 w-48' />
						<Skeleton className='mt-1 h-4 w-32' />
					</div>
				</div>
			</div>

			<div className='grid gap-8'>
				<div>
					<Skeleton className='mb-4 h-7 w-32' />
					<div className='space-y-4'>
						<div className='rounded-lg border p-6'>
							<div className='flex flex-col gap-4 md:flex-row'>
								<Skeleton className='h-10 flex-1' />
								<Skeleton className='h-10 flex-1' />
								<Skeleton className='h-10 w-32' />
							</div>
						</div>
						<div className='grid gap-4 md:grid-cols-2'>
							{[1, 2, 3, 4].map((i) => (
								<div key={i} className='rounded-lg border p-4'>
									<div className='flex items-center justify-between'>
										<div className='flex items-center gap-2'>
											<Skeleton className='h-5 w-5' />
											<div>
												<Skeleton className='h-5 w-32' />
												<Skeleton className='mt-1 h-4 w-48' />
											</div>
										</div>
										<Skeleton className='h-8 w-8' />
									</div>
								</div>
							))}
						</div>
					</div>
				</div>

				<div>
					<Skeleton className='mb-4 h-7 w-32' />
					<div className='rounded-lg border p-6'>
						<Skeleton className='mb-4 h-4 w-full' />
						<div className='space-y-2'>
							<Skeleton className='h-4 w-3/4' />
							<Skeleton className='h-4 w-4/5' />
							<Skeleton className='h-4 w-2/3' />
						</div>
						<Skeleton className='mt-6 h-9 w-40' />
					</div>
				</div>
			</div>
		</main>
	);
}
