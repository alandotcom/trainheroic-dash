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
        localStorage.removeItem(key)
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

        // Then check for new workouts in the background - user won't see a loading screen
        // but will see the progress indicator
        try {
          setLoadingProgress(0);
          const allWorkouts = await getWorkoutHistory(
            email,
            password,
            (progress) => {
              setLoadingProgress(progress);
            }
          );

          // Update with potentially new data
          setWorkouts(allWorkouts);
          localStorage.setItem(
            STORAGE_KEYS.WORKOUTS,
            JSON.stringify(allWorkouts)
          );
        } catch (fetchErr) {
          console.warn(
            "Couldn't update workout data, but using cached data:",
            fetchErr
          );
          // Still using cached data, so don't show error to user
        } finally {
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
            }
          );
          setWorkouts(allWorkouts);

          // Mark user as authenticated
          setIsAuthenticated(true);

          // Save state to localStorage
          localStorage.setItem(STORAGE_KEYS.IS_AUTHENTICATED, "true");
          localStorage.setItem(
            STORAGE_KEYS.WORKOUTS,
            JSON.stringify(allWorkouts)
          );
        } catch (err) {
          console.error("Login error:", err);
          setAuthError(
            "Authentication failed. Please check your email and password."
          );
        }
      }
    } finally {
      setAuthLoading(false);
      setDataLoading(false);
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

      // We'll use the cached auth token and look only for new workouts
      // This approach doesn't require storing credentials
      const newWorkouts = await getWorkoutHistory(
        "", // Empty email triggers use of cached auth
        "", // Empty password triggers use of cached auth
        (progress) => {
          setLoadingProgress(progress);
        }
      );

      setWorkouts(newWorkouts);
      localStorage.setItem(STORAGE_KEYS.WORKOUTS, JSON.stringify(newWorkouts));

      console.log("Workout data refreshed successfully");
    } catch (error) {
      console.error("Error refreshing workout data:", error);
      setDataError(
        "Failed to refresh data. Please try again or log out and log back in."
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
            <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
              <h2 className="text-xl sm:text-2xl font-semibold">
                Your Workout Data
              </h2>
              <div className="flex items-center gap-2">
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
                    <TabsList className="grid w-full max-w-md sm:max-w-lg mx-auto grid-cols-3">
                      <TabsTrigger
                        value="dashboard"
                        className="flex items-center gap-2"
                      >
                        <LineChart className="h-4 w-4" />
                        <span>Dashboard</span>
                      </TabsTrigger>
                      <TabsTrigger
                        value="history"
                        className="flex items-center gap-2"
                      >
                        <Calendar className="h-4 w-4" />
                        <span>Workout History</span>
                      </TabsTrigger>
                      <TabsTrigger
                        value="exercises"
                        className="flex items-center gap-2"
                      >
                        <Dumbbell className="h-4 w-4" />
                        <span>Exercises</span>
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
