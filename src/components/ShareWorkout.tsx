import { useState } from "react";
import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";
import { Share } from "@capacitor/share";
import { Filesystem, Directory } from "@capacitor/filesystem";
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
  capturedImage?: string | null; // Can be passed from parent
}

export function ShareWorkout({ workoutName, exercises, onClose, capturedImage: initialImage }: ShareWorkoutProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(initialImage || null);

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

            // Add 20% opacity overlay over entire image
            ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
            ctx.fillRect(0, 0, img.width, img.height);

            // Top branding banner (like navigation bar)
            const bannerHeight = 100;
            ctx.fillStyle = "rgba(0, 0, 0, 0.85)"; // Dark banner
            ctx.fillRect(0, 0, img.width, bannerHeight);

            const leftMargin = 40;
            const rightMargin = 40;
            
            // Draw flame icon in banner (yellow)
            ctx.strokeStyle = "#FFCC00";
            ctx.fillStyle = "#FFCC00";
            ctx.lineWidth = 3;
            ctx.lineCap = "round";
            ctx.lineJoin = "round";
            
            // Scale and position flame path
            ctx.save();
            ctx.translate(leftMargin, 25);
            ctx.scale(2, 2);
            ctx.beginPath();
            // Flame SVG path
            ctx.moveTo(8.5, 14.5);
            ctx.bezierCurveTo(8.5, 15.88, 9.62, 17, 11, 17);
            ctx.lineTo(11, 12);
            ctx.bezierCurveTo(11, 10.62, 10.5, 10, 10, 9);
            ctx.bezierCurveTo(8.928, 6.857, 9.776, 4.946, 12, 3);
            ctx.bezierCurveTo(12.5, 5.5, 14, 7.9, 16, 9.5);
            ctx.bezierCurveTo(18, 11.1, 19, 13, 19, 15);
            ctx.arc(12, 15, 7, 0, 2 * Math.PI);
            ctx.bezierCurveTo(5, 13.847, 5.433, 12.706, 6, 12);
            ctx.bezierCurveTo(6, 13.38, 7.12, 14.5, 8.5, 14.5);
            ctx.closePath();
            ctx.stroke();
            ctx.restore();
            
            // Add "Rox" in yellow + "PT" in white
            ctx.font = "bold 48px sans-serif";
            ctx.textAlign = "left";
            ctx.fillStyle = "#FFCC00";
            ctx.fillText("Rox", leftMargin + 70, 65);
            
            const roxWidth = ctx.measureText("Rox").width;
            ctx.fillStyle = "#FFFFFF";
            ctx.fillText("PT", leftMargin + 70 + roxWidth, 65);

            // Add date and time at TOP RIGHT in banner (3x bigger)
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
            
            ctx.font = "bold 60px sans-serif"; // Was 20px, now 60px (3x bigger)
            ctx.textAlign = "right";
            ctx.fillStyle = "#FFFFFF";
            ctx.fillText(`${dateStr}`, img.width - rightMargin, 50);
            ctx.fillText(`${timeStr}`, img.width - rightMargin, 115);

        // Calculate workout list positioning from the BOTTOM up
        const bottomPadding = 60; // Space from bottom edge
        const lineHeight = 55;
        const headerHeight = 65; // "Workout Complete" header
        const workoutNameHeight = workoutName ? 70 : 0;
        
        // Calculate how many exercises we can fit
        const nonIntroExercises = exercises.filter(e => e.type !== "intro");
        const exerciseListHeight = nonIntroExercises.length * lineHeight;
        const totalContentHeight = workoutNameHeight + headerHeight + exerciseListHeight + bottomPadding;
        
        // Start position: image height minus total content height
        let yPos = img.height - totalContentHeight;
        
        // If content is too tall, start from a reasonable position (50% from bottom)
        if (yPos < img.height * 0.4) {
          yPos = img.height * 0.5;
        }

        // Add workout name if present
        if (workoutName) {
          ctx.fillStyle = "#FFFFFF";
          ctx.font = "bold 48px sans-serif";
          ctx.textAlign = "left";
          ctx.fillText(workoutName, leftMargin, yPos);
          yPos += 70;
        }

        // Add "Workout Complete" header
        ctx.fillStyle = "#FFCC00";
        ctx.font = "bold 42px sans-serif";
        ctx.textAlign = "left";
        ctx.fillText("Workout Complete", leftMargin, yPos);
        yPos += 65;

        // Add exercises list (3x bigger text)
        ctx.fillStyle = "#FFFFFF";
        ctx.font = "36px sans-serif";
        ctx.textAlign = "left";
        
        let exerciseCount = 0;
        const maxExercises = Math.floor((img.height - yPos - bottomPadding) / lineHeight);

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
          ctx.font = "italic 32px sans-serif"; // Was 20px, now 32px
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

      // Convert blob URL to base64
      const response = await fetch(overlayedImage);
      const blob = await response.blob();
      const reader = new FileReader();
      
      reader.onloadend = async () => {
        try {
          const base64data = (reader.result as string).split(',')[1]; // Remove data:image/jpeg;base64, prefix
          
          // Save image to filesystem
          const fileName = `workout-${Date.now()}.jpg`;
          const savedFile = await Filesystem.writeFile({
            path: fileName,
            data: base64data,
            directory: Directory.Cache,
          });

          console.log('File saved:', savedFile.uri);

          // Share the file using native share sheet
          await Share.share({
            title: "My Workout",
            text: `Just crushed this workout with RoxPT! 💪`,
            url: savedFile.uri,
            dialogTitle: "Share your workout",
          });
          
          toast.success("Shared successfully!");
          if (onClose) onClose();
        } catch (shareError: any) {
          console.error("Share error:", shareError);
          if (!shareError.message?.includes("cancelled") && !shareError.message?.includes("cancel")) {
            toast.error("Failed to share", {
              description: shareError.message || "Please try again"
            });
          }
        }
      };
      
      reader.readAsDataURL(blob);
    } catch (error: any) {
      console.error("Share error:", error);
      toast.error("Failed to share image", {
        description: error.message || "Please try again"
      });
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
            
            {/* 20% opacity overlay over entire image */}
            <div className="absolute inset-0 bg-black/20 pointer-events-none" />
            
            {/* Top branding banner (like navigation bar) */}
            <div className="absolute top-0 left-0 right-0 h-20 bg-black/85 flex items-center justify-between px-4">
              {/* Left: Flame icon + RoxPT */}
              <div className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#FFCC00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"></path>
                </svg>
                <span className="font-bold text-2xl">
                  <span className="text-yellow-400">Rox</span>
                  <span className="text-white">PT</span>
                </span>
              </div>
              
              {/* Right: Date & Time */}
              <div className="text-right text-white font-bold text-sm leading-tight">
                <div>{new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</div>
                <div>{new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</div>
              </div>
            </div>
            
            {/* Bottom section: Workout details (pushed lower) */}
            <div className="absolute bottom-0 left-0 right-0 p-4 text-white" style={{ bottom: "0%", height: "45%" }}>
              {workoutName && (
                <div className="font-bold text-xl mb-2">
                  {workoutName}
                </div>
              )}
              <div className="text-yellow-400 font-bold text-lg mb-2">
                Workout Complete
              </div>
              <div className="text-sm space-y-1">
                {exercises.filter(e => e.type !== "intro").slice(0, 3).map((ex, i) => (
                  <div key={i}>• {ex.name}</div>
                ))}
                {exercises.filter(e => e.type !== "intro").length > 3 && (
                  <div className="text-yellow-400 italic">
                    ...and {exercises.filter(e => e.type !== "intro").length - 3} more
                  </div>
                )}
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

