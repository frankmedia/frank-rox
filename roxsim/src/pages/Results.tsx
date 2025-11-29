import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Trophy, Home, Share2, Activity, Camera, X, Medal } from 'lucide-react';
import { formatTime } from '@/lib/utils';
import { HyroxType, HyroxStation, WorkoutId } from '@/types';
import { hapticImpact, HapticsImpactStyle } from '@/utils/hapticsBridge';
import { triggerConfetti } from '@/utils/confetti';
import { useUser } from '@/contexts/UserContext';
import { Share } from '@capacitor/share';
import { Camera as CapacitorCamera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';
import { getWorkoutById } from '@/lib/workouts';

interface ResultsState {
  totalTime: number;
  stationTimes: number[];
  stations: HyroxStation[];
  workoutId?: WorkoutId;
}

export function Results() {
  const { type } = useParams<{ type: HyroxType }>();
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as ResultsState;
  const { profile } = useUser();
  
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  if (!state || !type) {
    console.error('Results page: Missing state or type', { state, type });
    navigate('/');
    return null;
  }

  const { totalTime, stationTimes, stations, workoutId } = state;
  console.log('Results page loaded:', { totalTime, stationTimes: stationTimes.length, stations: stations.length });
  const workout = getWorkoutById(workoutId || (type === 'half' ? 'hyrox_half' : 'hyrox_full'));
  
  // Circuit workouts don't have split times
  const isCircuitWorkout = type === 'circuit';

  // Get previous run of the same type
  let previousRun = null;
  let timeDifference = null;
  
  try {
    const history = profile.history || [];
    const previousRuns = history
      .filter(sim => sim.type === type)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    // Get the second most recent (first is the current one we just completed)
    previousRun = previousRuns.length > 1 ? previousRuns[1] : null;
    timeDifference = previousRun ? totalTime - previousRun.totalTime : null;
    console.log('Previous run data:', { previousRun, timeDifference });
  } catch (err) {
    console.error('Error calculating previous run:', err);
  }

  const handleShare = async () => {
    await hapticImpact(HapticsImpactStyle.Light);
    
    const workoutName = workout?.title || `${type} Hyrox`;
    const text = `I completed ${workoutName} in ${formatTime(totalTime)}! 🏆\n\nRoxSims - Hyrox Training`;
    
    console.log('📤 Share clicked, text:', text);
    console.log('📤 Navigator.share available?', !!navigator.share);
    console.log('📤 Capacitor platform:', Capacitor.getPlatform());
    
    // Try native share first (works on mobile and some desktop browsers)
    if (Capacitor.isNativePlatform()) {
      try {
        console.log('📤 Using Capacitor Share...');
        await Share.share({
          title: `RoxSIM ${workoutName}`,
          text: text,
          dialogTitle: 'Share your results!',
        });
        console.log('📤 ✅ Capacitor share success');
        return;
      } catch (err: any) {
        console.error('📤 ❌ Capacitor share failed:', err);
        if (err?.message?.includes('cancel')) {
          console.log('📤 User cancelled share');
          return;
        }
      }
    }
    
    // Web fallback: try Web Share API
    if (navigator.share) {
      try {
        console.log('📤 Using Web Share API...');
        await navigator.share({ text });
        console.log('📤 ✅ Web share success');
      } catch (err: any) {
        console.log('📤 Web share cancelled or failed:', err?.message);
        if (!err?.message?.includes('cancel')) {
          // If not cancelled, fall back to clipboard
          await copyToClipboard(text);
        }
      }
    } else {
      // Final fallback: copy to clipboard
      console.log('📤 No share API, using clipboard fallback');
      await copyToClipboard(text);
    }
  };
  
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      console.log('📤 ✅ Copied to clipboard');
      alert('Results copied to clipboard! 📋');
    } catch (err) {
      console.error('📤 ❌ Clipboard failed:', err);
      alert('Unable to copy results. Please try again.');
    }
  };

  const handleGoHome = async () => {
    await hapticImpact(HapticsImpactStyle.Light);
    navigate('/');
  };

  // Trigger confetti on mount
  useEffect(() => {
    try {
      triggerConfetti();
      console.log('Confetti triggered');
    } catch (err) {
      console.error('Confetti error:', err);
    }
  }, []);

  // Selfie capture using Capacitor Camera
  const handleTakeSelfie = async () => {
    console.log('🔥🔥🔥 ==================== CAMERA START ====================');
    console.log('🔥 handleTakeSelfie called');
    console.log('🔥 Platform:', Capacitor.getPlatform());
    console.log('🔥 Is native?', Capacitor.isNativePlatform());
    await hapticImpact(HapticsImpactStyle.Light);

    try {
      console.log('🔥 Setting processing photo to TRUE');
      setIsProcessingPhoto(true);
      
      // On web, use file input as fallback
      if (!Capacitor.isNativePlatform()) {
        console.log('🔥 WEB PLATFORM - Using file input fallback');
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.capture = 'user'; // Request front camera on mobile web
        
        input.onchange = async (e: any) => {
          const file = e.target?.files?.[0];
          if (!file) {
            console.log('🔥 No file selected');
            setIsProcessingPhoto(false);
            return;
          }
          
          console.log('🔥 File selected:', file.name, file.type, file.size);
          
          const reader = new FileReader();
          reader.onload = async (event) => {
            const dataUrl = event.target?.result as string;
            console.log('🔥 File read, data URL length:', dataUrl?.length);
            
            if (dataUrl) {
              console.log('🔥 Calling composeVictoryImage...');
              const composed = await composeVictoryImage(dataUrl);
              console.log('🔥 Image composed!');
              setCapturedImage(composed);
              console.log('🔥 ✅ WEB CAMERA SUCCESS');
            }
            setIsProcessingPhoto(false);
          };
          
          reader.onerror = (error) => {
            console.error('🔥 ❌ File read error:', error);
            setIsProcessingPhoto(false);
            alert('Unable to read image file');
          };
          
          reader.readAsDataURL(file);
        };
        
        input.click();
        console.log('🔥 File input clicked, waiting for user selection...');
        return;
      }
      
      // Native platform - use Capacitor Camera
      console.log('🔥 NATIVE PLATFORM - Using Capacitor Camera');
      
      // Request camera permissions first
      console.log('🔥 Checking camera permissions...');
      const permissions = await CapacitorCamera.checkPermissions();
      console.log('🔥 Permissions result:', JSON.stringify(permissions));
      
      if (permissions.camera !== 'granted') {
        console.log('🔥 Camera permission NOT granted, requesting...');
        const requested = await CapacitorCamera.requestPermissions({ permissions: ['camera'] });
        console.log('🔥 Permission request result:', JSON.stringify(requested));
        
        if (requested.camera !== 'granted') {
          console.error('🔥 ❌ Camera permission DENIED');
          alert('Camera permission is required to take a selfie. Please enable it in your device settings.');
          setIsProcessingPhoto(false);
          return;
        }
      } else {
        console.log('🔥 Camera permission already GRANTED');
      }
      
      console.log('🔥 About to call getPhoto with config:', {
        resultType: 'DataUrl',
        source: 'Camera (DIRECT)',
        quality: 90,
        allowEditing: false,
        correctOrientation: true,
      });
      
      const photo = await CapacitorCamera.getPhoto({
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,  // OPEN CAMERA DIRECTLY, NO PROMPT!
        quality: 90,
        allowEditing: false,
        correctOrientation: true,
      });

      console.log('🔥 Photo captured! Photo object:', {
        hasDataUrl: !!photo?.dataUrl,
        dataUrlLength: photo?.dataUrl?.length || 0,
        format: photo?.format,
        saved: photo?.saved,
      });

      if (!photo?.dataUrl) {
        console.error('🔥 ❌ NO DATA URL IN PHOTO!');
        setIsProcessingPhoto(false);
        return;
      }

      console.log('🔥 Data URL first 100 chars:', photo.dataUrl.substring(0, 100));
      console.log('🔥 Calling composeVictoryImage...');
      
      const composed = await composeVictoryImage(photo.dataUrl);
      
      console.log('🔥 Image composed! Result length:', composed.length);
      console.log('🔥 Composed image first 100 chars:', composed.substring(0, 100));
      console.log('🔥 Setting captured image...');
      
      setCapturedImage(composed);
      
      console.log('🔥 ✅ NATIVE CAMERA SUCCESS - Image should now be visible!');
    } catch (err: any) {
      console.error('🔥 ❌❌❌ CAMERA ERROR:', err);
      console.error('🔥 Error name:', err?.name);
      console.error('🔥 Error message:', err?.message);
      console.error('🔥 Error stack:', err?.stack);
      
      if (err?.message?.includes('cancel') || err?.message?.includes('Cancel')) {
        console.log('🔥 User cancelled camera');
      } else {
        console.error('🔥 Real error occurred!');
        alert('Unable to open camera. Please check permissions and try again.');
      }
    } finally {
      console.log('🔥 Setting processing photo to FALSE');
      setIsProcessingPhoto(false);
      console.log('🔥🔥🔥 ==================== CAMERA END ====================');
    }
  };

  const composeVictoryImage = (photoDataUrl: string) => {
    return new Promise<string>((resolve, reject) => {
      console.log('📸📸📸 ==================== IMAGE COMPOSITION START ====================');
      console.log('📸 Photo data URL length:', photoDataUrl.length);
      console.log('📸 Photo data URL starts with:', photoDataUrl.substring(0, 50));
      console.log('📸 Is valid data URL?', photoDataUrl.startsWith('data:image'));
      
      const canvas = canvasRef.current;
      console.log('📸 Canvas ref:', !!canvas);
      
      if (!canvas) {
        console.error('📸 ❌ Canvas not ready - canvasRef.current is NULL!');
        reject(new Error('Canvas not ready'));
        return;
      }

      console.log('📸 Canvas element found, creating Image object...');
      const image = new Image();
      image.crossOrigin = 'anonymous';
      console.log('📸 Image object created');
      
      image.onload = () => {
        console.log('📸 ✅✅✅ IMAGE ONLOAD FIRED!');
        console.log('📸 Image natural dimensions:', { 
          width: image.naturalWidth, 
          height: image.naturalHeight,
          width2: image.width,
          height2: image.height
        });
        
        const width = 1080;
        const height = 1350;
        console.log('📸 Setting canvas size to:', { width, height });
        canvas.width = width;
        canvas.height = height;
        console.log('📸 Canvas size set. Actual size:', { w: canvas.width, h: canvas.height });

        const ctx = canvas.getContext('2d');
        console.log('📸 Got canvas context:', !!ctx);
        
        if (!ctx) {
          console.error('📸 ❌ Canvas context missing!');
          reject(new Error('Canvas context missing'));
          return;
        }

        console.log('📸 🎨 Canvas context ready!');
        console.log('📸 Filling with WHITE background for testing...');
        
        // Fill with white first to test if canvas is working
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, width, height);
        console.log('📸 ✅ White background drawn to canvas');

        const targetAspect = width / height;
        const photoAspect = image.width / image.height;
        console.log('📸 Aspect ratios:', { targetAspect, photoAspect });
        
        let sourceX = 0;
        let sourceY = 0;
        let sourceWidth = image.width;
        let sourceHeight = image.height;

        if (photoAspect > targetAspect) {
          sourceWidth = image.height * targetAspect;
          sourceX = (image.width - sourceWidth) / 2;
          console.log('📸 Photo is WIDER, cropping sides');
        } else {
          sourceHeight = image.width / targetAspect;
          sourceY = (image.height - sourceHeight) / 2;
          console.log('📸 Photo is TALLER, cropping top/bottom');
        }

        console.log('📸 📐 Drawing photo with params:', {
          srcX: sourceX,
          srcY: sourceY,
          srcW: sourceWidth,
          srcH: sourceHeight,
          destX: 0,
          destY: 0,
          destW: width,
          destH: height
        });
        
        ctx.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, width, height);
        console.log('📸 ✅✅✅ Photo drawn to canvas!');
        
        console.log('📸 Calling drawStatsOverlay...');
        drawStatsOverlay(ctx, width, height);
        console.log('📸 ✅ Overlay drawn!');
        
        console.log('📸 Converting canvas to data URL...');
        const finalDataUrl = canvas.toDataURL('image/jpeg', 0.9);
        console.log('📸 ✅ Final image created!');
        console.log('📸 Final data URL length:', finalDataUrl.length);
        console.log('📸 Final data URL starts with:', finalDataUrl.substring(0, 50));
        
        console.log('📸📸📸 ==================== IMAGE COMPOSITION SUCCESS ====================');
        resolve(finalDataUrl);
      };

      image.onerror = (err) => {
        console.error('📸 ❌❌❌ IMAGE LOAD ERROR!');
        console.error('📸 Error event:', err);
        console.error('📸 Image src length:', image.src?.length);
        console.error('📸 Image src starts with:', image.src?.substring(0, 50));
        reject(err);
      };
      
      console.log('📸 Setting image.src to trigger load...');
      image.src = photoDataUrl;
      console.log('📸 image.src set, waiting for onload event...');
    });
  };

  const drawStatsOverlay = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    console.log('🎨🎨🎨 ==================== DRAWING OVERLAY START ====================');
    console.log('🎨 Canvas dimensions:', { width, height });
    console.log('🎨 Total stations to draw:', stations.length);
    console.log('🎨 Total time:', formatTime(totalTime));
    console.log('🎨 Station times:', stationTimes);
    
    // Clear any existing transforms
    console.log('🎨 Resetting canvas transform...');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    console.log('🎨 ✅ Transform reset');

    // Top bar background - compact header (solid black)
    console.log('🎨 Drawing top bar...');
    ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
    ctx.fillRect(0, 0, width, 110);
    console.log('🎨 ✅ Top bar drawn (black rectangle 0,0 to', width, ',110)');

    // Bottom gradient background for better text readability
    console.log('🎨 Creating bottom gradient...');
    const gradient = ctx.createLinearGradient(0, height - 700, 0, height);
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0.1)');  // Start transparent
    gradient.addColorStop(0.3, 'rgba(0, 0, 0, 0.5)'); // Build up
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.85)');   // Solid at bottom
    ctx.fillStyle = gradient;
    ctx.fillRect(0, height - 700, width, 700);
    console.log('🎨 ✅ Bottom gradient drawn (from y:', height - 700, 'to', height, ')');

    // Top Left: Athlete photo or initial
    console.log('🎨 Drawing athlete photo/initial...');
    const photoSize = 80;
    const photoX = 40;
    const photoY = 20;
    
    if (profile.athletePhoto) {
      // Draw the athlete's uploaded photo
      const athleteImg = new Image();
      athleteImg.src = profile.athletePhoto;
      ctx.save();
      ctx.beginPath();
      ctx.arc(photoX + photoSize / 2, photoY + photoSize / 2, photoSize / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      try {
        ctx.drawImage(athleteImg, photoX, photoY, photoSize, photoSize);
        console.log('🎨 ✅ Athlete photo drawn');
      } catch (err) {
        console.log('🎨 ⚠️ Failed to draw athlete photo, using initia');
      }
      ctx.restore();
    } else {
      // Draw circle with initial
      ctx.fillStyle = '#FFCC00';
      ctx.beginPath();
      ctx.arc(photoX + photoSize / 2, photoY + photoSize / 2, photoSize / 2, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.fillStyle = 'black';
      ctx.font = 'bold 36px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText((profile.name || 'A').charAt(0).toUpperCase(), photoX + photoSize / 2, photoY + photoSize / 2);
      console.log('🎨 ✅ Athlete initial drawn');
    }
    
    // RoxSIM logo next to photo
    console.log('🎨 Drawing RoxSIM logo...');
    ctx.fillStyle = '#FFCC00';
    ctx.font = 'bold 50px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('🔥 Rox', photoX + photoSize + 20, 70);
    console.log('🎨 ✅ "🔥 Rox" drawn');
    
    ctx.fillStyle = 'white';
    ctx.fillText('SIM', photoX + photoSize + 20 + 160, 70);
    console.log('🎨 ✅ "SIM" drawn');

    // Top Right: Time with "Workout Completed" label above
    console.log('🎨 Drawing workout completed section...');
    
    // Draw the time large on the right
    ctx.fillStyle = '#FFCC00';
    ctx.font = 'bold 60px monospace';
    ctx.textAlign = 'right';
    const totalTimeText = formatTime(totalTime);
    const timeWidth = ctx.measureText(totalTimeText).width;
    ctx.fillText(totalTimeText, width - 45, 70);
    console.log('🎨 ✅ Time drawn:', totalTimeText);
    
    // Draw "Workout Completed" label to the LEFT of the time at same vertical level
    ctx.fillStyle = 'white';
    ctx.font = 'bold 32px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('🏆 Workout Completed', width - 50 - timeWidth - 25, 70);
    console.log('🎨 ✅ "Workout Completed" drawn with trophy');

    // Bottom section: All stations in SINGLE COLUMN
    const startY = height - 630;
    const rowHeight = 39;
    const fontSize = 28;
    
    console.log('🎨 📊 Starting to draw', stations.length, 'stations');
    console.log('🎨 Station drawing config:', { startY, rowHeight, fontSize });
    
    // Draw each station in a SINGLE COLUMN
    for (let i = 0; i < stations.length; i++) {
      const station = stations[i];
      const y = startY + (i * rowHeight);
      console.log(`🎨 Drawing station ${i + 1}/${stations.length}:`, station.name, 'at y:', y);
      
      // Station number
      ctx.fillStyle = station.type === 'run' ? '#FFCC00' : '#FF9500';
      ctx.textAlign = 'left';
      ctx.font = `bold ${fontSize}px monospace`;
      ctx.fillText(`${i + 1}.`, 60, y);
      console.log(`🎨   ✅ Number "${i + 1}." drawn`);
      
      // Station name - CONSISTENT FORMAT: "Station Name + Volume"
      ctx.fillStyle = 'white';
      ctx.font = `bold ${fontSize - 2}px sans-serif`;
      
      let name = station.name;
      
      // Add volume to the station name
      if (station.reps) {
        // For rep-based exercises: "Wall Balls 100"
        name = `${station.name} ${station.reps}`;
      } else if (station.distance && station.type === 'station') {
        // For distance-based stations: "SkiErg 1000m", "Sled Push 50m"
        name = `${station.name} ${station.distance}m`;
      }
      // For runs, keep as-is since distance is already in the name (e.g., "Run 1km")
      
      ctx.fillText(name, 120, y);
      console.log(`🎨   ✅ Name "${name}" drawn (reps: ${station.reps || 'none'}, distance: ${station.distance || 'none'})`);
      
      // Time (right-aligned)
      ctx.textAlign = 'right';
      ctx.fillStyle = station.type === 'run' ? '#FFCC00' : '#FF9500';
      ctx.font = `bold ${fontSize + 2}px monospace`;
      const timeText = formatTime(stationTimes[i] || 0);
      ctx.fillText(timeText, width - 60, y);
      console.log(`🎨   ✅ Time "${timeText}" drawn`);
    }
    
    console.log('🎨🎨🎨 ==================== DRAWING OVERLAY COMPLETE ====================');
  };

  const saveImageToCache = async (dataUrl: string) => {
    const fileName = `roxsim-${Date.now()}.jpg`;
    await Filesystem.writeFile({
      path: fileName,
      data: dataUrl.split(',')[1],
      directory: Directory.Cache,
    });
    return fileName;
  };

  const sharePhoto = async () => {
    await hapticImpact(HapticsImpactStyle.Heavy);
    if (!capturedImage) return;

    try {
      const fileName = await saveImageToCache(capturedImage);
      const { uri } = await Filesystem.getUri({
        path: fileName,
        directory: Directory.Cache,
      });

      await Share.share({
        title: `RoxSIM ${type === 'full' ? 'Full' : 'Half'} Hyrox`,
        text: `I completed a ${type === 'full' ? 'Full' : 'Half'} Hyrox in ${formatTime(totalTime)}! 🏆`,
        url: uri,
        dialogTitle: 'Share your victory!',
      });

      await Filesystem.deleteFile({ path: fileName, directory: Directory.Cache });
    } catch (error: any) {
      console.error('Share error:', error);
      if (!error?.message?.includes('cancel')) {
        alert('Unable to share. Please try again.');
      }
    }
  };

  const handleRetake = async () => {
    setCapturedImage(null);
    await handleTakeSelfie();
  };

  return (
    <div className="min-h-screen bg-black text-white pb-36 pt-5">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-gradient-to-b from-yellow-500 to-orange-500 px-6 pt-12 pb-8 text-center">
        <Trophy className="w-16 h-16 mx-auto mb-4 text-black" />
        <h1 className="text-3xl font-bold text-black mb-2">Simulation Complete!</h1>
        <p className="text-black/70 capitalize">{workout?.title || `${type} Hyrox`}</p>
      </div>

      {/* Total Time */}
      <div className="px-6 mt-4 mb-6">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 text-center border border-white/20">
          <p className="text-white/60 text-sm mb-2">Total Time</p>
          <p className="text-5xl font-bold font-mono text-yellow-500">{formatTime(totalTime)}</p>
          
          {/* Previous Time Comparison */}
          {previousRun && (
            <div className="mt-4 pt-4 border-t border-white/20">
              <p className="text-white/60 text-xs mb-1">Previous Time</p>
              <p className="text-2xl font-bold font-mono text-white">{formatTime(previousRun.totalTime)}</p>
              {timeDifference !== null && (
                <p className={`text-sm mt-2 font-semibold ${
                  timeDifference < 0 ? 'text-green-400' : 'text-red-400'
                }`}>
                  {timeDifference < 0 ? '↓' : '↑'} {formatTime(Math.abs(timeDifference))} {timeDifference < 0 ? 'faster!' : 'slower'}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Circuit workout summary */}
      {isCircuitWorkout && (
        <div className="px-6 mb-6">
          <div className="bg-gradient-to-br from-red-600/20 to-red-800/20 rounded-xl p-6 border border-red-500/30 text-center">
            <Trophy className="w-12 h-12 mx-auto mb-3 text-red-500" />
            <h2 className="text-xl font-bold mb-2">Circuit Complete! 🔥</h2>
            <p className="text-white/70 text-sm">
              You completed {stations.length} exercises in total
            </p>
            <p className="text-white/70 text-sm mt-1">
              50/10 format • Continuous training
            </p>
          </div>
        </div>
      )}

      {/* Split Times - Only for Hyrox workouts */}
      {!isCircuitWorkout && stationTimes.length > 0 && (
        <div className="px-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Split Times</h2>
          <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
            {stations.map((station, index) => {
              // Find fastest station
              const fastestTime = Math.min(...stationTimes);
              const isFastest = stationTimes[index] === fastestTime;
              
              return (
                <div
                  key={station.id}
                  className="flex items-center justify-between px-4 py-3 border-b border-white/10 last:border-b-0"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-black ${
                        station.type === 'run' ? 'bg-yellow-500' : 'bg-orange-500'
                      }`}
                    >
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium">{station.name}</p>
                      {station.equipment && (
                        <p className="text-xs text-white/50">{station.equipment}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isFastest && (
                      <Medal className="w-5 h-5 text-yellow-500" />
                    )}
                    {station.type === 'run' && (
                      <Activity className="w-4 h-4 text-yellow-500" />
                    )}
                    <p className="font-mono font-semibold">{formatTime(stationTimes[index] || 0)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Stats Summary - Only for Hyrox workouts */}
      {!isCircuitWorkout && stationTimes.length > 0 && (
        <div className="px-6 mb-6">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white/5 rounded-xl p-4 text-center border border-white/10">
              <p className="text-white/60 text-xs mb-1">Avg Split</p>
              <p className="text-lg font-bold">
                {formatTime(Math.floor(totalTime / stationTimes.length))}
              </p>
            </div>
            <div className="bg-white/5 rounded-xl p-4 text-center border border-white/10">
              <p className="text-white/60 text-xs mb-1">Fastest</p>
              <p className="text-lg font-bold">
                {formatTime(Math.min(...stationTimes))}
              </p>
            </div>
            <div className="bg-white/5 rounded-xl p-4 text-center border border-white/10">
              <p className="text-white/60 text-xs mb-1">Slowest</p>
              <p className="text-lg font-bold">
                {formatTime(Math.max(...stationTimes))}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="px-6 space-y-3 pb-32">
        <button
          onClick={handleTakeSelfie}
          className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 text-black rounded-xl py-4 font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity active:scale-95"
        >
          <Camera className="w-5 h-5" />
          Take Victory Selfie
        </button>
        <button
          onClick={handleShare}
          className="w-full bg-white/10 rounded-xl py-4 font-bold flex items-center justify-center gap-2 hover:bg-white/20 transition-colors active:scale-95"
        >
          <Share2 className="w-5 h-5" />
          Share Results
        </button>
      </div>

      {isProcessingPhoto && (
        <div className="fixed inset-0 bg-black/80 z-50 flex flex-col items-center justify-center gap-4">
          <Camera className="w-10 h-10 text-yellow-500 animate-pulse" />
          <p className="text-white text-lg font-semibold">Preparing your victory selfie...</p>
        </div>
      )}

      {/* Captured Image Preview */}
      {capturedImage && (
        <div className="fixed inset-0 bg-black z-50 flex flex-col">
          <div className="flex-1 relative">
            <img src={capturedImage} alt="Captured selfie" className="w-full h-full object-contain" />
            
            <button
              onClick={() => setCapturedImage(null)}
              className="absolute top-4 right-4 p-3 bg-black/50 rounded-full hover:bg-black/70 transition-colors"
            >
              <X className="w-6 h-6 text-white" />
            </button>
          </div>

          <div className="p-6 pb-16 bg-black space-y-3">
            <button
              onClick={sharePhoto}
              className="w-full bg-yellow-500 text-black rounded-xl py-4 font-bold flex items-center justify-center gap-2 hover:bg-yellow-400 transition-colors active:scale-95"
            >
              <Share2 className="w-5 h-5" />
              Share Victory Selfie
            </button>
            <button
              onClick={handleRetake}
              className="w-full bg-white/10 rounded-xl py-4 font-bold flex items-center justify-center gap-2 hover:bg-white/20 transition-colors active:scale-95"
            >
              <Camera className="w-5 h-5" />
              Retake
            </button>
          </div>
        </div>
      )}

      {/* Hidden canvas for composing photos */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}


