"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Check, Music, Camera, Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";

const steps = [
  {
    icon: Music,
    title: "Connect Your Music",
    description: "Link your Spotify or Apple Music account to analyze your listening habits.",
    id: "music",
  },
  {
    icon: Camera,
    title: "Grant Photo Access",
    description: "Allow access to your photo gallery for personalized cover generation.",
    id: "photos",
  },
  {
    icon: Lock,
    title: "Privacy First",
    description:
      "Your photos are analyzed locally on your device and never uploaded to our servers.",
    id: "privacy",
  },
];

export default function OnboardingPage() {
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const router = useRouter();

  const handleAction = (stepId: string) => {
    setCompletedSteps((prev) => [...prev, stepId]);
  };

  const allStepsCompleted = completedSteps.length === steps.length;

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-green-400 via-primary to-secondary flex items-center justify-center p-4">
      <div className="w-full max-w-md mx-auto">
        <header className="text-center mb-12">
          <h1 className="text-5xl font-black tracking-tighter text-white">Welcome!</h1>
          <p className="mt-2 text-lg text-white/80">Let's set up your creative space.</p>
        </header>

        <div className="space-y-6">
          {steps.map((step) => (
            <Card
              key={step.id}
              className="bg-white/10 backdrop-blur-lg border border-white/20 text-white rounded-3xl"
            >
              <CardContent className="p-6 flex items-center gap-6">
                <div
                  className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0",
                    completedSteps.includes(step.id)
                      ? "bg-primary text-primary-foreground"
                      : "bg-white/20",
                  )}
                >
                  {completedSteps.includes(step.id) ? <Check /> : <step.icon />}
                </div>
                <div className="flex-grow">
                  <h2 className="font-bold text-lg">{step.title}</h2>
                  <p className="text-sm text-white/70">{step.description}</p>
                </div>
                {!completedSteps.includes(step.id) && (
                  <Button
                    size="sm"
                    className="rounded-full bg-white text-black hover:bg-gray-200"
                    onClick={() => handleAction(step.id)}
                  >
                    {step.id === "privacy" ? "Acknowledge" : "Connect"}
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-12 text-center">
          <Button
            size="lg"
            className="w-full rounded-full bg-white font-bold text-black py-8 text-xl shadow-lg hover:bg-gray-200 disabled:bg-white/50 disabled:text-black/50"
            disabled={!allStepsCompleted}
            onClick={() => router.push("/")}
          >
            Get Started
          </Button>
        </div>
      </div>
    </div>
  );
}
