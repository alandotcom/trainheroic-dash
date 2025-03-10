import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Calendar, Dumbbell, TrendingUp } from "lucide-react";
import type { Workout } from "../../api";
import { calculateWorkoutVolume } from "../workoutUtils";

interface DashboardOverviewProps {
  workouts: Workout[];
}

const DashboardOverview: React.FC<DashboardOverviewProps> = ({ workouts }) => {
  // Calculate summary statistics
  const totalWorkouts = workouts.length;
  const totalExercises = workouts.reduce(
    (total, workout) => total + workout.exercises.length,
    0
  );
  const totalVolume = workouts.reduce(
    (total, workout) => total + calculateWorkoutVolume(workout),
    0
  );

  // Get most recent workout
  const mostRecentWorkout = workouts[0];

  // Calculate weekly volume data for chart
  const weeklyVolumeData = getWeeklyVolumeData(workouts);

  // Count unique exercises
  const uniqueExercises = new Set(
    workouts.flatMap((workout) =>
      workout.exercises.map((exercise) => exercise.title)
    )
  ).size;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-2 gap-3 sm:gap-4">
        <Card>
          <CardHeader className="pb-1 sm:pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
            <CardTitle className="text-xs sm:text-sm font-medium">
              Total Workouts
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Lifetime
            </CardDescription>
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
            <div className="flex items-center">
              <Calendar className="h-4 w-4 text-muted-foreground mr-2" />
              <div className="text-xl sm:text-2xl font-bold">
                {totalWorkouts}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1 sm:pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
            <CardTitle className="text-xs sm:text-sm font-medium">
              Total Exercises
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              All workouts
            </CardDescription>
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
            <div className="flex items-center flex-wrap gap-y-1">
              <Dumbbell className="h-4 w-4 text-muted-foreground mr-2" />
              <div className="text-xl sm:text-2xl font-bold">
                {totalExercises}
              </div>
              <Badge variant="outline" className="ml-2 text-xs">
                {uniqueExercises} unique
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="volume">
        <TabsList className="grid w-full grid-cols-2 text-xs sm:text-sm">
          <TabsTrigger value="volume">Volume Over Time</TabsTrigger>
          <TabsTrigger value="recent">Recent Progress</TabsTrigger>
        </TabsList>
        <TabsContent value="volume" className="space-y-4">
          <Card>
            <CardHeader className="px-2 sm:px-6 pt-3 sm:pt-6 pb-1 sm:pb-3">
              <CardTitle className="text-base sm:text-lg">
                Weekly Volume
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Pounds lifted each week
              </CardDescription>
            </CardHeader>
            <CardContent className="h-60 sm:h-80 px-0 sm:px-6 pb-2 sm:pb-6">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={weeklyVolumeData}
                  margin={{ top: 20, right: 10, left: 0, bottom: 0 }}
                >
                  <XAxis
                    dataKey="week"
                    fontSize={12}
                    tickFormatter={(value) => {
                      // On mobile, show abbreviated dates
                      const isSmallScreen = window.innerWidth < 640;
                      if (isSmallScreen) {
                        const parts = value.split("-");
                        return parts.length === 3
                          ? `${parts[1]}/${parts[2]}`
                          : value;
                      }
                      return value;
                    }}
                  />
                  <YAxis width={45} fontSize={12} />
                  <Tooltip
                    formatter={(value) => [
                      `${value.toLocaleString()} lbs`,
                      "Volume",
                    ]}
                  />
                  <Bar dataKey="volume" fill="#8884d8" name="Volume (lbs)" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="recent">
          <Card>
            <CardHeader className="px-3 sm:px-6 pt-3 sm:pt-6 pb-2 sm:pb-3">
              <CardTitle className="text-base sm:text-lg">
                Recent Progress
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Your last workout (
                {mostRecentWorkout &&
                  new Date(mostRecentWorkout.date).toLocaleDateString()}
                )
              </CardDescription>
            </CardHeader>
            <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
              {mostRecentWorkout && (
                <div className="space-y-3 sm:space-y-4">
                  <div>
                    <div className="flex justify-between mb-1 text-xs sm:text-sm">
                      <span>
                        Volume:{" "}
                        {calculateWorkoutVolume(
                          mostRecentWorkout
                        ).toLocaleString()}{" "}
                        lbs
                      </span>
                      <span>
                        {mostRecentWorkout.exercises.length} exercises
                      </span>
                    </div>
                    <Progress value={75} className="h-2" />
                  </div>

                  <div className="space-y-2">
                    {mostRecentWorkout.exercises.map((exercise) => (
                      <div key={exercise.id} className="border p-2 rounded-md">
                        <div className="font-medium text-sm sm:text-base truncate">
                          {exercise.title}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {exercise.sets
                            .map(
                              (set) =>
                                `${set.rawValue1}${
                                  set.rawValue2 ? ` × ${set.rawValue2}lbs` : ""
                                }`
                            )
                            .join(", ")}
                        </div>
                        {exercise.bestEstimated1RM && (
                          <div className="text-xs flex items-center mt-1">
                            <Badge variant="secondary" className="text-xs">
                              1RM: {exercise.bestEstimated1RM} lbs
                            </Badge>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Helper function to get weekly volume data
function getWeeklyVolumeData(workouts: Workout[]) {
  const weeklyVolume: Record<string, number> = {};

  workouts.forEach((workout) => {
    const date = new Date(workout.date);
    const weekStart = getWeekStartDate(date);
    // Ensure weekStart is a valid date
    if (weekStart && !isNaN(weekStart.getTime())) {
      const weekKey = weekStart.toISOString().split("T")[0];

      // Initialize if needed
      if (weekKey && !weeklyVolume[weekKey]) {
        weeklyVolume[weekKey] = 0;
      }

      // Only add if we have a valid key
      if (weekKey && weeklyVolume[weekKey] !== undefined) {
        weeklyVolume[weekKey] += calculateWorkoutVolume(workout);
      }
    }
  });

  // Convert to array and sort by date
  return Object.entries(weeklyVolume)
    .map(([week, volume]) => ({ week, volume }))
    .sort((a, b) => a.week.localeCompare(b.week))
    .slice(-8); // Last 8 weeks
}

// Helper to get the start of a week (Sunday)
function getWeekStartDate(date: Date) {
  const day = date.getDay(); // 0 is Sunday
  const diff = date.getDate() - day;
  return new Date(date.setDate(diff));
}

export default DashboardOverview;
