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
import { Calendar, Dumbbell } from "lucide-react";
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
    <div className="space-y-5">
      <div className="grid grid-cols-1 xs:grid-cols-2 gap-4">
        <Card className="h-full">
          <CardHeader className="pb-1 px-4 pt-4">
            <CardTitle className="text-responsive font-medium">
              Total Workouts
            </CardTitle>
            <CardDescription className="text-xs">Lifetime</CardDescription>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="flex items-center">
              <Calendar className="h-4 w-4 text-muted-foreground mr-2" />
              <div className="text-xl xs:text-2xl font-bold">
                {totalWorkouts}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="h-full">
          <CardHeader className="pb-1 px-4 pt-4">
            <CardTitle className="text-responsive font-medium">
              Total Exercises
            </CardTitle>
            <CardDescription className="text-xs">All workouts</CardDescription>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="flex items-center flex-wrap gap-y-1">
              <Dumbbell className="h-4 w-4 text-muted-foreground mr-2" />
              <div className="text-xl xs:text-2xl font-bold">
                {totalExercises}
              </div>
              <Badge variant="outline" className="ml-2 text-xs">
                {uniqueExercises} unique
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="volume" className="w-full overflow-hidden">
        <TabsList className="grid w-full grid-cols-2 text-xs sm:text-sm">
          <TabsTrigger value="volume">Volume Over Time</TabsTrigger>
          <TabsTrigger value="recent">Recent Progress</TabsTrigger>
        </TabsList>
        <TabsContent value="volume" className="space-y-4 mt-3">
          <Card className="overflow-hidden">
            <CardHeader className="px-4 pt-4 pb-2">
              <CardTitle className="text-responsive">Weekly Volume</CardTitle>
              <CardDescription className="text-xs">
                Pounds lifted each week
              </CardDescription>
            </CardHeader>
            <CardContent className="h-56 xs:h-60 sm:h-80 px-0 pb-4 table-responsive">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={weeklyVolumeData}
                  margin={{ top: 20, right: 10, left: 0, bottom: 0 }}
                >
                  <XAxis
                    dataKey="week"
                    fontSize={10}
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
                    tick={{ fontSize: 10 }}
                  />
                  <YAxis width={40} fontSize={10} />
                  <Tooltip
                    formatter={(value) => [
                      `${value.toLocaleString()} lbs`,
                      "Volume",
                    ]}
                    contentStyle={{ fontSize: "12px" }}
                  />
                  <Bar dataKey="volume" fill="#8884d8" name="Volume (lbs)" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="recent" className="mt-3">
          <Card>
            <CardHeader className="px-4 pt-4 pb-2">
              <CardTitle className="text-responsive">Recent Progress</CardTitle>
              <CardDescription className="text-xs">
                Your last workout (
                {mostRecentWorkout &&
                  (() => {
                    // Add a day to fix the off-by-one issue
                    const date = new Date(mostRecentWorkout.date);
                    date.setDate(date.getDate() + 1);
                    return date.toLocaleDateString();
                  })()}
                )
              </CardDescription>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {mostRecentWorkout && (
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-1 text-xs">
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

                  <div className="space-y-3">
                    {mostRecentWorkout.exercises.map((exercise) => (
                      <div key={exercise.id} className="border p-3 rounded-md">
                        <div className="font-medium text-responsive truncate">
                          {exercise.title}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
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
                          <div className="text-xs flex items-center mt-2">
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
    // Add a day to fix the off-by-one issue
    const rawDate = new Date(workout.date);
    rawDate.setDate(rawDate.getDate() + 1);
    const date = new Date(rawDate);

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
