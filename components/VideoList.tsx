'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Trash2, PlayCircle, Eye, Music } from 'lucide-react';
import { Video } from '@/types/video';

interface VideoListProps {
  channelId: string;
}

export default function VideoList({ channelId }: VideoListProps) {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVideos = async () => {
    try {
      setError(null);
      const response = await fetch(`/api/channels/${channelId}/videos`);
      if (!response.ok) throw new Error('Failed to fetch videos');
      const data = await response.json();
      setVideos(data);
    } catch (error) {
      console.error('Error fetching videos:', error);
      setError('Failed to fetch videos. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (videoId: string) => {
    try {
      const response = await fetch(`/api/channels/${channelId}/videos?videoId=${videoId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete video');
      await fetchVideos(); // Refresh the list
    } catch (error) {
      console.error('Error deleting video:', error);
      setError('Failed to delete video. Please try again.');
    }
  };

  useEffect(() => {
    fetchVideos();
  }, [channelId]);

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-destructive p-8">
        <p>{error}</p>
        <Button onClick={fetchVideos} className="mt-4">
          Try Again
        </Button>
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="text-center p-8 text-muted-foreground">
        No videos found. Create your first video by clicking the "Create New Video" button above.
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {videos.map((video) => (
        <Card key={video.id} className="flex flex-col">
          <CardHeader>
            <div className="flex justify-between items-start">
              <CardTitle className="text-lg">{video.title}</CardTitle>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Video</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete this video? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleDelete(video.id)}>
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardHeader>
          <CardContent className="flex-grow space-y-4 relative">
            <div className="absolute top-0 right-0">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-primary">
                    <Eye className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{video.title}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-6 py-4">
                    <div className="flex items-center justify-between">
                      <Badge variant={video.status === 'completed' ? 'default' : 'secondary'}>
                        {video.status === 'completed' ? 'Completed' : 'In Progress'}
                      </Badge>
                      <div className="text-sm text-muted-foreground">
                        Created: {new Date(video.createdAt).toLocaleString()}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h3 className="text-sm font-medium">Video Idea</h3>
                      <p className="text-sm text-muted-foreground">{video.idea}</p>
                    </div>

                    {video.script && (
                      <div className="space-y-2">
                        <h3 className="text-sm font-medium">Script</h3>
                        <ScrollArea className="h-[200px] w-full rounded-md border p-4">
                          <p className="text-sm whitespace-pre-wrap">{video.script}</p>
                        </ScrollArea>
                      </div>
                    )}

                    {video.images && video.images.length > 0 && (
                      <div className="space-y-2">
                        <h3 className="text-sm font-medium">Generated Images</h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          {video.images.map((url, index) => (
                            <div key={index} className="relative aspect-square rounded-lg overflow-hidden">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={url} alt={`Video image ${index + 1}`} className="object-cover w-full h-full" />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {video.voiceovers && video.voiceovers.length > 0 && (
                      <div className="space-y-2">
                        <h3 className="text-sm font-medium">Voiceovers</h3>
                        <div className="grid gap-2">
                          {video.voiceovers.map((url, index) => (
                            <div key={index} className="flex items-center space-x-2 p-2 rounded-md border">
                              <PlayCircle className="h-4 w-4" />
                              <audio controls className="w-full h-8">
                                <source src={url} type="audio/mpeg" />
                                Your browser does not support the audio element.
                              </audio>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {video.music && (
                      <div className="space-y-2">
                        <h3 className="text-sm font-medium">Background Music</h3>
                        <div className="flex items-center space-x-2 p-2 rounded-md border">
                          <Music className="h-4 w-4" />
                          <audio controls className="w-full h-8">
                            <source src={video.music} type="audio/mpeg" />
                            Your browser does not support the audio element.
                          </audio>
                        </div>
                      </div>
                    )}

                    <div className="text-xs text-muted-foreground">
                      Last updated: {new Date(video.updatedAt).toLocaleString()}
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <Badge variant={video.status === 'completed' ? 'default' : 'secondary'}>
              {video.status === 'completed' ? 'Completed' : 'In Progress'}
            </Badge>
            {video.script && (
              <ScrollArea className="h-[100px]">
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {video.script}
                </p>
              </ScrollArea>
            )}
            {video.images && video.images.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {video.images.slice(0, 3).map((url, index) => (
                  <div key={index} className="relative aspect-square rounded overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt={`Video image ${index + 1}`} className="object-cover w-full h-full" />
                  </div>
                ))}
              </div>
            )}
            {video.voiceovers && video.voiceovers.length > 0 && (
              <div className="flex items-center space-x-2">
                <PlayCircle className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {video.voiceovers.length} Audio Clips
                </span>
              </div>
            )}
          </CardContent>
          <CardFooter className="text-sm text-muted-foreground">
            Created: {new Date(video.createdAt).toLocaleDateString()}
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
