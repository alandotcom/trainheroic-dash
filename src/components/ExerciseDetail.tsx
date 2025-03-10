import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { WorkoutExercise, Workout } from "../../api";
import { Award } from "lucide-react";

interface ExerciseDetailProps {
  exercise: WorkoutExercise;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workouts: Workout[]; // Full workout history for this user
}

const ExerciseDetail: React.FC<ExerciseDetailProps> = ({
  exercise,
  open,
  onOpenChange,
  workouts,
}) => {
  // Find all occurrences of this exercise across workouts
  const exerciseHistory = React.useMemo(() => {
    return workouts
      .flatMap((workout) => {
        const matchedExercise = workout.exercises.find(
          (ex) => ex.title === exercise.title
        );
        if (matchedExercise) {
          return {
            date: workout.date,
            exercise: matchedExercise,
          };
        }
        return null;
      })
      .filter(Boolean)
      .sort(
        (a, b) => new Date(a!.date).getTime() - new Date(b!.date).getTime()
      );
  }, [exercise.title, workouts]);

  // Generate data for the weight progression chart (using max weight from each workout)
  const weightProgressionData = React.useMemo(() => {
    return exerciseHistory
      .map((history) => {
        if (!history) return null;

        // Find max weight for this exercise on this date
        const maxWeight = Math.max(
          ...history.exercise.sets
            .filter((set) => set.rawValue2)
            .map((set) => set.rawValue2 || 0)
        );

        // Add a day to fix the off-by-one issue
        const date = new Date(history.date);
        date.setDate(date.getDate() + 1);

        return {
          date: date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          }),
          weight: maxWeight,
        };
      })
      .filter(Boolean);
  }, [exerciseHistory]);

  // Get PRs for this exercise (highest weight for different rep ranges)
  const personalRecords = React.useMemo(() => {
    const prMap = new Map<number, { weight: number; date: string }>();

    exerciseHistory.forEach((history) => {
      if (!history) return;

      history.exercise.sets.forEach((set) => {
        const reps = set.rawValue1;
        const weight = set.rawValue2;

        if (reps && weight) {
          const currentPR = prMap.get(reps);
          if (!currentPR || weight > currentPR.weight) {
            prMap.set(reps, { weight, date: history.date });
          }
        }
      });
    });

    return Array.from(prMap.entries())
      .sort((a, b) => a[0] - b[0]) // Sort by rep count
      .map(([reps, { weight, date }]) => {
        // Add a day to fix the off-by-one issue
        const adjustedDate = new Date(date);
        adjustedDate.setDate(adjustedDate.getDate() + 1);

        return {
          reps,
          weight,
          date: adjustedDate.toLocaleDateString(),
        };
      });
  }, [exerciseHistory]);

  // Calculate one-rep max estimate (using Brzycki formula)
  const estimatedOneRepMax = exercise.bestEstimated1RM;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{exercise.title}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="overview">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="progress">Progress</TabsTrigger>
            <TabsTrigger value="records">Records</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <Card>
              <CardHeader>
                <CardTitle>Recent Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {/* Most recent stats */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="border rounded-lg p-3">
                      <div className="text-sm text-muted-foreground">
                        Est. One-Rep Max
                      </div>
                      <div className="flex items-center">
                        <Award className="h-5 w-5 mr-2 text-yellow-500" />
                        <div className="text-2xl font-bold">
                          {estimatedOneRepMax
                            ? `${Math.round(estimatedOneRepMax)} lbs`
                            : "N/A"}
                        </div>
                      </div>
                    </div>

                    <div className="border rounded-lg p-3">
                      <div className="text-sm text-muted-foreground">
                        Workout Count
                      </div>
                      <div className="text-2xl font-bold">
                        {exerciseHistory.length} workouts
                      </div>
                    </div>
                  </div>

                  {/* Current set details */}
                  <div>
                    <h3 className="font-medium mb-2">Current Sets</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {exercise.sets.map((set) => (
                        <div
                          key={set.setNumber}
                          className="bg-muted p-2 rounded text-sm flex justify-between items-center"
                        >
                          <span className="font-medium">
                            Set {set.setNumber}
                          </span>
                          <span className="text-muted-foreground">
                            {set.rawValue1 || "0"} reps
                            {set.rawValue2 ? ` @ ${set.rawValue2} lbs` : ""}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="progress">
            <Card>
              <CardHeader>
                <CardTitle>Weight Progression</CardTitle>
              </CardHeader>
              <CardContent className="h-80">
                {weightProgressionData.length > 1 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={weightProgressionData}>
                      <XAxis dataKey="date" />
                      <YAxis domain={["dataMin - 10", "dataMax + 10"]} />
                      <Tooltip
                        formatter={(value) => [`${value} lbs`, "Weight"]}
                      />
                      <Line
                        type="monotone"
                        dataKey="weight"
                        stroke="#8884d8"
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    Not enough data to show progression
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="records">
            <Card>
              <CardHeader>
                <CardTitle>Personal Records</CardTitle>
              </CardHeader>
              <CardContent>
                {personalRecords.length > 0 ? (
                  <div className="space-y-3">
                    {personalRecords.map((pr) => (
                      <div
                        key={pr.reps}
                        className="border rounded-lg p-3 flex justify-between items-center"
                      >
                        <div>
                          <Badge className="mb-1">
                            {pr.reps} Rep{pr.reps !== 1 ? "s" : ""}
                          </Badge>
                          <div className="text-xl font-bold">
                            {pr.weight} lbs
                          </div>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {pr.date}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No personal records found for this exercise.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default ExerciseDetail;
