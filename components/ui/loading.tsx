'use client';

interface LoadingProps {
	message?: string;
	showSpinner?: boolean;
}

export function Loading({ message = 'Loading...', showSpinner = true }: LoadingProps) {
	return (
		<div className='flex min-h-[200px] items-center justify-center'>
			<div className='text-center'>
				{showSpinner && (
					<div className='mx-auto mb-8 h-2 w-48 overflow-hidden rounded-full bg-secondary'>
						<div className='h-full w-1/3 animate-slide bg-primary'></div>
					</div>
				)}
				<p className='text-muted-foreground'>{message}</p>
			</div>
		</div>
	);
}

export function FullPageLoading({ message, showSpinner }: LoadingProps) {
	return (
		<div className='flex min-h-screen items-center justify-center'>
			<div className='text-center'>
				<h1 className='mb-4 text-2xl font-semibold'>Please Wait</h1>
				<Loading message={message} showSpinner={showSpinner} />
			</div>
		</div>
	);
}
