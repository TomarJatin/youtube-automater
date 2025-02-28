'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { VideoIdea } from '@/types/video';

interface VideoIdeasStepProps {
  channelId: string;
  onNext: (data: { selectedIdea: VideoIdea; videoType: 'shorts' | 'long' }) => void;
}

export function VideoIdeasStep({ channelId, onNext }: VideoIdeasStepProps) {
  const [loading, setLoading] = useState(false);
  const [ideas, setIdeas] = useState<VideoIdea[]>([]);
  const [selectedIdeaIndex, setSelectedIdeaIndex] = useState<number | null>(null);
  const [videoType, setVideoType] = useState<'shorts' | 'long'>('long');
  const [error, setError] = useState<string | null>(null);

  const fetchVideoIdeas = async () => {
    try {
      setLoading(true);
      setError(null);

      // First, fetch competitors
      const competitorsResponse = await fetch(`/api/channels/${channelId}/competitors`);
      if (!competitorsResponse.ok) throw new Error('Failed to fetch competitors');
      const competitors = await competitorsResponse.json();

      // Generate video ideas based on competitor videos
      const ideasResponse = await fetch(`/api/channels/${channelId}/videos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          competitorVideos: competitors,
          generateIdeas: true,
        }),
      });

      if (!ideasResponse.ok) throw new Error('Failed to generate video ideas');
      const generatedIdeas = await ideasResponse.json();
      setIdeas(generatedIdeas);
    } catch (error) {
      console.error('Error:', error);
      setError('Failed to generate video ideas. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVideoIdeas();
  }, [channelId]);

  const handleNext = () => {
    if (selectedIdeaIndex !== null) {
      onNext({ 
        selectedIdea: ideas[selectedIdeaIndex],
        videoType
      });
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p>Analyzing competitor videos and generating ideas...</p>
        <p className="text-sm text-muted-foreground">
          This may take a few moments as we analyze your competitors and generate unique video ideas.
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-destructive p-8">
        <p>{error}</p>
        <Button onClick={fetchVideoIdeas} className="mt-4">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Select Video Type</h3>
        <RadioGroup
          value={videoType}
          onValueChange={(value) => setVideoType(value as 'shorts' | 'long')}
          className="flex items-center space-x-4"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="long" id="long" />
            <Label htmlFor="long">Long Form Video</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="shorts" id="shorts" />
            <Label htmlFor="shorts">YouTube Shorts (≤ 30s)</Label>
          </div>
        </RadioGroup>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Select a Video Idea</h3>
        <p className="text-muted-foreground">
          Choose from the following AI-generated video ideas based on competitor analysis:
        </p>
      </div>

      <RadioGroup
        value={selectedIdeaIndex?.toString()}
        onValueChange={(value) => setSelectedIdeaIndex(parseInt(value))}
        className="space-y-4"
      >
        {ideas.map((idea, index) => (
          <Card
            key={index}
            className={`p-4 cursor-pointer transition-colors ${
              selectedIdeaIndex === index ? 'border-primary' : ''
            }`}
          >
            <div className="flex items-start space-x-4">
              <RadioGroupItem value={index.toString()} id={`idea-${index}`} />
              <div className="flex-grow">
                <Label htmlFor={`idea-${index}`} className="font-medium">
                  {idea.title}
                </Label>
                <p className="text-sm text-muted-foreground mt-1">{idea.idea}</p>
              </div>
            </div>
          </Card>
        ))}
      </RadioGroup>

      <div className="flex justify-end pt-4">
        <Button
          onClick={handleNext}
          disabled={selectedIdeaIndex === null}
        >
          Continue to Script
        </Button>
      </div>
    </div>
  );
}
