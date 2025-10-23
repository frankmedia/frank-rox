import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Check } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { AssessmentData } from "@/types/assessment";
import { calculateHyroxResults } from "@/utils/hyroxModel";

const Assessment = () => {
  const navigate = useNavigate();
  const [currentSection, setCurrentSection] = useState(0);
  const [formData, setFormData] = useState<AssessmentData>({
    gender: "",
    category: "",
    hasCompeted: "",
    mainGoal: "",
    age: "",
    km1Time: "",
    distance30Min: "",
    runFrequency: "",
    enduranceLevel: "",
    sledPushMax: "",
    sledPullMax: "",
    wallBallsMax: "",
    deadlift5RM: "",
    weightedLunges: "",
    farmerCarry: "",
    row500: "",
    skiErg500: "",
    bikePower: "",
    engineLevel: "",
    hasInjuries: "",
    injuryDetails: "",
    injuryType: "",
    injurySeverity: "",
    mobilityFrequency: "",
    sleepHours: "",
    sleepQuality: "",
    dietType: [],
    waterIntake: "",
    supplements: [],
    proteinIntake: "",
    fruitVegServings: "",
    fiberIntake: "",
    nutritionUncertain: "",
    trainingFrequency: "",
    biggestWeakness: [],
    stressLevel: "",
    workSchedule: "",
    recoveryPractices: [],
    hyroxRacesCompleted: "",
    functionalFitnessYears: "",
    competitionLevel: "",
  });

  // Load existing data from localStorage
  useEffect(() => {
    const userStr = localStorage.getItem("frank_rock_user");
    if (userStr) {
      const user = JSON.parse(userStr);
      const storageKey = `assessment_${user.username}`;
      const existing = localStorage.getItem(storageKey);
      if (existing) {
        setFormData(JSON.parse(existing));
      }
    }
  }, []);

  // Auto-save whenever formData changes (debounced)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      saveProgress();
    }, 500); // Save 500ms after user stops typing

    return () => clearTimeout(timeoutId);
  }, [formData]);

  const saveProgress = () => {
    const userStr = localStorage.getItem("frank_rock_user");
    if (userStr) {
      const user = JSON.parse(userStr);
      const storageKey = `assessment_${user.username}`;
      localStorage.setItem(storageKey, JSON.stringify(formData));
    }
  };

  const handleNext = () => {
    saveProgress();
    if (currentSection < sections.length - 1) {
      setCurrentSection(currentSection + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handlePrev = () => {
    saveProgress();
    if (currentSection > 0) {
      setCurrentSection(currentSection - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleSubmit = () => {
    saveProgress();
    
    // Calculate results
    const results = calculateHyroxResults(formData);
    
    // Save results to localStorage
    const userStr = localStorage.getItem("frank_rock_user");
    if (userStr) {
      const user = JSON.parse(userStr);
      const resultsKey = `assessment_results_${user.username}`;
      localStorage.setItem(resultsKey, JSON.stringify(results));
    }
    
    toast.success("Assessment complete!", {
      description: "Calculating your athlete profile...",
    });
    
    navigate("/assessment-results");
  };

  const updateField = (field: keyof AssessmentData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const toggleArrayField = (field: keyof AssessmentData, value: string) => {
    setFormData((prev) => {
      const currentArray = (prev[field] as string[]) || [];
      const newArray = currentArray.includes(value)
        ? currentArray.filter((item) => item !== value)
        : [...currentArray, value];
      return { ...prev, [field]: newArray };
    });
  };

  const sections = [
    {
      title: "Athlete Info",
      icon: "🏁",
      questions: (
        <div className="space-y-6">
          {/* Q1 */}
          <div>
            <Label className="text-base font-bold mb-4 block">Gender & Category</Label>
            <div className="grid grid-cols-2 gap-3 mb-3">
              {["Female", "Male", "Mixed"].map((option) => (
                <Button
                  key={option}
                  variant={formData.gender === option ? "default" : "outline"}
                  onClick={() => updateField("gender", option)}
                  className={`h-14 text-base font-semibold ${formData.gender === option ? "bg-yellow-500 text-black hover:bg-yellow-600" : ""}`}
                >
                  {formData.gender === option && <Check className="w-4 h-4 mr-2" />}
                  {option}
                </Button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              {["Open", "Pro", "Relay"].map((option) => (
                <Button
                  key={option}
                  variant={formData.category === option ? "default" : "outline"}
                  onClick={() => updateField("category", option)}
                  className={`h-14 text-base font-semibold ${formData.category === option ? "bg-yellow-500 text-black hover:bg-yellow-600" : ""}`}
                >
                  {formData.category === option && <Check className="w-4 h-4 mr-2" />}
                  {option}
                </Button>
              ))}
            </div>
          </div>

          {/* Q2 */}
          <div>
            <Label className="text-base font-bold mb-4 block">Have you competed in HYROX before?</Label>
            <div className="grid grid-cols-2 gap-3">
              {["Yes", "No"].map((option) => (
                <Button
                  key={option}
                  variant={formData.hasCompeted === option ? "default" : "outline"}
                  onClick={() => updateField("hasCompeted", option)}
                  className={`h-14 text-base font-semibold ${formData.hasCompeted === option ? "bg-yellow-500 text-black hover:bg-yellow-600" : ""}`}
                >
                  {formData.hasCompeted === option && <Check className="w-4 h-4 mr-2" />}
                  {option}
                </Button>
              ))}
            </div>
          </div>

          {/* Q3 */}
          <div>
            <Label className="text-base font-bold mb-4 block">What's your main goal?</Label>
            <div className="grid grid-cols-2 gap-3">
              {["Finish", "PB", "Podium", "Improve Weak Stations"].map((option) => (
                <Button
                  key={option}
                  variant={formData.mainGoal === option ? "default" : "outline"}
                  onClick={() => updateField("mainGoal", option)}
                  className={`h-14 text-base font-semibold ${formData.mainGoal === option ? "bg-yellow-500 text-black hover:bg-yellow-600" : ""}`}
                >
                  {formData.mainGoal === option && <Check className="w-4 h-4 mr-2" />}
                  {option}
                </Button>
              ))}
            </div>
          </div>

          {/* Q4 - Age */}
          <div>
            <Label className="text-base font-bold mb-4 block">Age</Label>
            <Input
              type="number"
              inputMode="numeric"
              min="16"
              max="80"
              placeholder="Enter your age"
              value={formData.age}
              onChange={(e) => updateField("age", e.target.value)}
              className="text-base h-14"
            />
          </div>
        </div>
      ),
    },
    {
      title: "Running Fitness",
      icon: "🏃",
      questions: (
        <div className="space-y-6">
          {/* Q4 */}
          <div>
            <Label className="text-base font-bold mb-4 block">1 km all-out time</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                inputMode="numeric"
                min="0"
                max="59"
                placeholder="0"
                value={formData.km1Time.split(":")[0] || ""}
                onChange={(e) => {
                  const mins = e.target.value;
                  const secs = formData.km1Time.split(":")[1] || "";
                  updateField("km1Time", mins && secs ? `${mins}:${secs}` : mins ? `${mins}:` : secs ? `:${secs}` : "");
                }}
                className="text-base h-14 text-center flex-1 font-bold"
              />
              <span className="text-3xl font-bold">:</span>
              <Input
                type="number"
                inputMode="numeric"
                min="0"
                max="59"
                placeholder="00"
                value={formData.km1Time.split(":")[1] || ""}
                onChange={(e) => {
                  const mins = formData.km1Time.split(":")[0] || "";
                  const secs = e.target.value;
                  updateField("km1Time", mins && secs ? `${mins}:${secs}` : mins ? `${mins}:` : secs ? `:${secs}` : "");
                }}
                className="text-base h-14 text-center flex-1 font-bold"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1 text-center">minutes : seconds</p>
          </div>

          {/* Q5 */}
          <div>
            <Label className="text-base font-bold mb-4 block">Distance in 30 minutes (km)</Label>
            <Input
              type="number"
              inputMode="decimal"
              step="0.1"
              min="0"
              placeholder="e.g. 5.8"
              value={formData.distance30Min}
              onChange={(e) => updateField("distance30Min", e.target.value)}
              className="text-base h-14"
            />
          </div>

          {/* Q6 */}
          <div>
            <Label className="text-base font-bold mb-4 block">How often do you run per week?</Label>
            <div className="grid grid-cols-2 gap-3">
              {["0-1", "2-3", "4-5", "6+"].map((option) => (
                <Button
                  key={option}
                  variant={formData.runFrequency === option ? "default" : "outline"}
                  onClick={() => updateField("runFrequency", option)}
                  className={`h-14 text-base font-semibold ${formData.runFrequency === option ? "bg-yellow-500 text-black hover:bg-yellow-600" : ""}`}
                >
                  {formData.runFrequency === option && <Check className="w-4 h-4 mr-2" />}
                  {option} days
                </Button>
              ))}
            </div>
          </div>

          {/* Q7 */}
          <div>
            <Label className="text-base font-bold mb-4 block">Rate your endurance level</Label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((level) => (
                <Button
                  key={level}
                  variant={formData.enduranceLevel === level.toString() ? "default" : "outline"}
                  onClick={() => updateField("enduranceLevel", level.toString())}
                  className={`flex-1 h-14 text-base font-semibold ${
                    formData.enduranceLevel === level.toString() ? "bg-yellow-500 text-black hover:bg-yellow-600" : ""
                  }`}
                >
                  {level}
                </Button>
              ))}
            </div>
            <p className="text-sm text-muted-foreground mt-2 text-center">1 = Beginner • 5 = Elite</p>
          </div>
        </div>
      ),
    },
    {
      title: "Strength & Power",
      icon: "🏋️",
      questions: (
        <div className="space-y-6">
          {/* Q8 */}
          <div>
            <Label className="text-base font-bold mb-4 block">Sled Push - Max load for 10m (kg)</Label>
            <Input
              type="number"
              placeholder="e.g. 125"
              value={formData.sledPushMax}
              onChange={(e) => updateField("sledPushMax", e.target.value)}
              className="text-base h-14"
            />
          </div>

          {/* Q9 */}
          <div>
            <Label className="text-base font-bold mb-4 block">Sled Pull - Max load for 10m (kg)</Label>
            <Input
              type="number"
              placeholder="e.g. 75"
              value={formData.sledPullMax}
              onChange={(e) => updateField("sledPullMax", e.target.value)}
              className="text-base h-14"
            />
          </div>

          {/* Q10 */}
          <div>
            <Label className="text-base font-bold mb-4 block">Wall Balls - Max unbroken reps (6kg)</Label>
            <Input
              type="number"
              placeholder="e.g. 25"
              value={formData.wallBallsMax}
              onChange={(e) => updateField("wallBallsMax", e.target.value)}
              className="text-base h-14"
            />
          </div>

          {/* Q11 */}
          <div>
            <Label className="text-base font-bold mb-4 block">Deadlift - Estimated 5RM (kg)</Label>
            <Input
              type="number"
              placeholder="e.g. 90"
              value={formData.deadlift5RM}
              onChange={(e) => updateField("deadlift5RM", e.target.value)}
              className="text-base h-14"
            />
          </div>

          {/* Q12 */}
          <div>
            <Label className="text-base font-bold mb-4 block">Weighted Lunges - Reps in 1 min (20kg total)</Label>
            <Input
              type="number"
              placeholder="e.g. 25"
              value={formData.weightedLunges}
              onChange={(e) => updateField("weightedLunges", e.target.value)}
              className="text-base h-14"
            />
          </div>

          {/* Q13 */}
          <div>
            <Label className="text-base font-bold mb-4 block">Farmer's Carry - Max distance (2×16kg KBs)</Label>
            <Input
              type="number"
              placeholder="e.g. 60"
              value={formData.farmerCarry}
              onChange={(e) => updateField("farmerCarry", e.target.value)}
              className="text-base h-14"
            />
            <p className="text-sm text-muted-foreground mt-1">Distance in meters</p>
          </div>
        </div>
      ),
    },
    {
      title: "Engine & Cardio",
      icon: "🚴",
      questions: (
        <div className="space-y-6">
          {/* Q14 */}
          <div>
            <Label className="text-base font-bold mb-4 block">500m Row - Best time</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                inputMode="numeric"
                min="0"
                max="59"
                placeholder="0"
                value={formData.row500.split(":")[0] || ""}
                onChange={(e) => {
                  const mins = e.target.value;
                  const secs = formData.row500.split(":")[1] || "";
                  updateField("row500", mins && secs ? `${mins}:${secs}` : mins ? `${mins}:` : secs ? `:${secs}` : "");
                }}
                className="text-base h-14 text-center flex-1 font-bold"
              />
              <span className="text-3xl font-bold">:</span>
              <Input
                type="number"
                inputMode="numeric"
                min="0"
                max="59"
                placeholder="00"
                value={formData.row500.split(":")[1] || ""}
                onChange={(e) => {
                  const mins = formData.row500.split(":")[0] || "";
                  const secs = e.target.value;
                  updateField("row500", mins && secs ? `${mins}:${secs}` : mins ? `${mins}:` : secs ? `:${secs}` : "");
                }}
                className="text-base h-14 text-center flex-1 font-bold"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1 text-center">minutes : seconds</p>
          </div>

          {/* Q15 */}
          <div>
            <Label className="text-base font-bold mb-4 block">500m SkiErg - Best time</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                inputMode="numeric"
                min="0"
                max="59"
                placeholder="0"
                value={formData.skiErg500.split(":")[0] || ""}
                onChange={(e) => {
                  const mins = e.target.value;
                  const secs = formData.skiErg500.split(":")[1] || "";
                  updateField("skiErg500", mins && secs ? `${mins}:${secs}` : mins ? `${mins}:` : secs ? `:${secs}` : "");
                }}
                className="text-base h-14 text-center flex-1 font-bold"
              />
              <span className="text-3xl font-bold">:</span>
              <Input
                type="number"
                inputMode="numeric"
                min="0"
                max="59"
                placeholder="00"
                value={formData.skiErg500.split(":")[1] || ""}
                onChange={(e) => {
                  const mins = formData.skiErg500.split(":")[0] || "";
                  const secs = e.target.value;
                  updateField("skiErg500", mins && secs ? `${mins}:${secs}` : mins ? `${mins}:` : secs ? `:${secs}` : "");
                }}
                className="text-base h-14 text-center flex-1 font-bold"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1 text-center">minutes : seconds</p>
          </div>

          {/* Q16 */}
          <div>
            <Label className="text-base font-bold mb-4 block">Assault Bike - Avg watts for 2 min</Label>
            <Input
              type="number"
              placeholder="e.g. 240"
              value={formData.bikePower}
              onChange={(e) => updateField("bikePower", e.target.value)}
              className="text-base h-14"
            />
          </div>

          {/* Q17 */}
          <div>
            <Label className="text-base font-bold mb-4 block">Rate your overall engine (cardio power)</Label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((level) => (
                <Button
                  key={level}
                  variant={formData.engineLevel === level.toString() ? "default" : "outline"}
                  onClick={() => updateField("engineLevel", level.toString())}
                  className={`flex-1 h-14 text-base font-semibold ${
                    formData.engineLevel === level.toString() ? "bg-yellow-500 text-black hover:bg-yellow-600" : ""
                  }`}
                >
                  {level}
                </Button>
              ))}
            </div>
            <p className="text-sm text-muted-foreground mt-2 text-center">1 = Weak • 5 = Powerful</p>
          </div>
        </div>
      ),
    },
    {
      title: "Mobility & Recovery",
      icon: "🧘",
      questions: (
        <div className="space-y-6">
          {/* Q18 */}
          <div>
            <Label className="text-base font-bold mb-4 block">Any current injuries or mobility issues?</Label>
            <div className="grid grid-cols-2 gap-3 mb-3">
              {["Yes", "No"].map((option) => (
                <Button
                  key={option}
                  variant={formData.hasInjuries === option ? "default" : "outline"}
                  onClick={() => updateField("hasInjuries", option)}
                  className={`h-14 text-base font-semibold ${formData.hasInjuries === option ? "bg-yellow-500 text-black hover:bg-yellow-600" : ""}`}
                >
                  {formData.hasInjuries === option && <Check className="w-4 h-4 mr-2" />}
                  {option}
                </Button>
              ))}
            </div>
            {formData.hasInjuries === "Yes" && (
              <div className="space-y-4">
                <Textarea
                  placeholder="Please describe (e.g., tight hips, knee pain)"
                  value={formData.injuryDetails}
                  onChange={(e) => updateField("injuryDetails", e.target.value)}
                  className="text-base"
                  rows={3}
                />
                
                {/* Injury Type */}
                <div>
                  <Label className="text-base font-bold mb-4 block">🩹 Injury Type</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {["Upper Body", "Lower Body", "Core", "General"].map((option) => (
                      <Button
                        key={option}
                        variant={formData.injuryType === option ? "default" : "outline"}
                        onClick={() => updateField("injuryType", option)}
                        className={`h-14 text-base font-semibold ${formData.injuryType === option ? "bg-yellow-500 text-black hover:bg-yellow-600" : ""}`}
                      >
                        {formData.injuryType === option && <Check className="w-4 h-4 mr-2" />}
                        {option}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Injury Severity */}
                <div>
                  <Label className="text-base font-bold mb-4 block">⚡ Severity (1-5)</Label>
                  <div className="grid grid-cols-5 gap-2">
                    {[1, 2, 3, 4, 5].map((level) => (
                      <Button
                        key={level}
                        variant={formData.injurySeverity === level.toString() ? "default" : "outline"}
                        onClick={() => updateField("injurySeverity", level.toString())}
                        className={`h-14 text-base font-semibold ${formData.injurySeverity === level.toString() ? "bg-yellow-500 text-black hover:bg-yellow-600" : ""}`}
                      >
                        {formData.injurySeverity === level.toString() && <Check className="w-4 h-4 mr-2" />}
                        {level}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Q19 */}
          <div>
            <Label className="text-base font-bold mb-4 block">How often do you do mobility work?</Label>
            <div className="grid grid-cols-2 gap-3">
              {["Never", "1-2× week", "3-4× week", "Daily"].map((option) => (
                <Button
                  key={option}
                  variant={formData.mobilityFrequency === option ? "default" : "outline"}
                  onClick={() => updateField("mobilityFrequency", option)}
                  className={`h-14 text-base font-semibold ${formData.mobilityFrequency === option ? "bg-yellow-500 text-black hover:bg-yellow-600" : ""}`}
                >
                  {formData.mobilityFrequency === option && <Check className="w-4 h-4 mr-2" />}
                  {option}
                </Button>
              ))}
            </div>
          </div>

          {/* Q20 */}
          <div>
            <Label className="text-base font-bold mb-4 block">😴 Average sleep hours per night</Label>
            <Input
              type="number"
              step="0.5"
              placeholder="e.g. 7"
              value={formData.sleepHours}
              onChange={(e) => updateField("sleepHours", e.target.value)}
              className="text-base h-14"
            />
          </div>

          {/* Q21 - Sleep Quality */}
          <div>
            <Label className="text-base font-bold mb-4 block">⭐ Sleep Quality (1-5)</Label>
            <div className="grid grid-cols-5 gap-2">
              {[1, 2, 3, 4, 5].map((level) => (
                <Button
                  key={level}
                  variant={formData.sleepQuality === level.toString() ? "default" : "outline"}
                  onClick={() => updateField("sleepQuality", level.toString())}
                  className={`h-14 text-base font-semibold ${formData.sleepQuality === level.toString() ? "bg-yellow-500 text-black hover:bg-yellow-600" : ""}`}
                >
                  {formData.sleepQuality === level.toString() && <Check className="w-4 h-4 mr-2" />}
                  {level}
                </Button>
              ))}
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "Nutrition & Hydration",
      icon: "🍎",
      questions: (
        <div className="space-y-6">
          {/* Q21 */}
          <div>
            <Label className="text-base font-bold mb-4 block">How would you describe your diet?</Label>
            <div className="grid grid-cols-2 gap-3">
              {["Balanced", "High Protein", "Low Carb", "Vegetarian", "Vegan", "Unstructured"].map((option) => (
                <Button
                  key={option}
                  variant={formData.dietType.includes(option) ? "default" : "outline"}
                  onClick={() => toggleArrayField("dietType", option)}
                  className={`h-14 text-base font-semibold ${formData.dietType.includes(option) ? "bg-yellow-500 text-black hover:bg-yellow-600" : ""}`}
                >
                  {formData.dietType.includes(option) && <Check className="w-4 h-4 mr-2" />}
                  {option}
                </Button>
              ))}
            </div>
            <p className="text-sm text-muted-foreground mt-2">You can select multiple</p>
          </div>

          {/* Q22 */}
          <div>
            <Label className="text-base font-bold mb-4 block">💧 Water intake (liters per day)</Label>
            <div className="grid grid-cols-4 gap-2">
              {["1.5", "2", "2.5", "3+"].map((option) => (
                <Button
                  key={option}
                  variant={formData.waterIntake === option ? "default" : "outline"}
                  onClick={() => updateField("waterIntake", option)}
                  className={`h-14 text-base font-semibold ${formData.waterIntake === option ? "bg-yellow-500 text-black hover:bg-yellow-600" : ""}`}
                >
                  {formData.waterIntake === option && <Check className="w-4 h-4 mr-2" />}
                  {option}L
                </Button>
              ))}
            </div>
          </div>

          {/* Q23 */}
          <div>
            <Label className="text-base font-bold mb-4 block">💊 Supplements you use</Label>
            <div className="grid grid-cols-2 gap-3">
              {["Creatine", "Protein", "Electrolytes", "None"].map((option) => (
                <Button
                  key={option}
                  variant={formData.supplements.includes(option) ? "default" : "outline"}
                  onClick={() => toggleArrayField("supplements", option)}
                  className={`h-14 text-base font-semibold ${formData.supplements.includes(option) ? "bg-yellow-500 text-black hover:bg-yellow-600" : ""}`}
                >
                  {formData.supplements.includes(option) && <Check className="w-4 h-4 mr-2" />}
                  {option}
                </Button>
              ))}
            </div>
            <p className="text-sm text-muted-foreground mt-2">You can select multiple</p>
          </div>

          {/* Q24 - Protein Intake */}
          <div>
            <Label className="text-base font-bold mb-4 block">🥩 Protein intake (g/kg bodyweight)</Label>
            <Input
              type="number"
              step="0.1"
              placeholder="e.g. 1.5"
              value={formData.proteinIntake}
              onChange={(e) => updateField("proteinIntake", e.target.value)}
              className="text-base h-14"
            />
          </div>

          {/* Q25 - Fruit & Vegetables */}
          <div>
            <Label className="text-base font-bold mb-4 block">🥬 Fruit & vegetables (servings per day)</Label>
            <div className="grid grid-cols-4 gap-2">
              {["1-2", "3-4", "5-6", "7+"].map((option) => (
                <Button
                  key={option}
                  variant={formData.fruitVegServings === option ? "default" : "outline"}
                  onClick={() => updateField("fruitVegServings", option)}
                  className={`h-14 text-base font-semibold ${formData.fruitVegServings === option ? "bg-yellow-500 text-black hover:bg-yellow-600" : ""}`}
                >
                  {formData.fruitVegServings === option && <Check className="w-4 h-4 mr-2" />}
                  {option}
                </Button>
              ))}
            </div>
          </div>

          {/* Q26 - Fiber Intake */}
          <div>
            <Label className="text-base font-bold mb-4 block">🌾 Fiber intake (grams per day)</Label>
            <div className="grid grid-cols-4 gap-2">
              {["<15g", "15-25g", "25-35g", "35g+"].map((option) => (
                <Button
                  key={option}
                  variant={formData.fiberIntake === option ? "default" : "outline"}
                  onClick={() => updateField("fiberIntake", option)}
                  className={`h-14 text-base font-semibold ${formData.fiberIntake === option ? "bg-yellow-500 text-black hover:bg-yellow-600" : ""}`}
                >
                  {formData.fiberIntake === option && <Check className="w-4 h-4 mr-2" />}
                  {option}
                </Button>
              ))}
            </div>
          </div>

          {/* Q27 - Nutrition Uncertainty */}
          <div>
            <Label className="text-base font-bold mb-4 block">❓ Unsure about nutrition?</Label>
            <div className="grid grid-cols-2 gap-3">
              {["Yes", "No"].map((option) => (
                <Button
                  key={option}
                  variant={formData.nutritionUncertain === option ? "default" : "outline"}
                  onClick={() => updateField("nutritionUncertain", option)}
                  className={`h-14 text-base font-semibold ${formData.nutritionUncertain === option ? "bg-yellow-500 text-black hover:bg-yellow-600" : ""}`}
                >
                  {formData.nutritionUncertain === option && <Check className="w-4 h-4 mr-2" />}
                  {option}
                </Button>
              ))}
            </div>
            {formData.nutritionUncertain === "Yes" && (
              <div className="mt-4 p-4 bg-yellow-100 border border-yellow-300 rounded-lg">
                <p className="text-sm text-yellow-800">
                  💡 Consider booking a nutrition consultation with our experts!
                </p>
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      title: "Lifestyle & Mindset",
      icon: "🍸",
      questions: (
        <div className="space-y-6">
          {/* Q24 */}
          <div>
            <Label className="text-base font-bold mb-4 block">🏋️ Training sessions per week</Label>
            <div className="grid grid-cols-5 gap-2">
              {["2", "3", "4", "5", "6"].map((option) => (
                <Button
                  key={option}
                  variant={formData.trainingFrequency === option ? "default" : "outline"}
                  onClick={() => updateField("trainingFrequency", option)}
                  className={`h-14 text-base font-semibold ${formData.trainingFrequency === option ? "bg-yellow-500 text-black hover:bg-yellow-600" : ""}`}
                >
                  {formData.trainingFrequency === option && <Check className="w-4 h-4 mr-2" />}
                  {option}
                </Button>
              ))}
            </div>
          </div>

          {/* Q25 */}
          <div>
            <Label className="text-base font-bold mb-4 block">🎯 What's your biggest weakness in HYROX?</Label>
            <div className="grid grid-cols-2 gap-3">
              {["Running", "Sled", "Wall Balls", "Burpees", "Endurance", "Transitions"].map((option) => (
                <Button
                  key={option}
                  variant={formData.biggestWeakness.includes(option) ? "default" : "outline"}
                  onClick={() => toggleArrayField("biggestWeakness", option)}
                  className={`h-14 text-base font-semibold ${formData.biggestWeakness.includes(option) ? "bg-yellow-500 text-black hover:bg-yellow-600" : ""}`}
                >
                  {formData.biggestWeakness.includes(option) && <Check className="w-4 h-4 mr-2" />}
                  {option}
                </Button>
              ))}
            </div>
            <p className="text-sm text-muted-foreground mt-2">You can select multiple</p>
          </div>

          {/* Q26 - Stress Level */}
          <div>
            <Label className="text-base font-bold mb-4 block">😰 Stress level (1-5)</Label>
            <div className="grid grid-cols-5 gap-2">
              {[1, 2, 3, 4, 5].map((level) => (
                <Button
                  key={level}
                  variant={formData.stressLevel === level.toString() ? "default" : "outline"}
                  onClick={() => updateField("stressLevel", level.toString())}
                  className={`h-14 text-base font-semibold ${formData.stressLevel === level.toString() ? "bg-yellow-500 text-black hover:bg-yellow-600" : ""}`}
                >
                  {formData.stressLevel === level.toString() && <Check className="w-4 h-4 mr-2" />}
                  {level}
                </Button>
              ))}
            </div>
          </div>

          {/* Q27 - Work Schedule */}
          <div>
            <Label className="text-base font-bold mb-4 block">💼 Work schedule impact (1-5)</Label>
            <div className="grid grid-cols-5 gap-2">
              {[1, 2, 3, 4, 5].map((level) => (
                <Button
                  key={level}
                  variant={formData.workSchedule === level.toString() ? "default" : "outline"}
                  onClick={() => updateField("workSchedule", level.toString())}
                  className={`h-14 text-base font-semibold ${formData.workSchedule === level.toString() ? "bg-yellow-500 text-black hover:bg-yellow-600" : ""}`}
                >
                  {formData.workSchedule === level.toString() && <Check className="w-4 h-4 mr-2" />}
                  {level}
                </Button>
              ))}
            </div>
          </div>

          {/* Q28 - Recovery Practices */}
          <div>
            <Label className="text-base font-bold mb-4 block">🧘 Recovery practices</Label>
            <div className="grid grid-cols-2 gap-3">
              {["Massage", "Sauna", "Ice Bath", "Stretching", "Meditation", "None"].map((option) => (
                <Button
                  key={option}
                  variant={formData.recoveryPractices.includes(option) ? "default" : "outline"}
                  onClick={() => toggleArrayField("recoveryPractices", option)}
                  className={`h-14 text-base font-semibold ${formData.recoveryPractices.includes(option) ? "bg-yellow-500 text-black hover:bg-yellow-600" : ""}`}
                >
                  {formData.recoveryPractices.includes(option) && <Check className="w-4 h-4 mr-2" />}
                  {option}
                </Button>
              ))}
            </div>
            <p className="text-sm text-muted-foreground mt-2">You can select multiple</p>
          </div>
        </div>
      ),
    },
    {
      title: "Experience & Competition",
      icon: "🏆",
      questions: (
        <div className="space-y-6">
          {/* Q29 - HYROX Races Completed */}
          <div>
            <Label className="text-base font-bold mb-4 block">🏁 HYROX races completed</Label>
            <div className="grid grid-cols-4 gap-2">
              {["0", "1", "2-4", "5+"].map((option) => (
                <Button
                  key={option}
                  variant={formData.hyroxRacesCompleted === option ? "default" : "outline"}
                  onClick={() => updateField("hyroxRacesCompleted", option)}
                  className={`h-14 text-base font-semibold ${formData.hyroxRacesCompleted === option ? "bg-yellow-500 text-black hover:bg-yellow-600" : ""}`}
                >
                  {formData.hyroxRacesCompleted === option && <Check className="w-4 h-4 mr-2" />}
                  {option}
                </Button>
              ))}
            </div>
          </div>

          {/* Q30 - Functional Fitness Years */}
          <div>
            <Label className="text-base font-bold mb-4 block">💪 Years of functional fitness</Label>
            <div className="grid grid-cols-4 gap-2">
              {["<1", "1-2", "3-5", "5+"].map((option) => (
                <Button
                  key={option}
                  variant={formData.functionalFitnessYears === option ? "default" : "outline"}
                  onClick={() => updateField("functionalFitnessYears", option)}
                  className={`h-14 text-base font-semibold ${formData.functionalFitnessYears === option ? "bg-yellow-500 text-black hover:bg-yellow-600" : ""}`}
                >
                  {formData.functionalFitnessYears === option && <Check className="w-4 h-4 mr-2" />}
                  {option}
                </Button>
              ))}
            </div>
          </div>

          {/* Q31 - Competition Level */}
          <div>
            <Label className="text-base font-bold mb-4 block">🥇 Competition level</Label>
            <div className="grid grid-cols-3 gap-3">
              {["Recreational", "Competitive", "Elite"].map((option) => (
                <Button
                  key={option}
                  variant={formData.competitionLevel === option ? "default" : "outline"}
                  onClick={() => updateField("competitionLevel", option)}
                  className={`h-14 text-base font-semibold ${formData.competitionLevel === option ? "bg-yellow-500 text-black hover:bg-yellow-600" : ""}`}
                >
                  {formData.competitionLevel === option && <Check className="w-4 h-4 mr-2" />}
                  {option}
                </Button>
              ))}
            </div>
          </div>
        </div>
      ),
    },
  ];

  const currentSectionData = sections[currentSection];
  const progress = ((currentSection + 1) / sections.length) * 100;

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
        <div className="container max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate("/profile")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-xl font-bold">HYROX Athlete Assessment</h1>
              <p className="text-sm text-muted-foreground">
                Section {currentSection + 1} of {sections.length}
              </p>
            </div>
          </div>
          {/* Progress bar */}
          <div className="mt-3 h-2 bg-secondary rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-yellow-500"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container max-w-2xl mx-auto px-4 py-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSection}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <Card className="p-6 mb-6">
              <div className="flex items-center gap-3 mb-6">
                <span className="text-4xl">{currentSectionData.icon}</span>
                <h2 className="text-2xl font-bold">{currentSectionData.title}</h2>
              </div>
              {currentSectionData.questions}
            </Card>
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex gap-3">
          {currentSection > 0 && (
            <Button variant="outline" size="lg" onClick={handlePrev} className="flex-1">
              Previous
            </Button>
          )}
          {currentSection < sections.length - 1 ? (
            <Button
              size="lg"
              onClick={handleNext}
              className="flex-1 bg-yellow-500 text-black hover:bg-yellow-600"
            >
              Next Section
            </Button>
          ) : (
            <Button
              size="lg"
              onClick={handleSubmit}
              className="flex-1 bg-yellow-500 text-black hover:bg-yellow-600"
            >
              Complete Assessment
            </Button>
          )}
        </div>
      </main>
    </div>
  );
};

export default Assessment;

