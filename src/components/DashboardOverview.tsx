import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Calendar, Dumbbell, TrendingUp } from "lucide-react";
import type { Workout } from "../../api";
import { calculateWorkoutVolume } from "../workoutUtils";

interface DashboardOverviewProps {
  workouts: Workout[];
}

const DashboardOverview: React.FC<DashboardOverviewProps> = ({ workouts }) => {
  // Calculate summary statistics
  const totalWorkouts = workouts.length;
  const totalExercises = workouts.reduce((total, workout) => total + workout.exercises.length, 0);
  const totalVolume = workouts.reduce((total, workout) => total + calculateWorkoutVolume(workout), 0);
  
  // Get most recent workout
  const mostRecentWorkout = workouts[0];
  
  // Calculate weekly volume data for chart
  const weeklyVolumeData = getWeeklyVolumeData(workouts);

  // Count unique exercises
  const uniqueExercises = new Set(
    workouts.flatMap(workout => 
      workout.exercises.map(exercise => exercise.title)
    )
  ).size;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Workouts</CardTitle>
            <CardDescription>Lifetime</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <Calendar className="h-4 w-4 text-muted-foreground mr-2" />
              <div className="text-2xl font-bold">{totalWorkouts}</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Exercises</CardTitle>
            <CardDescription>All workouts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <Dumbbell className="h-4 w-4 text-muted-foreground mr-2" />
              <div className="text-2xl font-bold">{totalExercises}</div>
              <Badge variant="outline" className="ml-2">
                {uniqueExercises} unique
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Tabs defaultValue="volume">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="volume">Volume Over Time</TabsTrigger>
          <TabsTrigger value="recent">Recent Progress</TabsTrigger>
        </TabsList>
        <TabsContent value="volume" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Weekly Volume</CardTitle>
              <CardDescription>Pounds lifted each week</CardDescription>
            </CardHeader>
            <CardContent className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyVolumeData}>
                  <XAxis dataKey="week" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value) => [`${value.toLocaleString()} lbs`, 'Volume']}
                  />
                  <Bar dataKey="volume" fill="#8884d8" name="Volume (lbs)" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="recent">
          <Card>
            <CardHeader>
              <CardTitle>Recent Progress</CardTitle>
              <CardDescription>Your last workout ({mostRecentWorkout && new Date(mostRecentWorkout.date).toLocaleDateString()})</CardDescription>
            </CardHeader>
            <CardContent>
              {mostRecentWorkout && (
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-1 text-sm">
                      <span>Volume: {calculateWorkoutVolume(mostRecentWorkout).toLocaleString()} lbs</span>
                      <span>{mostRecentWorkout.exercises.length} exercises</span>
                    </div>
                    <Progress value={75} className="h-2" />
                  </div>
                  
                  <div className="space-y-2">
                    {mostRecentWorkout.exercises.map(exercise => (
                      <div key={exercise.id} className="border p-2 rounded-md">
                        <div className="font-medium">{exercise.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {exercise.sets.map(set => `${set.rawValue1}${set.rawValue2 ? ` × ${set.rawValue2}lbs` : ''}`).join(', ')}
                        </div>
                        {exercise.bestEstimated1RM && (
                          <div className="text-xs flex items-center mt-1">
                            <Badge variant="secondary" className="text-xs">1RM: {exercise.bestEstimated1RM} lbs</Badge>
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
  
  workouts.forEach(workout => {
    const date = new Date(workout.date);
    const weekStart = getWeekStartDate(date);
    const weekKey = weekStart.toISOString().split('T')[0];
    
    if (!weeklyVolume[weekKey]) {
      weeklyVolume[weekKey] = 0;
    }
    
    weeklyVolume[weekKey] += calculateWorkoutVolume(workout);
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