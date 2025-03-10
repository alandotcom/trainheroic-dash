import React, { useState, useEffect } from "react";
import type { Workout } from "../api";
import WorkoutTable from "./components/WorkoutTable";
import LoginForm from "./components/LoginForm";
import DashboardOverview from "./components/DashboardOverview";
import { getWorkoutHistory, clearAllCaches } from "./workoutUtils";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { RefreshCw, LogOut } from "lucide-react";

// LocalStorage keys for authentication persistence
const STORAGE_KEYS = {
  IS_AUTHENTICATED: 'trainheroic_is_authenticated',
  WORKOUTS: 'trainheroic_workouts',
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
      if (savedAuth === 'true') {
        setIsAuthenticated(true);
      }

      // Restore workouts data if it exists
      const savedWorkouts = localStorage.getItem(STORAGE_KEYS.WORKOUTS);
      if (savedWorkouts) {
        setWorkouts(JSON.parse(savedWorkouts));
      }
    } catch (error) {
      console.error('Error restoring state from localStorage:', error);
      // Clear potentially corrupted data
      Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
    }
  }, []);

  // Handle user login
  const handleLogin = async (email: string, password: string) => {
    try {
      setAuthLoading(true);
      setAuthError(null);
      setLoadingProgress(0);

      // Fetch workout data using credentials with progress updates
      setDataLoading(true);
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
      localStorage.setItem(STORAGE_KEYS.IS_AUTHENTICATED, 'true');
      localStorage.setItem(STORAGE_KEYS.WORKOUTS, JSON.stringify(allWorkouts));
    } catch (err) {
      console.error("Login error:", err);
      setAuthError(
        "Authentication failed. Please check your email and password."
      );
    } finally {
      setAuthLoading(false);
      setDataLoading(false);
      setLoadingProgress(0);
    }
  };

  // Clear cached data
  const handleClearCache = () => {
    clearAllCaches();
    alert("Cache cleared successfully");
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
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">
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
              <div className="mt-8 max-w-md mx-auto space-y-2">
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
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-semibold">
                Your Workout Data
              </h2>
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleClearCache}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  title="Clear cached data to fetch fresh information"
                >
                  <RefreshCw className="h-4 w-4" />
                  Refresh Data
                </Button>
                <Button
                  onClick={handleLogout}
                  variant="destructive"
                  size="sm" 
                  className="gap-2"
                  title="Sign out of your account"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </Button>
              </div>
            </div>

            {dataLoading ? (
              <div className="flex flex-col justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mb-4"></div>
                <Progress value={loadingProgress} className="w-full max-w-md mb-2" />
                <div className="text-sm text-muted-foreground">
                  Loading: {loadingProgress}% complete
                </div>
              </div>
            ) : dataError ? (
              <div className="bg-destructive/10 text-destructive p-4 rounded-md">
                {dataError}
              </div>
            ) : (
              <Tabs defaultValue="dashboard" className="space-y-6">
                <TabsList className="grid w-full max-w-md mx-auto grid-cols-2">
                  <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
                  <TabsTrigger value="history">Workout History</TabsTrigger>
                </TabsList>
                
                <TabsContent value="dashboard" className="mt-6">
                  <DashboardOverview workouts={workouts} />
                </TabsContent>
                
                <TabsContent value="history" className="mt-6">
                  <WorkoutTable workouts={workouts} />
                </TabsContent>
              </Tabs>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
