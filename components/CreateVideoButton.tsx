'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Video } from '@/types/db';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

interface CreateVideoButtonProps {
	channelId: string;
}

interface VideoIdea {
	title: string;
	idea: string;
}

export default function CreateVideoButton({ channelId }: CreateVideoButtonProps) {
	const [isOpen, setIsOpen] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [step, setStep] = useState<'competitors' | 'ideas' | 'creating'>('competitors');
	const [competitors, setCompetitors] = useState<string[]>([]);
	const [competitorInput, setCompetitorInput] = useState('');
	const [videoIdeas, setVideoIdeas] = useState<VideoIdea[]>([]);
	const [selectedIdea, setSelectedIdea] = useState<VideoIdea | null>(null);

	const handleAddCompetitor = () => {
		if (competitorInput.trim()) {
			setCompetitors([...competitors, competitorInput.trim()]);
			setCompetitorInput('');
		}
	};

	const handleRemoveCompetitor = (index: number) => {
		setCompetitors(competitors.filter((_, i) => i !== index));
	};

	const handleGenerateIdeas = async () => {
		try {
			setIsLoading(true);
			const response = await fetch(`/api/channels/${channelId}/videos`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ competitorVideos: competitors }),
			});

			if (!response.ok) throw new Error('Failed to generate ideas');

			const ideas = await response.json();
			setVideoIdeas(ideas);
			setStep('ideas');
		} catch (error) {
			toast.error('Failed to generate video ideas');
			console.error(error);
		} finally {
			setIsLoading(false);
		}
	};

	const handleCreateVideo = async (idea: VideoIdea) => {
		try {
			setSelectedIdea(idea);
			setStep('creating');
			setIsLoading(true);

			const response = await fetch(`/api/channels/${channelId}/videos`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ selectedIdea: idea }),
			});

			if (!response.ok) throw new Error('Failed to create video');

			const video = await response.json();
			toast.success('Video created successfully!');
			setIsOpen(false);
			// Reset state
			setStep('competitors');
			setCompetitors([]);
			setVideoIdeas([]);
			setSelectedIdea(null);
		} catch (error) {
			toast.error('Failed to create video');
			console.error(error);
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<Dialog open={isOpen} onOpenChange={setIsOpen}>
			<DialogTrigger asChild>
				<Button>Create New Video</Button>
			</DialogTrigger>
			<DialogContent className='max-w-2xl'>
				<DialogHeader>
					<DialogTitle>Create New Video</DialogTitle>
					<DialogDescription>
						{step === 'competitors'
							? 'Add competitor channels to analyze their content'
							: step === 'ideas'
								? 'Choose a video idea to create'
								: 'Creating your video...'}
					</DialogDescription>
				</DialogHeader>

				{step === 'competitors' && (
					<div className='space-y-4'>
						<div className='flex gap-2'>
							<Input
								placeholder='Enter competitor channel URL'
								value={competitorInput}
								onChange={(e) => setCompetitorInput(e.target.value)}
								onKeyDown={(e) => e.key === 'Enter' && handleAddCompetitor()}
							/>
							<Button onClick={handleAddCompetitor}>Add</Button>
						</div>
						<div className='space-y-2'>
							{competitors.map((competitor, index) => (
								<div key={index} className='flex items-center justify-between rounded-lg border p-2'>
									<span>{competitor}</span>
									<Button variant='ghost' size='sm' onClick={() => handleRemoveCompetitor(index)}>
										Remove
									</Button>
								</div>
							))}
						</div>
						<Button className='w-full' onClick={handleGenerateIdeas} disabled={competitors.length === 0 || isLoading}>
							{isLoading ? (
								<>
									<Loader2 className='mr-2 h-4 w-4 animate-spin' />
									Generating Ideas...
								</>
							) : (
								'Generate Video Ideas'
							)}
						</Button>
					</div>
				)}

				{step === 'ideas' && (
					<div className='grid gap-4'>
						{videoIdeas.map((idea, index) => (
							<Card
								key={index}
								className='cursor-pointer transition-colors hover:bg-accent'
								onClick={() => handleCreateVideo(idea)}
							>
								<CardHeader>
									<CardTitle className='text-lg'>{idea.title}</CardTitle>
								</CardHeader>
								<CardContent>
									<p className='text-sm text-muted-foreground'>{idea.idea}</p>
								</CardContent>
							</Card>
						))}
					</div>
				)}

				{step === 'creating' && selectedIdea && (
					<div className='space-y-4 text-center'>
						<Loader2 className='mx-auto h-8 w-8 animate-spin' />
						<div>
							<p className='font-medium'>{selectedIdea.title}</p>
							<p className='text-sm text-muted-foreground'>Creating your video... This may take a few minutes.</p>
						</div>
					</div>
				)}
			</DialogContent>
		</Dialog>
	);
}
