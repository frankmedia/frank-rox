import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar, RotateCw } from "lucide-react";
import { getMaxTrainingDay } from "@/services/googleSheets";

interface TrainingDaySelectorProps {
  onDayChange?: (day: string) => void;
}

export function TrainingDaySelector({ onDayChange }: TrainingDaySelectorProps) {
  const [currentDay, setCurrentDay] = useState<string>(() => {
    try {
      const userStr = localStorage.getItem("frank_rock_user");
      if (userStr) {
        const user = JSON.parse(userStr);
        const userKey = `currentTrainingDay_${user.username}`;
        return localStorage.getItem(userKey) || "1";
      }
    } catch (e) {
    }
    return "1";
  });
  
  const [maxDay, setMaxDay] = useState<number>(99); // Default to 99, will be updated from sheet
  const [loading, setLoading] = useState(true);

  // Fetch the max training day from the user's sheet to determine cycle length
  useEffect(() => {
    const loadMaxDay = async () => {
      const max = await getMaxTrainingDay();
      setMaxDay(max);
      setLoading(false);
    };
    loadMaxDay();
  }, []);

  // Generate training days based on max day from sheet
  const trainingDays = Array.from({ length: maxDay }, (_, i) => {
    const num = i + 1;
    return num.toString();
  });

  const handleDayChange = (newDay: string) => {
    setCurrentDay(newDay);
    
    // Save to user-specific storage
    try {
      const userStr = localStorage.getItem("frank_rock_user");
      if (userStr) {
        const user = JSON.parse(userStr);
        const userKey = `currentTrainingDay_${user.username}`;
        localStorage.setItem(userKey, newDay);
      }
    } catch (e) {
    }
    
    onDayChange?.(newDay);
    
    // Reload the page to fetch new exercises
    window.location.reload();
  };

  const goToNextDay = () => {
    const currentNum = parseInt(currentDay);
    // Rotate back to Day 1 when reaching the end of the cycle
    const nextDay = currentNum >= maxDay ? "1" : (currentNum + 1).toString();
    handleDayChange(nextDay);
  };

  const goToPreviousDay = () => {
    const currentNum = parseInt(currentDay);
    // Wrap around to max day when going back from Day 1
    const prevDay = currentNum <= 1 ? maxDay.toString() : (currentNum - 1).toString();
    handleDayChange(prevDay);
  };

  return (
    <div className="flex items-center gap-1 sm:gap-2">
      <Button
        variant="outline"
        onClick={goToPreviousDay}
        disabled={loading}
        title="Previous day (wraps around to last day)"
        className="h-10 w-10 sm:h-12 sm:w-12 md:h-14 md:w-14 text-2xl sm:text-3xl md:text-4xl flex items-center justify-center flex-shrink-0"
      >
        ←
      </Button>

      <Select value={currentDay} onValueChange={handleDayChange} disabled={loading}>
        <SelectTrigger className="w-[120px] sm:w-[140px] md:w-[180px] h-10 sm:h-12 md:h-14 text-sm sm:text-base md:text-xl font-bold">
          <RotateCw className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 mr-1 sm:mr-2" />
          <SelectValue placeholder="Day" />
        </SelectTrigger>
        <SelectContent className="max-h-[300px]">
          {trainingDays.map((day) => (
            <SelectItem key={day} value={day} className="text-base sm:text-lg md:text-xl font-bold py-2 sm:py-3">
              Day {day} / {maxDay}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button 
        variant="outline" 
        onClick={goToNextDay}
        disabled={loading}
        title={`Next day (Day ${parseInt(currentDay) >= maxDay ? '1' : parseInt(currentDay) + 1})`}
        className="h-10 w-10 sm:h-12 sm:w-12 md:h-14 md:w-14 text-2xl sm:text-3xl md:text-4xl flex items-center justify-center flex-shrink-0"
      >
        →
      </Button>
    </div>
  );
}

