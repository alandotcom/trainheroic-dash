import React, { useState, useEffect } from "react";
import type { Workout } from "../api";
import WorkoutTable from "./components/WorkoutTable";
import ExerciseTable from "./components/ExerciseTable";
import LoginForm from "./components/LoginForm";
import DashboardOverview from "./components/DashboardOverview";
import { getWorkoutHistory, clearAllCaches } from "./workoutUtils";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { RefreshCw, LogOut, Dumbbell, LineChart, Calendar } from "lucide-react";

// LocalStorage keys for authentication persistence
const STORAGE_KEYS = {
  IS_AUTHENTICATED: "trainheroic_is_authenticated",
  WORKOUTS: "trainheroic_workouts",
};

const App: React.FC = () => {
  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Workout data state
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);
  const [loadingProgress, setLoadingProgress] = useState(0);

  // Load saved state from localStorage on component mount
  useEffect(() => {
    try {
      // Restore authentication state
      const savedAuth = localStorage.getItem(STORAGE_KEYS.IS_AUTHENTICATED);
      if (savedAuth === "true") {
        setIsAuthenticated(true);
      }

      // Restore workouts data if it exists
      const savedWorkouts = localStorage.getItem(STORAGE_KEYS.WORKOUTS);
      if (savedWorkouts) {
        setWorkouts(JSON.parse(savedWorkouts));
      }
    } catch (error) {
      console.error("Error restoring state from localStorage:", error);
      // Clear potentially corrupted data
      Object.values(STORAGE_KEYS).forEach((key) =>
        localStorage.removeItem(key),
      );
    }
  }, []);

  // Handle user login
  const handleLogin = async (email: string, password: string) => {
    try {
      setAuthLoading(true);
      setAuthError(null);

      // Check for existing workouts in localStorage first
      const savedWorkouts = localStorage.getItem(STORAGE_KEYS.WORKOUTS);
      if (savedWorkouts) {
        // If we have cached workouts, use them immediately
        console.log("Using cached workout data");
        setWorkouts(JSON.parse(savedWorkouts));

        // Mark user as authenticated immediately to improve UX
        setIsAuthenticated(true);
        localStorage.setItem(STORAGE_KEYS.IS_AUTHENTICATED, "true");
        setAuthLoading(false);

        // Then check for new workouts in the background
        try {
          setLoadingProgress(0);
          setDataLoading(true);
          
          // First authenticate to get a session token
          const { auth } = await import("../api");
          const { data } = await auth(email, password);
          if (!data || !data.session_id) {
            throw new Error("Authentication failed");
          }
          
          const sessionToken = data.session_id;
          
          // Find the most recent workout date from our cached data
          let mostRecentDate = "1970-01-01";
          const parsedWorkouts = JSON.parse(savedWorkouts);
          if (parsedWorkouts.length > 0 && parsedWorkouts[0]?.date) {
            mostRecentDate = parsedWorkouts[0].date;
          }
          
          // Get only new workouts since the most recent one
          const { fetchNewWorkouts } = await import("./workoutUtils");
          const newWorkouts = await fetchNewWorkouts(
            sessionToken,
            mostRecentDate,
            (progress) => {
              setLoadingProgress(progress);
            }
          );
          
          if (newWorkouts.length > 0) {
            // Merge new workouts with existing ones
            console.log(`Found ${newWorkouts.length} new workouts to add during login`);
            
            // Create a map of existing workouts by date
            const workoutsByDate = new Map<string, Workout>(
              parsedWorkouts.map((workout: Workout) => [workout.date, workout])
            );
            
            // Add new workouts, but only if they have exercises
            for (const workout of newWorkouts) {
              // Don't replace existing workouts with empty ones
              if (workout.exercises && workout.exercises.length > 0) {
                workoutsByDate.set(workout.date, workout);
              } else {
                // Only add this workout if we don't already have a workout for this date
                if (!workoutsByDate.has(workout.date)) {
                  workoutsByDate.set(workout.date, workout);
                }
              }
            }
            
            // Sort and update
            const mergedWorkouts = Array.from(workoutsByDate.values())
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) as Workout[];
            
            setWorkouts(mergedWorkouts);
            localStorage.setItem(STORAGE_KEYS.WORKOUTS, JSON.stringify(mergedWorkouts));
          }
        } catch (fetchErr) {
          console.warn(
            "Couldn't update workout data, but using cached data:",
            fetchErr,
          );
          // Still using cached data, so don't show error to user
        } finally {
          setDataLoading(false);
          setLoadingProgress(0);
        }
      } else {
        // No cached data - need to fetch everything
        try {
          setLoadingProgress(0);
          const allWorkouts = await getWorkoutHistory(
            email,
            password,
            (progress) => {
              setLoadingProgress(progress);
            },
          );
          setWorkouts(allWorkouts);

          // Mark user as authenticated
          setIsAuthenticated(true);

          // Save state to localStorage
          localStorage.setItem(STORAGE_KEYS.IS_AUTHENTICATED, "true");
          localStorage.setItem(
            STORAGE_KEYS.WORKOUTS,
            JSON.stringify(allWorkouts),
          );
        } catch (err) {
          console.error("Login error:", err);
          setAuthError(
            "Authentication failed. Please check your email and password.",
          );
        }
      }
    } finally {
      setAuthLoading(false);
      setLoadingProgress(0);
    }
  };

  // Handle refresh to check for new workouts
  const handleRefresh = async () => {
    // Prevent multiple refresh operations
    if (dataLoading) {
      console.log("Refresh already in progress");
      return;
    }

    try {
      setDataLoading(true);
      setDataError(null);
      setLoadingProgress(0);

      console.log("Refreshing workout data...");

      // Get the latest workout date from our current data
      let mostRecentDate = "1970-01-01";
      if (workouts.length > 0 && workouts[0]?.date) {
        mostRecentDate = workouts[0].date;
      }

      // Get session token from localStorage
      const authCache = localStorage.getItem("trainheroic_auth_cache");
      if (!authCache) {
        throw new Error("Authentication data not found. Please log in again.");
      }

      const authData = JSON.parse(authCache);
      const sessionToken = authData.data.session_id;
      
      if (!sessionToken) {
        throw new Error("Session token not found. Please log in again.");
      }

      // Use the new incremental refresh function
      const { fetchNewWorkouts } = await import("./workoutUtils");
      const newWorkouts = await fetchNewWorkouts(
        sessionToken,
        mostRecentDate,
        (progress) => {
          setLoadingProgress(progress);
        }
      );

      if (newWorkouts.length > 0) {
        // Merge new workouts with existing ones
        console.log(`Found ${newWorkouts.length} new workouts to add`);
        
        // Create a map of existing workouts by date for quick lookup
        const workoutsByDate = new Map<string, Workout>(
          workouts.map(workout => [workout.date, workout])
        );
        
        // Add or update workouts, but only if they have exercises
        for (const workout of newWorkouts) {
          // Don't replace existing workouts with empty ones
          if (workout.exercises && workout.exercises.length > 0) {
            workoutsByDate.set(workout.date, workout);
          } else {
            // Only add this workout if we don't already have a workout for this date
            if (!workoutsByDate.has(workout.date)) {
              workoutsByDate.set(workout.date, workout);
            }
          }
        }
        
        // Convert back to array and sort by date (newest first)
        const mergedWorkouts = Array.from(workoutsByDate.values())
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) as Workout[];
        
        // Update state and localStorage
        setWorkouts(mergedWorkouts);
        localStorage.setItem(STORAGE_KEYS.WORKOUTS, JSON.stringify(mergedWorkouts));
        
        console.log(`Updated with ${newWorkouts.length} new workouts`);
      } else {
        console.log("No new workouts found");
      }
    } catch (error) {
      console.error("Error refreshing workout data:", error);
      setDataError(
        "Failed to refresh data. Please try again or log out and log back in.",
      );
    } finally {
      setDataLoading(false);
      setLoadingProgress(0);
    }
  };

  // Clear cached data and log out
  const handleClearCache = () => {
    clearAllCaches();
    setIsAuthenticated(false);
    setWorkouts([]);
    alert("Cache cleared successfully. You have been logged out.");
  };

  // Handle user logout
  const handleLogout = () => {
    // Clear authentication state
    setIsAuthenticated(false);
    setWorkouts([]);

    // Remove from localStorage
    localStorage.removeItem(STORAGE_KEYS.IS_AUTHENTICATED);
    // We keep the workouts in localStorage for faster login next time
  };

  return (
    <div className="min-h-screen bg-background p-2 sm:p-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6 text-center sm:text-left">
          TrainHeroic Workout Tracker
        </h1>

        {!isAuthenticated ? (
          <>
            <Card>
              <CardContent className="pt-6">
                <LoginForm
                  onLogin={handleLogin}
                  isLoading={authLoading}
                  error={authError}
                />
              </CardContent>
            </Card>

            {dataLoading && (
              <div className="mt-8 max-w-md mx-auto space-y-2 px-2">
                <div className="text-center">
                  Loading your workout data: {loadingProgress}%
                </div>
                <Progress value={loadingProgress} className="h-2" />
                <div className="text-sm text-muted-foreground text-center">
                  This may take a moment as we retrieve all your workout history
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="space-y-4 sm:space-y-6">
            <div className="flex flex-col xs:flex-row justify-between items-center gap-3">
              <h2 className="text-xl font-semibold">Your Workout Data</h2>
              <div className="flex items-center gap-2 w-full xs:w-auto justify-center xs:justify-end">
                <Button
                  onClick={handleRefresh}
                  variant={dataLoading ? "secondary" : "outline"}
                  size="sm"
                  className="gap-1 sm:gap-2"
                  title={
                    dataLoading
                      ? "Update in progress"
                      : "Check for new workouts"
                  }
                >
                  <RefreshCw
                    className={`h-4 w-4 ${dataLoading ? "animate-spin" : ""}`}
                  />
                  {dataLoading ? "Updating..." : "Refresh"}
                </Button>
                <Button
                  onClick={handleLogout}
                  variant="destructive"
                  size="sm"
                  className="gap-1 sm:gap-2"
                  title="Sign out of your account"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </Button>
              </div>
            </div>

            {dataError ? (
              <div className="bg-destructive/10 text-destructive p-4 rounded-md">
                {dataError}
              </div>
            ) : (
              <>
                <div className="relative">
                  {dataLoading && (
                    <div className="fixed bottom-4 right-4 z-50">
                      <div className="bg-card border rounded-lg shadow-lg p-4 max-w-xs flex items-center gap-3">
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent"></div>
                        <div className="flex-1">
                          <div className="text-sm font-medium mb-1">
                            Updating Workouts
                          </div>
                          <Progress
                            value={loadingProgress}
                            className="h-1.5 w-full"
                          />
                          <div className="text-xs text-muted-foreground mt-1">
                            {loadingProgress}% Complete
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <Tabs
                    defaultValue="dashboard"
                    className="space-y-4 sm:space-y-6"
                  >
                    <TabsList className="grid w-full max-w-full sm:max-w-lg mx-auto grid-cols-3 p-1 h-12 sm:h-10 rounded-xl bg-muted/80">
                      <TabsTrigger
                        value="dashboard"
                        className="rounded-lg flex items-center justify-center gap-1.5 h-full"
                      >
                        <LineChart className="h-4 w-4" />
                        <span className="hidden xs:inline">Dashboard</span>
                        <span className="xs:hidden">Dashboard</span>
                      </TabsTrigger>
                      <TabsTrigger
                        value="history"
                        className="rounded-lg flex items-center justify-center gap-1.5 h-full"
                      >
                        <Calendar className="h-4 w-4" />
                        <span className="hidden xs:inline">
                          Workout History
                        </span>
                        <span className="xs:hidden">History</span>
                      </TabsTrigger>
                      <TabsTrigger
                        value="exercises"
                        className="rounded-lg flex items-center justify-center gap-1.5 h-full"
                      >
                        <Dumbbell className="h-4 w-4" />
                        <span className="hidden xs:inline">Exercises</span>
                        <span className="xs:hidden">Exercises</span>
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="dashboard" className="mt-4 sm:mt-6">
                      <DashboardOverview workouts={workouts} />
                    </TabsContent>

                    <TabsContent value="history" className="mt-4 sm:mt-6">
                      <WorkoutTable workouts={workouts} />
                    </TabsContent>

                    <TabsContent value="exercises" className="mt-4 sm:mt-6">
                      <ExerciseTable workouts={workouts} />
                    </TabsContent>
                  </Tabs>
                </div>

                <div className="mt-8 flex justify-center">
                  <Button
                    onClick={handleClearCache}
                    variant="ghost"
                    size="sm"
                    className="text-xs text-muted-foreground"
                    title="Clear all cached data to reload fresh information"
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Reset Cache
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
