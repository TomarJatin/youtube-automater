'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

const formSchema = z.object({
	niche: z.string().min(1, 'Niche is required'),
	name: z.string().optional(),
	description: z.string().optional(),
	generateAI: z.boolean().default(false),
});

export default function CreateChannelForm() {
	const [isLoading, setIsLoading] = useState(false);
	const router = useRouter();

	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			niche: '',
			name: '',
			description: '',
			generateAI: false,
		},
	});

	async function onSubmit(values: z.infer<typeof formSchema>) {
		try {
			setIsLoading(true);
			const response = await fetch('/api/channels', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(values),
			});

			if (!response.ok) throw new Error('Failed to create channel');

			const channel = await response.json();
			toast.success('Channel created successfully!');
			router.refresh();
			form.reset();
		} catch (error) {
			toast.error('Failed to create channel');
			console.error(error);
		} finally {
			setIsLoading(false);
		}
	}

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
				<FormField
					control={form.control}
					name='niche'
					render={({ field }) => (
						<FormItem>
							<FormLabel>Channel Niche</FormLabel>
							<FormControl>
								<Input placeholder='e.g., Tech Reviews, Cooking, Gaming' {...field} />
							</FormControl>
							<FormDescription>The main topic or category of your YouTube channel</FormDescription>
							<FormMessage />
						</FormItem>
					)}
				/>

				<FormField
					control={form.control}
					name='generateAI'
					render={({ field }) => (
						<FormItem className='flex flex-row items-center justify-between rounded-lg border p-4'>
							<div className='space-y-0.5'>
								<FormLabel className='cursor-pointer text-base'>Use AI Generation</FormLabel>
								<FormDescription>Let AI generate your channel name and description</FormDescription>
							</div>
							<FormControl>
								<Switch checked={field.value} onCheckedChange={field.onChange} />
							</FormControl>
						</FormItem>
					)}
				/>

				{!form.watch('generateAI') && (
					<>
						<FormField
							control={form.control}
							name='name'
							render={({ field }) => (
								<FormItem>
									<FormLabel>Channel Name</FormLabel>
									<FormControl>
										<Input placeholder='Your channel name' {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name='description'
							render={({ field }) => (
								<FormItem>
									<FormLabel>Channel Description</FormLabel>
									<FormControl>
										<Textarea placeholder='Describe your channel' className='resize-none' {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
					</>
				)}

				<Button type='submit' className='w-full' disabled={isLoading}>
					{isLoading ? 'Creating...' : 'Create Channel'}
				</Button>
			</form>
		</Form>
	);
}
