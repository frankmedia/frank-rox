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
    return localStorage.getItem("currentTrainingDay") || "1";
  });
  
  const [maxDay, setMaxDay] = useState<number>(99); // Default to 99, will be updated from sheet
  const [loading, setLoading] = useState(true);

  // Fetch the max training day from the user's sheet to determine cycle length
  useEffect(() => {
    const loadMaxDay = async () => {
      const max = await getMaxTrainingDay();
      setMaxDay(max);
      setLoading(false);
      console.log(`🔄 Training cycle: ${max} days (Day ${currentDay} / ${max})`);
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
    localStorage.setItem("currentTrainingDay", newDay);
    onDayChange?.(newDay);
    
    // Reload the page to fetch new exercises
    window.location.reload();
  };

  const goToNextDay = () => {
    const currentNum = parseInt(currentDay);
    // Rotate back to Day 1 when reaching the end of the cycle
    const nextDay = currentNum >= maxDay ? "1" : (currentNum + 1).toString();
    console.log(`➡️ Moving from Day ${currentNum} to Day ${nextDay} (cycle: ${maxDay} days)`);
    handleDayChange(nextDay);
  };

  const goToPreviousDay = () => {
    const currentNum = parseInt(currentDay);
    // Wrap around to max day when going back from Day 1
    const prevDay = currentNum <= 1 ? maxDay.toString() : (currentNum - 1).toString();
    console.log(`⬅️ Moving from Day ${currentNum} to Day ${prevDay} (cycle: ${maxDay} days)`);
    handleDayChange(prevDay);
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        onClick={goToPreviousDay}
        disabled={loading}
        title="Previous day (wraps around to last day)"
        className="h-12 w-12 text-2xl"
      >
        ←
      </Button>

      <Select value={currentDay} onValueChange={handleDayChange} disabled={loading}>
        <SelectTrigger className="w-[180px] h-12 text-base">
          <RotateCw className="w-5 h-5 mr-2" />
          <SelectValue placeholder="Training Day" />
        </SelectTrigger>
        <SelectContent className="max-h-[300px]">
          {trainingDays.map((day) => (
            <SelectItem key={day} value={day}>
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
        className="h-12 w-12 text-2xl"
      >
        →
      </Button>
      
      {!loading && (
        <span className="text-sm text-muted-foreground">
          {currentDay} / {maxDay}
        </span>
      )}
    </div>
  );
}

