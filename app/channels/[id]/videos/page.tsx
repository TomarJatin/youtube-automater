'use client';

import { useParams } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import VideoList from '@/components/VideoList';
import { CreateVideoStepper } from '@/components/CreateVideoStepper';

export default function VideosPage() {
	const params = useParams();
	const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

	return (
		<div className='container mx-auto space-y-8 p-6'>
			<div className='flex items-center justify-between'>
				<div>
					<h1 className='text-3xl font-bold'>Videos</h1>
					<p className='mt-2 text-muted-foreground'>
						Create and manage your YouTube videos with AI-powered assistance.
					</p>
				</div>
				<Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
					<DialogTrigger asChild>
						<Button size='lg' className='gap-2'>
							Create New Video
						</Button>
					</DialogTrigger>
					<DialogContent className='max-h-[90vh] max-w-4xl overflow-y-auto'>
						<DialogHeader>
							<DialogTitle>Create New Video</DialogTitle>
						</DialogHeader>
						<CreateVideoStepper channelId={params.id as string} onComplete={() => setIsCreateDialogOpen(false)} />
					</DialogContent>
				</Dialog>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Your Videos</CardTitle>
				</CardHeader>
				<CardContent>
					<VideoList channelId={params.id as string} />
				</CardContent>
			</Card>
		</div>
	);
}
