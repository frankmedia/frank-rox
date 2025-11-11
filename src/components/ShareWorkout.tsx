import { useState } from "react";
import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";
import { Share } from "@capacitor/share";
import { Button } from "@/components/ui/button";
import { Camera as CameraIcon, Share2 } from "lucide-react";
import { toast } from "sonner";

interface Exercise {
  id: string;
  name: string;
  sets?: number;
  reps?: number;
  suggestedKg?: number;
  durationMin?: number;
  targetDistanceKm?: number;
  type?: string;
}

interface ShareWorkoutProps {
  workoutName?: string;
  exercises: Exercise[];
  onClose?: () => void;
}

export function ShareWorkout({ workoutName, exercises, onClose }: ShareWorkoutProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  const takeSelfie = async () => {
    try {
      setIsProcessing(true);
      
      // Take photo with camera
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: CameraSource.Camera,
      });

      if (image.webPath) {
        setCapturedImage(image.webPath);
        toast.success("Photo captured!");
      }
    } catch (error: any) {
      console.error("Camera error:", error);
      if (error.message?.includes("User cancelled")) {
        toast.info("Photo cancelled");
      } else {
        toast.error("Camera access failed", {
          description: "Please enable camera permissions in settings"
        });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const generateOverlay = async () => {
    if (!capturedImage) return null;

    // Create a canvas to overlay workout stats on the photo
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    // Load the captured image
    const img = new Image();
    img.crossOrigin = "anonymous";
    
    return new Promise<string>((resolve, reject) => {
      img.onload = () => {
        // Set canvas size to match image
        canvas.width = img.width;
        canvas.height = img.height;

        // Draw the photo
        ctx.drawImage(img, 0, 0);

        // Add semi-transparent overlay at bottom
        const overlayHeight = Math.min(600, img.height * 0.4);
        const gradient = ctx.createLinearGradient(0, img.height - overlayHeight, 0, img.height);
        gradient.addColorStop(0, "rgba(0, 0, 0, 0)");
        gradient.addColorStop(0.3, "rgba(0, 0, 0, 0.7)");
        gradient.addColorStop(1, "rgba(0, 0, 0, 0.95)");
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, img.height - overlayHeight, img.width, overlayHeight);

        // Add logo at top
        ctx.fillStyle = "#FFCC00";
        ctx.font = "bold 48px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("RoxPT", img.width / 2, 80);

        // Add workout name if present
        let yPos = img.height - overlayHeight + 60;
        if (workoutName) {
          ctx.fillStyle = "#FFFFFF";
          ctx.font = "bold 36px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(workoutName, img.width / 2, yPos);
          yPos += 50;
        }

        // Add date and time
        const now = new Date();
        const dateStr = now.toLocaleDateString("en-GB", { 
          day: "numeric", 
          month: "short", 
          year: "numeric" 
        });
        const timeStr = now.toLocaleTimeString("en-GB", { 
          hour: "2-digit", 
          minute: "2-digit" 
        });
        
        ctx.fillStyle = "#FFCC00";
        ctx.font = "24px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(`${dateStr} • ${timeStr}`, img.width / 2, yPos);
        yPos += 50;

        // Add exercises list
        ctx.fillStyle = "#FFFFFF";
        ctx.font = "20px sans-serif";
        ctx.textAlign = "left";
        
        const leftMargin = 60;
        const lineHeight = 32;
        let exerciseCount = 0;
        const maxExercises = Math.floor((overlayHeight - (yPos - (img.height - overlayHeight))) / lineHeight) - 1;

        for (const exercise of exercises.slice(0, maxExercises)) {
          if (exercise.type === "intro") continue; // Skip intro cards
          
          let text = `• ${exercise.name}`;
          
          // Add stats
          const stats: string[] = [];
          if (exercise.sets && exercise.reps) {
            stats.push(`${exercise.sets}×${exercise.reps}`);
          }
          if (exercise.suggestedKg) {
            stats.push(`${exercise.suggestedKg}kg`);
          }
          if (exercise.durationMin && exercise.durationMin > 0) {
            if (exercise.durationMin < 1) {
              stats.push(`${Math.round(exercise.durationMin * 60)}sec`);
            } else {
              stats.push(`${Math.round(exercise.durationMin)}min`);
            }
          }
          if (exercise.targetDistanceKm) {
            stats.push(`${exercise.targetDistanceKm}km`);
          }
          
          if (stats.length > 0) {
            text += ` - ${stats.join(" • ")}`;
          }
          
          ctx.fillText(text, leftMargin, yPos);
          yPos += lineHeight;
          exerciseCount++;
        }

        // Add "and X more..." if there are more exercises
        const remainingExercises = exercises.filter(e => e.type !== "intro").length - exerciseCount;
        if (remainingExercises > 0) {
          ctx.fillStyle = "#FFCC00";
          ctx.font = "italic 20px sans-serif";
          ctx.fillText(`...and ${remainingExercises} more exercise${remainingExercises > 1 ? 's' : ''}`, leftMargin, yPos);
        }

        // Convert canvas to blob
        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            resolve(url);
          } else {
            reject(new Error("Failed to create image"));
          }
        }, "image/jpeg", 0.95);
      };

      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = capturedImage;
    });
  };

  const shareImage = async () => {
    try {
      setIsProcessing(true);
      
      const overlayedImage = await generateOverlay();
      if (!overlayedImage) {
        toast.error("Failed to generate image");
        return;
      }

      // Convert blob URL to base64 for sharing
      const response = await fetch(overlayedImage);
      const blob = await response.blob();
      const reader = new FileReader();
      
      reader.onloadend = async () => {
        const base64data = reader.result as string;
        
        try {
          await Share.share({
            title: "My Workout",
            text: `Just crushed this workout with RoxPT! 💪`,
            url: base64data,
            dialogTitle: "Share your workout",
          });
          
          toast.success("Shared successfully!");
          if (onClose) onClose();
        } catch (shareError: any) {
          if (!shareError.message?.includes("cancelled")) {
            console.error("Share error:", shareError);
            toast.error("Failed to share");
          }
        }
      };
      
      reader.readAsDataURL(blob);
    } catch (error) {
      console.error("Share error:", error);
      toast.error("Failed to share image");
    } finally {
      setIsProcessing(false);
    }
  };

  const retakeSelfie = () => {
    setCapturedImage(null);
    takeSelfie();
  };

  return (
    <div className="space-y-4">
      {!capturedImage ? (
        <Button
          onClick={takeSelfie}
          disabled={isProcessing}
          size="lg"
          className="w-full h-14 text-lg font-bold"
          style={{ backgroundColor: "#FFCC00", color: "#000" }}
        >
          <CameraIcon className="w-5 h-5 mr-2" />
          {isProcessing ? "Opening Camera..." : "Take Selfie 📸"}
        </Button>
      ) : (
        <div className="space-y-4">
          {/* Preview */}
          <div className="relative rounded-lg overflow-hidden border-2 border-yellow-500">
            <img 
              src={capturedImage} 
              alt="Workout selfie" 
              className="w-full h-auto"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none" />
            
            {/* Overlay preview */}
            <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
              <div className="text-center mb-2">
                <span className="text-yellow-400 font-bold text-xl">RoxPT</span>
              </div>
              {workoutName && (
                <div className="text-center font-bold text-lg mb-1">
                  {workoutName}
                </div>
              )}
              <div className="text-center text-yellow-400 text-sm mb-2">
                {new Date().toLocaleDateString("en-GB")} • {new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
              </div>
              <div className="text-xs opacity-75 text-center">
                {exercises.filter(e => e.type !== "intro").length} exercises completed
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <Button
              onClick={retakeSelfie}
              variant="outline"
              className="flex-1"
              disabled={isProcessing}
            >
              Retake
            </Button>
            <Button
              onClick={shareImage}
              disabled={isProcessing}
              className="flex-1"
              style={{ backgroundColor: "#FFCC00", color: "#000" }}
            >
              <Share2 className="w-4 h-4 mr-2" />
              {isProcessing ? "Processing..." : "Share"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

