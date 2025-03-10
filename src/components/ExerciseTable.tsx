import { useState, useMemo } from "react";
import {} from "./ui/table";
import { Card } from "./ui/card";
import { Input } from "./ui/input";

import { ChevronRight } from "lucide-react";
import type { Workout, WorkoutExercise } from "../../api";
import ExerciseDetail from "./ExerciseDetail";

interface ExerciseTableProps {
  workouts: Workout[];
}

export default function ExerciseTable({ workouts }: ExerciseTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedExercise, setSelectedExercise] =
    useState<WorkoutExercise | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Type for our enhanced exercise data
  interface EnhancedExercise {
    title: string;
    instances: WorkoutExercise[];
    lastPerformed: Date;
    totalSets: number;
    bestOneRepMax?: number;
  }

  // Extract all unique exercises from workouts
  const exercises = useMemo<EnhancedExercise[]>(() => {
    const exerciseMap = new Map<string, WorkoutExercise[]>();

    workouts.forEach((workout) => {
      workout.exercises.forEach((exercise) => {
        if (!exerciseMap.has(exercise.title)) {
          exerciseMap.set(exercise.title, []);
        }
        const instances = exerciseMap.get(exercise.title);
        if (instances) {
          instances.push({
            ...exercise,
            // Add workout date for reference
            workout: { date: workout.date, id: workout.programWorkoutId ?? 0 },
          } as WorkoutExercise & { workout: { date: string; id: number } });
        }
      });
    });

    return Array.from(exerciseMap.entries()).map(([title, instances]) => {
      // Find the best estimated 1RM across all instances
      const bestOneRepMax = instances.reduce((best, current) => {
        return current.bestEstimated1RM && current.bestEstimated1RM > best
          ? current.bestEstimated1RM
          : best;
      }, 0);

      return {
        title,
        instances,
        lastPerformed: instances.reduce((latest, current) => {
          const currentDate = new Date((current as any).workout?.date || 0);
          return currentDate > latest ? currentDate : latest;
        }, new Date(0)),
        totalSets: instances.reduce(
          (sum, instance) => sum + instance.sets.length,
          0
        ),
        bestOneRepMax: bestOneRepMax > 0 ? bestOneRepMax : undefined,
      };
    });
  }, [workouts]);

  // Filter exercises based on search query
  const filteredExercises = useMemo(() => {
    if (!searchQuery) return exercises;

    const query = searchQuery.toLowerCase();
    return exercises.filter((exercise) =>
      exercise.title.toLowerCase().includes(query)
    );
  }, [exercises, searchQuery]);

  // Sort exercises by most recently performed
  const sortedExercises = useMemo(() => {
    return [...filteredExercises].sort(
      (a, b) => b.lastPerformed.getTime() - a.lastPerformed.getTime()
    );
  }, [filteredExercises]);

  const handleExerciseClick = (exerciseInstances: WorkoutExercise[]) => {
    if (exerciseInstances && exerciseInstances.length > 0) {
      const exercise = exerciseInstances[0];
      if (exercise) {
        setSelectedExercise(exercise);
        setIsDetailOpen(true);
      }
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  // Format date for display
  const formatDate = (date: Date): string => {
    // Add a day to fix the off-by-one issue
    const adjustedDate = new Date(date);
    adjustedDate.setDate(adjustedDate.getDate() + 1);

    return adjustedDate.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex flex-col md:flex-row items-center justify-between mb-4 gap-4">
          <div>
            <h2 className="text-2xl font-bold">Exercise Library</h2>
            <p className="text-sm text-muted-foreground">
              {sortedExercises.length}{" "}
              {sortedExercises.length === 1 ? "exercise" : "exercises"} found
              {searchQuery && ` for "${searchQuery}"`}
            </p>
          </div>
          <div className="w-full md:w-1/2">
            <Input
              placeholder="Search exercises..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="w-full"
            />
          </div>
        </div>

        <div className="space-y-2 max-w-2xl mx-auto">
          {sortedExercises.length > 0 ? (
            sortedExercises.map((exercise) => (
              <div
                key={exercise.title}
                className="p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => handleExerciseClick(exercise.instances)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="font-medium text-base">{exercise.title}</h3>
                    <div className="text-sm text-muted-foreground mt-2 flex flex-wrap gap-x-6 gap-y-1">
                      <span>Last: {formatDate(exercise.lastPerformed)}</span>
                      <span>Total Sets: {exercise.totalSets}</span>
                      {exercise.bestOneRepMax && (
                        <span className="font-medium text-foreground">
                          Est. 1RM: {Math.round(exercise.bestOneRepMax)} lbs
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12 text-muted-foreground border rounded-lg">
              No exercises found
            </div>
          )}
        </div>
      </Card>

      {selectedExercise && (
        <ExerciseDetail
          exercise={selectedExercise}
          workouts={workouts}
          open={isDetailOpen}
          onOpenChange={setIsDetailOpen}
        />
      )}
    </div>
  );
}
