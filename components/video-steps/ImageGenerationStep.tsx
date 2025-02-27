'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2, RefreshCw } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ImageStepData } from '@/types/video';
import Image from 'next/image';

interface ImageGenerationStepProps {
  videoData: ImageStepData;
  onBack: () => void;
  onNext: (data: { images: string[] }) => void;
}

interface SectionImage {
  url?: string;
  loading: boolean;
  error?: string;
}

export function ImageGenerationStep({ videoData, onBack, onNext }: ImageGenerationStepProps) {
  console.log("video data for image gneration: ", videoData);
  const scriptSections = videoData.script.split('\n\n').filter(section => section.trim());
  const [sectionImages, setSectionImages] = useState<SectionImage[]>(
    scriptSections.map(() => ({ loading: false }))
  );
  const [error, setError] = useState<string | null>(null);

  const generateImageForSection = async (sectionIndex: number, section: string) => {
    try {
      setSectionImages(prev => prev.map((img, i) => 
        i === sectionIndex ? { ...img, loading: true, error: undefined } : img
      ));

      const response = await fetch(`/api/channels/${videoData.channelId}/videos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          script: section,
          generateImage: true,
        }),
      });

      if (!response.ok) throw new Error('Failed to generate image');
      
      const data = await response.json();
      if (!data.imageUrl) throw new Error('No image generated');
      
      setSectionImages(prev => prev.map((img, i) => 
        i === sectionIndex ? { loading: false, url: data.imageUrl } : img
      ));
    } catch (error) {
      console.error('Error:', error);
      setSectionImages(prev => prev.map((img, i) => 
        i === sectionIndex ? { loading: false, error: 'Failed to generate image' } : img
      ));
    }
  };

  const generateAllImages = async () => {
    setError(null);
    for (let i = 0; i < scriptSections.length; i++) {
      await generateImageForSection(i, scriptSections[i]);
    }
  };

  useEffect(() => {
    if(!videoData.images){
      generateAllImages();
    }
  }, []);

  const handleNext = () => {
    const allImages = sectionImages
      .map(img => img.url)
      .filter((url): url is string => url !== undefined);

    // if (allImages.length === scriptSections.length) {
    //   onNext({ images: allImages });
    // }
    onNext({images: allImages});
  };

  const isGenerating = sectionImages.some(img => img.loading);
  const hasError = sectionImages.some(img => img.error);
  const isComplete = sectionImages.every(img => img.url);

  if (isGenerating) {
    const progress = sectionImages.filter(img => img.url).length;
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p>Generating images for your video...</p>
        <p className="text-sm text-muted-foreground">
          Generated {progress} of {scriptSections.length} images
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Generated Images</h3>
        <p className="text-muted-foreground">
          Review the AI-generated images for your video. Each image corresponds to a section of your script.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {scriptSections.map((section, index) => (
          <Card key={index} className="p-4 space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">Section {index + 1}</p>
              <ScrollArea className="h-[100px] w-full rounded-md border p-2">
                <p className="text-sm text-muted-foreground">{section}</p>
              </ScrollArea>
            </div>
            
            <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
              {sectionImages[index].loading ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : sectionImages[index].error ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
                  <p className="text-sm text-destructive text-center mb-2">
                    {sectionImages[index].error}
                  </p>
                  <Button
                    size="sm"
                    onClick={() => generateImageForSection(index, section)}
                  >
                    Try Again
                  </Button>
                </div>
              ) : sectionImages[index].url ? (
                <>
                  <Image
                    src={sectionImages[index].url!}
                    alt={`Generated image for section ${index + 1}`}
                    fill
                    className="object-cover"
                  />
                  <Button
                    size="icon"
                    variant="outline"
                    className="absolute top-2 right-2"
                    onClick={() => generateImageForSection(index, section)}
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </>
              ) : null}
            </div>
          </Card>
        ))}
      </div>

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack}>
          Back to Script
        </Button>
        <div className="space-x-2">
          <Button 
            variant="outline" 
            onClick={generateAllImages}
            disabled={isGenerating}
          >
            Regenerate All Images
          </Button>
          <Button 
            onClick={handleNext}
            disabled={ isGenerating}
          >
            Continue to Voiceover
          </Button>
        </div>
      </div>
    </div>
  );
}
