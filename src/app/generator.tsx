"use client";

import { useActionState, useState, useTransition, useEffect, useRef } from "react";
import Image from "next/image";
import {
  Loader2,
  Shuffle,
  Sparkles,
  Image as ImageIcon,
  Save,
  Check,
  Share2,
  Download,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { generateCoverAction, saveStoryAction } from "./actions";
import { songs, userPhotos } from "@/lib/data";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const initialState = {
  generatedCoverUri: null,
  matchedPhotoId: null,
  error: null,
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      size="lg"
      type="submit"
      disabled={pending}
      className="w-full rounded-full bg-gradient-to-r from-primary to-green-400 font-bold text-primary-foreground hover:opacity-90 py-8 text-xl shadow-lg"
    >
      {pending ? (
        <>
          <Loader2 className="mr-2 h-6 w-6 animate-spin" />
          Generating...
        </>
      ) : (
        <>
          <Sparkles className="mr-2 h-6 w-6" />
          Generate Album Art
        </>
      )}
    </Button>
  );
}

function SaveButton({ songId, generatedCoverUri }: { songId: string; generatedCoverUri: string }) {
  const [isPending, startTransition] = useTransition();
  const [isSaved, setIsSaved] = useState(false);
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);

  const handleClick = () => {
    startTransition(async () => {
      const formData = new FormData(formRef.current!);
      const result = await saveStoryAction(formData);
      if (result.success) {
        setIsSaved(true);
        toast({
          title: "Saved to Stories!",
          description: "Your new album cover has been added to your collection.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Save Failed",
          description: result.error,
        });
      }
    });
  };

  return (
    <form ref={formRef}>
      <input type="hidden" name="generatedCoverUri" value={generatedCoverUri} />
      <input type="hidden" name="songId" value={songId} />
      <Button
        type="button"
        onClick={handleClick}
        disabled={isPending || isSaved}
        className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-lg border border-white/30 text-white hover:bg-white/30"
        size="icon"
      >
        {isPending ? <Loader2 className="animate-spin" /> : isSaved ? <Check /> : <Save />}
      </Button>
    </form>
  );
}

export default function Generator() {
  const [currentSongIndex, setCurrentSongIndex] = useState(0);
  const { toast } = useToast();

  const [state, formAction] = useActionState(generateCoverAction, initialState);

  const handleShuffle = () => {
    setCurrentSongIndex((prevIndex) => (prevIndex + 1) % songs.length);
  };

  const currentSong = songs[currentSongIndex];

  useEffect(() => {
    if (state?.error) {
      toast({
        variant: "destructive",
        title: "Generation Failed",
        description: state.error,
      });
      state.error = null;
    }
  }, [state, toast]);

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <header className="text-center mb-12">
        <h1 className="text-5xl font-black tracking-tighter text-white">Aesthetic Album Art</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Remix your favorite tracks with your own photos.
        </p>
      </header>

      <form action={formAction}>
        <input type="hidden" name="songId" value={currentSong.id} />
        {userPhotos.map((p) => (
          <input type="hidden" key={p.id} name="photoIds" value={p.id} />
        ))}

        <div className="space-y-10">
          <Card className="overflow-hidden border-none bg-card shadow-xl">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row gap-6 items-center">
                <div className="relative w-40 h-40 flex-shrink-0">
                  <Image
                    src={currentSong.originalCoverUrl}
                    alt={`${currentSong.title} album cover`}
                    fill
                    className="rounded-3xl object-cover"
                    data-ai-hint="album cover"
                  />
                </div>
                <div className="flex-grow text-center sm:text-left">
                  <Badge
                    variant="secondary"
                    className="mb-2 uppercase tracking-widest bg-secondary/80 text-secondary-foreground"
                  >
                    {currentSong.mood}
                  </Badge>
                  <h2 className="text-3xl font-bold">{currentSong.title}</h2>
                  <p className="text-muted-foreground text-xl">{currentSong.artist}</p>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleShuffle}
                    className="mt-4 text-muted-foreground hover:text-white"
                  >
                    <Shuffle className="mr-2 h-4 w-4" />
                    Shuffle Song
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <section>
            <h3 className="text-2xl font-bold mb-4 flex items-center gap-3">
              <ImageIcon className="text-primary" /> Your Photos
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {userPhotos.map((photo) => (
                <Card
                  key={photo.id}
                  className={cn(
                    "overflow-hidden aspect-square transition-all duration-300 border-2 border-transparent",
                    state.matchedPhotoId === photo.id &&
                      "border-primary shadow-lg shadow-primary/20 scale-105",
                  )}
                >
                  <Image
                    src={photo.url}
                    alt="User photo"
                    width={200}
                    height={200}
                    className="h-full w-full object-cover rounded-2xl"
                    data-ai-hint="portrait lifestyle"
                  />
                </Card>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              AI will pick the best photo to match the song's mood.
            </p>
          </section>

          <div className="pt-6">
            <SubmitButton />
          </div>
        </div>
      </form>

      {state?.generatedCoverUri && (
        <section className="mt-16 text-center">
          <h2 className="text-4xl font-black mb-6 text-white">Your New Cover!</h2>
          <div className="flex justify-center">
            <div className="w-full max-w-sm relative">
              <Card className="overflow-hidden border-2 border-accent/50 shadow-xl shadow-accent/10 rounded-3xl">
                <Image
                  src={state.generatedCoverUri}
                  alt="Generated album cover"
                  width={500}
                  height={500}
                  className="w-full h-auto object-cover"
                />
              </Card>
              <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 flex items-center justify-center gap-4">
                <SaveButton songId={currentSong.id} generatedCoverUri={state.generatedCoverUri} />
                <Button
                  size="icon"
                  className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-lg border border-white/30 text-white hover:bg-white/30"
                >
                  <Share2 />
                </Button>
                <Button
                  size="icon"
                  className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-lg border border-white/30 text-white hover:bg-white/30"
                >
                  <Download />
                </Button>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
