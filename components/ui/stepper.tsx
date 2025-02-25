import * as React from "react";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

export interface StepperProps extends React.HTMLAttributes<HTMLDivElement> {
  steps: {
    title: string;
    description?: string;
  }[];
  currentStep: number;
}

export function Stepper({ steps, currentStep, className, ...props }: StepperProps) {
  return (
    <div className={cn("flex w-full justify-between", className)} {...props}>
      {steps.map((step, index) => {
        const isCompleted = currentStep > index + 1;
        const isCurrent = currentStep === index + 1;

        return (
          <div key={step.title} className="flex flex-1 items-center">
            <div className="relative flex flex-col items-center">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full border-2",
                  {
                    "border-primary bg-primary text-primary-foreground": isCompleted || isCurrent,
                    "border-muted": !isCompleted && !isCurrent,
                  }
                )}
              >
                {isCompleted ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <span>{index + 1}</span>
                )}
              </div>
              <span className="absolute -bottom-6 w-max text-sm">
                {step.title}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div
                className={cn("h-[2px] flex-1 mx-4", {
                  "bg-primary": isCompleted,
                  "bg-muted": !isCompleted,
                })}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
