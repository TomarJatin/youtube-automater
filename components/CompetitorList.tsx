'use client';

import { useState } from 'react';
import { CompetitorChannel } from '@/types/db';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Trash2, Youtube } from 'lucide-react';

interface CompetitorListProps {
	initialCompetitors: CompetitorChannel[];
	channelId: string;
}

export default function CompetitorList({ initialCompetitors, channelId }: CompetitorListProps) {
	const [competitors, setCompetitors] = useState(initialCompetitors);
	const [newCompetitor, setNewCompetitor] = useState({
		name: '',
		url: '',
	});

	const handleAddCompetitor = async () => {
		try {
			if (!newCompetitor.name.trim() || !newCompetitor.url.trim()) {
				toast.error('Please provide both name and URL');
				return;
			}

			const response = await fetch(`/api/channels/${channelId}/competitors`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					competitors: [newCompetitor],
				}),
			});

			if (!response.ok) throw new Error('Failed to add competitor');

			const addedCompetitors = await response.json();
			setCompetitors([...competitors, ...addedCompetitors]);
			setNewCompetitor({ name: '', url: '' });
			toast.success('Competitor added successfully');
		} catch (error) {
			toast.error('Failed to add competitor');
			console.error(error);
		}
	};

	const handleDeleteCompetitor = async (competitorId: string) => {
		try {
			const response = await fetch(`/api/channels/${channelId}/competitors/${competitorId}`, {
				method: 'DELETE',
			});

			if (!response.ok) throw new Error('Failed to delete competitor');

			setCompetitors(competitors.filter((competitor) => competitor.id !== competitorId));
			toast.success('Competitor deleted successfully');
		} catch (error) {
			toast.error('Failed to delete competitor');
			console.error(error);
		}
	};

	return (
		<div className='space-y-6'>
			<Card>
				<CardHeader>
					<CardTitle>Add New Competitor</CardTitle>
					<CardDescription>Add competitor channels to analyze their content</CardDescription>
				</CardHeader>
				<CardContent>
					<div className='flex flex-col gap-4 md:flex-row'>
						<Input
							placeholder='Channel Name'
							value={newCompetitor.name}
							onChange={(e) => setNewCompetitor({ ...newCompetitor, name: e.target.value })}
						/>
						<Input
							placeholder='Channel URL'
							value={newCompetitor.url}
							onChange={(e) => setNewCompetitor({ ...newCompetitor, url: e.target.value })}
						/>
						<Button onClick={handleAddCompetitor}>Add Competitor</Button>
					</div>
				</CardContent>
			</Card>

			<div className='grid gap-4 md:grid-cols-2'>
				{competitors.map((competitor) => (
					<Card key={competitor.id}>
						<CardHeader className='flex flex-row items-center justify-between'>
							<div className='flex items-center gap-2'>
								<Youtube className='h-5 w-5 text-red-600' />
								<div>
									<CardTitle className='text-lg'>{competitor.name}</CardTitle>
									<CardDescription className='truncate'>{competitor.url}</CardDescription>
								</div>
							</div>
							<Button variant='destructive' size='icon' onClick={() => handleDeleteCompetitor(competitor.id)}>
								<Trash2 className='h-4 w-4' />
							</Button>
						</CardHeader>
					</Card>
				))}
			</div>

			{competitors.length === 0 && (
				<div className='text-center text-muted-foreground'>
					No competitors added yet. Add competitors to analyze their content and generate video ideas.
				</div>
			)}
		</div>
	);
}
