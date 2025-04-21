import type { ExerciseSet, Workout, Exercise } from "../api";

// Cache structure
interface CacheData {
  timestamp: number;
  data: any;
}

// Auth cache expiration time (24 hours in milliseconds)
// We no longer expire workout data as past workouts don't change

// LocalStorage cache keys
const CACHE_KEYS = {
  AUTH: "trainheroic_auth_cache",
  EXERCISES: "trainheroic_exercises_cache",
  EXERCISE_HISTORY_PREFIX: "trainheroic_exercise_history_",
  WORKOUTS: "trainheroic_workouts",
};

/**
 * Saves data to localStorage
 * @param key The localStorage key
 * @param data The data to store
 */
const saveToCache = (key: string, data: any): void => {
  try {
    const cacheData: CacheData = {
      timestamp: Date.now(),
      data,
    };
    localStorage.setItem(key, JSON.stringify(cacheData));
  } catch (error) {
    console.warn("Failed to save to localStorage:", error);
  }
};

/**
 * Retrieves data from localStorage
 * @param key The localStorage key
 * @returns The cached data or null if not found
 */
const getFromCache = <T>(
  key: string,
): { data: T; timestamp: number } | null => {
  try {
    const cached = localStorage.getItem(key);
    if (!cached) return null;

    const cacheData = JSON.parse(cached) as CacheData;

    // For workout data, we don't expire the cache since past workouts don't change
    return cacheData as { data: T; timestamp: number };
  } catch (error) {
    console.warn("Failed to retrieve from localStorage:", error);
    return null;
  }
};

/**
 * Fetches data with localStorage caching
 * @param cacheKey The key to identify this specific data
 * @param cacheName The cache category (auth, exercises, or exerciseHistory)
 * @param fetchFn The function to fetch the data if cache is invalid
 * @returns The cached or freshly fetched data
 */
const fetchWithCache = async <T>(
  cacheKey: string,
  cacheName: "auth" | "exercises" | "exerciseHistory",
  fetchFn: () => Promise<T>,
): Promise<T> => {
  // Determine the localStorage key based on cache name
  let storageKey: string;
  if (cacheName === "auth") {
    storageKey = CACHE_KEYS.AUTH;
  } else if (cacheName === "exercises") {
    storageKey = CACHE_KEYS.EXERCISES;
  } else {
    // For exercise history, append the exercise ID
    storageKey = `${CACHE_KEYS.EXERCISE_HISTORY_PREFIX}${cacheKey}`;
  }

  // Try to get from cache first
  const cached = getFromCache<T>(storageKey);

  // If we have valid cached data, use it
  if (cached) {
    console.log(`Using cached data for ${cacheName} ${cacheKey}`);
    return cached.data;
  }

  // Cache miss or expired, fetch fresh data
  console.log(`Fetching fresh data for ${cacheName} ${cacheKey}`);
  const data = await fetchFn();

  // Update cache
  saveToCache(storageKey, data);

  return data;
};

/**
 * Clears all TrainHeroic caches and data from localStorage
 * This resets the app to a fresh state
 */
export const clearAllCaches = () => {
  try {
    // Clear all TrainHeroic related data
    localStorage.removeItem(CACHE_KEYS.AUTH);
    localStorage.removeItem(CACHE_KEYS.EXERCISES);
    localStorage.removeItem(CACHE_KEYS.WORKOUTS);
    localStorage.removeItem("trainheroic_is_authenticated");

    // Clear all exercise history items by iterating through localStorage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (
        key &&
        key &&
        (key.startsWith(CACHE_KEYS.EXERCISE_HISTORY_PREFIX) ||
          key.startsWith("trainheroic_"))
      ) {
        localStorage.removeItem(key);
      }
    }

    console.log("All TrainHeroic data cleared successfully");
  } catch (error) {
    console.error("Error clearing data:", error);
  }
};

/**
 * Fetches comprehensive workout history for the user
 * @param email User's email address
 * @param password User's password
 * @param onProgress Callback for reporting progress (0-100)
 * @returns A Promise that resolves to an array of Workouts
 */
export const getWorkoutHistory = async (
  email: string,
  password: string,
  onProgress?: (progress: number) => void,
): Promise<Workout[]> => {
  console.log("Authenticating and fetching workout history...");

  // Report initial progress
  onProgress?.(0);

  // Step 1: Authenticate with provided credentials (with caching)
  const authData = await fetchWithCache<any>(email, "auth", async () => {
    const { auth } = await import("../api");
    const { data } = await auth(email, password);
    if (data === undefined) {
      throw new Error("Authentication failed");
    }
    return data;
  });

  const sessionToken = authData.session_id;
  const userId = authData.id;

  // Report progress after auth
  onProgress?.(10);

  // First load all existing cached workouts
  let existingWorkouts: Workout[] = [];
  try {
    const workoutsCache = localStorage.getItem(CACHE_KEYS.WORKOUTS);
    if (workoutsCache) {
      existingWorkouts = JSON.parse(workoutsCache);
      console.log(`Found ${existingWorkouts.length} cached workouts`);
    }
  } catch (error) {
    console.warn("Failed to retrieve cached workouts:", error);
  }

  // Find the most recent workout date we have cached
  let mostRecentDate = "1970-01-01";
  if (existingWorkouts.length > 0) {
    // Find the most recent date (workouts are already sorted newest first)
    if (existingWorkouts[0]) {
      mostRecentDate = existingWorkouts[0].date;
    }
    console.log(`Most recent cached workout date: ${mostRecentDate}`);
  }

  // Step 2: Get the exercise list which we need even for the optimized approach
  let exercises = await fetchWithCache<Exercise[]>(
    "exercises-list",
    "exercises",
    async () => {
      const { getHistory } = await import("../api");
      const exercisesResponse = await getHistory(sessionToken);
      if (!exercisesResponse.data) {
        throw new Error("Failed to fetch exercise history");
      }
      return exercisesResponse.data;
    },
  );

  console.log(`Found ${exercises.length} exercises in history`);

  // Report progress after fetching exercise list
  onProgress?.(20);

  // Create a map to store workouts by date
  const workoutsByDate: Record<string, Workout> = {};

  // Pre-populate with existing workouts
  existingWorkouts.forEach((workout) => {
    workoutsByDate[workout.date] = workout;
  });

  // Maximum number of concurrent requests
  const MAX_CONCURRENT_REQUESTS = 5;

  // Check if we have existing workouts and need to look for updates
  if (existingWorkouts.length > 0) {
    try {
      onProgress?.(30);

      // Get today's date in YYYY-MM-DD format
      const today = new Date().toISOString().split("T")[0];

      // Check for workouts between the most recent cached date and today
      console.log(
        `Checking for new workouts between ${mostRecentDate} and ${today}`,
      );

      // Default to a very old date if we don't have a valid date string
      const defaultStartDate = "1970-01-01";

      // Force the today value to be a string as well
      const todayString: string = today || "2099-12-31";

      // Use a fallback date for mostRecentDate if it's not a valid string
      // This is a workaround for TypeScript's type checking
      const startDateString: string =
        typeof mostRecentDate === "string" && mostRecentDate
          ? mostRecentDate
          : defaultStartDate;

      // Now the API call with guaranteed string parameters
      const { getRecentWorkouts } = await import("../api");
      const recentWorkoutsResponse = await getRecentWorkouts(
        sessionToken,
        startDateString, // Guaranteed to be a string now
        todayString, // Guaranteed to be a string now
      );

      // If no recent workouts, we can just return the existing data
      if (
        !recentWorkoutsResponse.data ||
        recentWorkoutsResponse.data.length === 0
      ) {
        console.log("No new workouts found, using cached data");
        onProgress?.(100); // Skip to 100% progress
        return existingWorkouts;
      }

      // We have recent workouts - extract which exercises we need to fetch
      const recentWorkouts = recentWorkoutsResponse.data;
      console.log(
        `Found ${recentWorkouts.length} recent workouts, checking for new ones`,
      );

      // Filter the recent workouts to find truly new ones (that aren't in our cache)
      const existingWorkoutIds = new Set(
        existingWorkouts
          .filter((w) => w.programWorkoutId)
          .map((w) => w.programWorkoutId),
      );

      const newWorkouts = recentWorkouts.filter(
        (w) => !existingWorkoutIds.has(w.id),
      );

      // Even if no new workouts found, we'll refresh the exercise list
      // to detect any new exercises added to the account
      console.log(
        "Refreshing exercise list to check for newly added exercises",
      );

      // Clear the exercise list cache to force a refresh
      localStorage.removeItem(CACHE_KEYS.EXERCISES);

      // Re-fetch the exercises list to get any new exercises
      exercises = await fetchWithCache<Exercise[]>(
        "exercises-list",
        "exercises",
        async () => {
          console.log("Force fetching fresh exercise list");
          const { getHistory } = await import("../api");
          const exercisesResponse = await getHistory(sessionToken);
          if (!exercisesResponse.data) {
            throw new Error("Failed to fetch exercise history");
          }
          return exercisesResponse.data;
        },
      );

      console.log(`Got ${exercises.length} exercises in updated list`);

      // If truly no new workouts, we can use the cached workout data
      // but still check recent workouts for updates
      if (newWorkouts.length === 0) {
        console.log(
          "No new workouts found, but checking recent workouts for exercise updates",
        );
      }

      console.log(`Found ${newWorkouts.length} new workouts`);

      // We need to check for new exercises in both new workouts and recent workouts

      // Check for recent workouts that might have updates (within the last 3 days)
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      const threeDaysAgoString = threeDaysAgo.toISOString().split("T")[0];

      // Get all recent workouts that might have updates
      const recentWorkoutsToCheck = recentWorkouts.filter((w) => {
        return w.date && threeDaysAgoString && w.date >= threeDaysAgoString;
      });

      console.log(
        `Found ${recentWorkoutsToCheck.length} recent workouts within the last 3 days to check for updates`,
      );

      // First, look up which exercises were done in these workouts
      // We'll need to filter our exercise list to only include these

      // Get the exercises we need to fetch history for
      {
        // Create a map to track which exercises we need to fetch
        const exercisesToFetch = new Map<string, Exercise>();

        // Add all exercises from both new workouts and recent ones that might have updates
        const workoutsToProcess = [...newWorkouts, ...recentWorkoutsToCheck];

        // Go through workouts and mark the exercises used
        for (const workout of workoutsToProcess) {
          // Use type checking to safely access exercise stats
          const workoutAny = workout as any;
          if (
            workoutAny &&
            workoutAny.exercise_stats &&
            Array.isArray(workoutAny.exercise_stats)
          ) {
            for (const stat of workoutAny.exercise_stats) {
              if (stat && stat.exercise_id) {
                // Find the full exercise info from our exercise list
                const exerciseInfo = exercises.find(
                  (e) => String(e.id) === String(stat.exercise_id),
                );

                if (exerciseInfo) {
                  exercisesToFetch.set(String(exerciseInfo.id), exerciseInfo);
                }
              }
            }
          }
        }

        // If we identified specific exercises, use only those
        if (exercisesToFetch.size > 0) {
          console.log(
            `Fetching history for ${exercisesToFetch.size} exercises used in new or recent workouts`,
          );
          // Create a new array instead of trying to assign to the constant variable
          const exercisesToProcess = Array.from(exercisesToFetch.values());

          // Use a let variable to hold the new array
          let exercisesToUse = exercises;
          exercisesToUse = exercisesToProcess;
          exercises = exercisesToUse;
        }
        // Otherwise, we'll have to fetch all exercises (less efficient)
      }

      // Now we'll proceed with fetching just the exercises we need
      console.log(`Fetching history for ${exercises.length} exercises`);
    } catch (error) {
      console.warn("Error checking for new workouts:", error);
      // Continue with full exercise fetch if we can't determine which ones to fetch
    }
  }

  // Process an exercise and return its history
  const processExercise = async (exercise: Exercise, index: number) => {
    if (!exercise) return null;

    const exerciseId = String(exercise.id);
    console.log(
      `Fetching history for exercise: ${exercise.title} (ID: ${exerciseId})`,
    );

    try {
      // Get the exercise history to check for new entries
      const { getExerciseHistory } = await import("../api");
      const exerciseHistoryResponse = await getExerciseHistory(
        exerciseId,
        userId,
        sessionToken,
      );

      if (!exerciseHistoryResponse.data?.history) {
        console.warn(
          `No history found for exercise ${exercise.title} (ID: ${exerciseId})`,
        );
        return { exercise, exerciseHistory: [] };
      }

      const exerciseHistory = exerciseHistoryResponse.data.history;

      // Cache the fresh exercise history for future use
      saveToCache(
        `${CACHE_KEYS.EXERCISE_HISTORY_PREFIX}${exerciseId}`,
        exerciseHistory,
      );

      console.log(
        `Found ${exerciseHistory.length} history entries for ${exercise.title}`,
      );

      // Report progress during exercise history fetching
      const progressPercent =
        40 + Math.floor((60 * (index + 1)) / exercises.length);
      onProgress?.(progressPercent);

      return { exercise, exerciseHistory };
    } catch (error) {
      console.error(`Error fetching history for ${exercise.title}:`, error);

      // On error, try to use cached data if available
      try {
        const cachedHistory = getFromCache<any[]>(
          `${CACHE_KEYS.EXERCISE_HISTORY_PREFIX}${exerciseId}`,
        );

        if (cachedHistory) {
          console.log(
            `Using cached history for ${exercise.title} due to fetch error`,
          );

          // Report progress even when using cached data
          const progressPercent =
            40 + Math.floor((60 * (index + 1)) / exercises.length);
          onProgress?.(progressPercent);

          return { exercise, exerciseHistory: cachedHistory.data };
        }
      } catch (cacheError) {
        console.warn(
          `Cache retrieval error for ${exercise.title}:`,
          cacheError,
        );
      }

      // Report progress even on error
      const progressPercent =
        40 + Math.floor((60 * (index + 1)) / exercises.length);
      onProgress?.(progressPercent);

      return { exercise, exerciseHistory: [] };
    }
  };

  // Process exercises in batches to limit concurrent requests
  const processExercisesInBatches = async () => {
    let results = [];

    for (let i = 0; i < exercises.length; i += MAX_CONCURRENT_REQUESTS) {
      // Create a batch of exercises to process concurrently
      const batch = exercises
        .slice(i, i + MAX_CONCURRENT_REQUESTS)
        .map((exercise, batchIndex) =>
          processExercise(exercise, i + batchIndex),
        );

      // Process this batch concurrently
      const batchResults = await Promise.all(batch);
      results.push(...batchResults.filter(Boolean));
    }

    return results;
  };

  // Process only the needed exercises and populate the workoutsByDate map
  const exerciseResults = await processExercisesInBatches();

  // Process each history entry for all exercises
  for (const result of exerciseResults) {
    if (!result) continue;
    const { exercise, exerciseHistory } = result;

    for (const historyEntry of exerciseHistory) {
      const date = historyEntry.dateCompleted;

      if (typeof date === "string") {
        // Create workout entry for this date if it doesn't exist
        if (!workoutsByDate[date]) {
          workoutsByDate[date] = {
            date,
            programWorkoutId: historyEntry.programWorkoutId,
            exercises: [],
          };
        }

        // Add this exercise to the workout if it's not already there
        if (historyEntry.sets && Array.isArray(historyEntry.sets)) {
          // Ensure we have valid set data
          const validSets = historyEntry.sets.filter(
            (set: any) => set && typeof set.setNumber === "number",
          ) as ExerciseSet[];

          const workout = workoutsByDate[date];
          if (workout && exercise) {
            // Check if this exercise is already in the workout
            const existingExerciseIndex = workout.exercises.findIndex(
              (e) => e.id === exercise.id,
            );

            if (existingExerciseIndex === -1) {
              // Add new exercise
              workout.exercises.push({
                id: exercise.id,
                title: exercise.title,
                sets: validSets,
                bestEstimated1RM: historyEntry.bestEstimated1RM,
              });
            } else {
              // For already existing exercises in cached workouts,
              // we keep the existing data as past workouts don't change
            }
          }
        }
      }
    }
  }

  // Convert the map to an array, filter out workouts with no exercises, and sort by date (newest first)
  const allWorkouts = Object.values(workoutsByDate)
    .filter(workout => workout.exercises && workout.exercises.length > 0)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Save all workouts to localStorage for fast loading next time
  try {
    localStorage.setItem(CACHE_KEYS.WORKOUTS, JSON.stringify(allWorkouts));
  } catch (error) {
    console.warn("Failed to save workouts to localStorage:", error);
  }

  return allWorkouts;
};

/**
 * Gets workouts for a specific date range
 * @param workouts Array of workouts to filter
 * @param startDate Start date in ISO format (YYYY-MM-DD)
 * @param endDate End date in ISO format (YYYY-MM-DD)
 * @returns Filtered array of workouts
 */
export const getWorkoutsInDateRange = (
  workouts: Workout[],
  startDate: string,
  endDate: string,
): Workout[] => {
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();

  return workouts.filter((workout) => {
    const workoutDate = new Date(workout.date).getTime();
    return workoutDate >= start && workoutDate <= end;
  });
};

/**
 * Fetch only new workouts since the last update
 * @param sessionToken The authentication session token
 * @param mostRecentWorkoutDate The date of the most recent workout in cache
 * @param onProgress Progress callback function
 * @returns Array of new workouts
 */
export const fetchNewWorkouts = async (
  sessionToken: string,
  mostRecentWorkoutDate: string | undefined,
  onProgress?: (progress: number) => void
): Promise<Workout[]> => {
  if (!sessionToken) {
    console.error("No session token provided for fetchNewWorkouts");
    return [];
  }

  onProgress?.(10);
  
  // Get today's date in YYYY-MM-DD format
  const today = new Date().toISOString().split("T")[0];
  
  console.log(`Fetching workouts from ${mostRecentWorkoutDate} to ${today}`);
  
  try {
    // Check for workouts between the most recent date and today
    // Import the API function to get proper type checking
    const { getRecentWorkouts } = await import("../api");
    
    // Ensure we have valid date strings
    const validStartDate = mostRecentWorkoutDate || "1970-01-01";
    const validEndDate = today || new Date().toISOString().split("T")[0];
    
    const recentWorkoutsResponse = await getRecentWorkouts(
      sessionToken,
      String(validStartDate),
      String(validEndDate)
    );
    
    onProgress?.(30);

    if (!recentWorkoutsResponse.data || recentWorkoutsResponse.data.length === 0) {
      console.log("No new workouts found");
      onProgress?.(100);
      return [];
    }
    
    // Process the new workouts data
    const newWorkouts = recentWorkoutsResponse.data;
    console.log(`Found ${newWorkouts.length} recent workouts to process`);
    
    // Fetch updated exercise list to make sure we have all exercises
    const { getHistory } = await import("../api");
    const exercisesResponse = await getHistory(sessionToken);
    
    if (!exercisesResponse.data) {
      console.warn("Failed to fetch updated exercise list");
      onProgress?.(100);
      return [];
    }
    
    const exercises = exercisesResponse.data;
    onProgress?.(50);
    
    // Map to track workouts by date
    const workoutsByDate: Record<string, Workout> = {};
    
    // Process workout data
    await processWorkoutsFromExercises(
      newWorkouts, 
      exercises, 
      sessionToken,
      workoutsByDate,
      onProgress
    );
    
    // Convert to array and sort by date
    // Also filter out any workouts with no exercises to avoid empty workout entries
    const sortedWorkouts = Object.values(workoutsByDate)
      .filter(workout => workout.exercises && workout.exercises.length > 0)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    onProgress?.(100);
    return sortedWorkouts;
  } catch (error) {
    console.error("Error fetching new workouts:", error);
    onProgress?.(100);
    return [];
  }
};

/**
 * Helper function to process workout data from exercises
 * @param workouts Raw workout data from API
 * @param exercises List of exercises
 * @param sessionToken Auth session token
 * @param workoutsByDate Map to store processed workouts by date
 * @param onProgress Progress callback function
 */
const processWorkoutsFromExercises = async (
  workouts: any[],
  exercises: Exercise[],
  sessionToken: string,
  workoutsByDate: Record<string, Workout>,
  onProgress?: (progress: number) => void
): Promise<void> => {
  if (!workouts.length || !exercises.length) return;
  
  // Find exercises mentioned in the workout data
  const exercisesToFetch = new Map<string, Exercise>();
  
  // Extract exercise IDs from workout data
  for (const workout of workouts) {
    if (workout && workout.exercise_stats && Array.isArray(workout.exercise_stats)) {
      for (const stat of workout.exercise_stats) {
        if (stat && stat.exercise_id) {
          // Find the full exercise info
          const exerciseInfo = exercises.find(
            (e) => String(e.id) === String(stat.exercise_id)
          );
          
          if (exerciseInfo) {
            exercisesToFetch.set(String(exerciseInfo.id), exerciseInfo);
          }
        }
      }
    }
    
    // Only pre-populate workout entries if the workout has exercise_stats
    if (workout.date && workout.exercise_stats && workout.exercise_stats.length > 0) {
      // Create workout entry only if it doesn't exist yet
      if (!workoutsByDate[workout.date]) {
        workoutsByDate[workout.date] = {
          date: workout.date,
          programWorkoutId: workout.id,
          exercises: [],
        };
      }
    }
  }
  
  // Maximum concurrent requests
  const MAX_CONCURRENT_REQUESTS = 5;
  
  // Convert map to array of exercises to process
  const exercisesToProcess = Array.from(exercisesToFetch.values());
  console.log(`Processing ${exercisesToProcess.length} exercises for new workouts`);
  
  // Process exercises in batches
  for (let i = 0; i < exercisesToProcess.length; i += MAX_CONCURRENT_REQUESTS) {
    const batch = exercisesToProcess
      .slice(i, i + MAX_CONCURRENT_REQUESTS)
      .map(async (exercise) => {
        if (!exercise || !exercise.id) return null;
        
        const exerciseId = String(exercise.id);
        try {
          // Fetch detailed exercise history
          const { getExerciseHistory } = await import("../api");
          const exerciseHistoryResponse = await getExerciseHistory(
            exerciseId,
            0, // userId parameter required but will be ignored by the API when session token is provided
            sessionToken
          );
          
          if (!exerciseHistoryResponse.data?.history) return null;
          
          const exerciseHistory = exerciseHistoryResponse.data.history;
          
          // Cache the exercise history
          const cacheKey = `trainheroic_exercise_history_${exerciseId}`;
          localStorage.setItem(cacheKey, JSON.stringify({
            timestamp: Date.now(),
            data: exerciseHistory
          }));
          
          return { exercise, exerciseHistory };
        } catch (error) {
          console.error(`Error fetching history for exercise ${exercise.title}:`, error);
          return null;
        }
      });
    
    // Wait for batch to complete
    const batchResults = await Promise.all(batch);
    
    // Update progress
    const progressPercent = 50 + Math.floor((40 * (i + MAX_CONCURRENT_REQUESTS)) / Math.max(exercisesToProcess.length, 1));
    onProgress?.(progressPercent);
    
    // Process results to populate workoutsByDate
    for (const result of batchResults) {
      if (!result) continue;
      
      const { exercise, exerciseHistory } = result;
      
      for (const historyEntry of exerciseHistory) {
        const date = historyEntry.dateCompleted;
        
        if (typeof date === "string" && workoutsByDate[date]) {
          // Add this exercise to the workout if it's not already there
          if (historyEntry.sets && Array.isArray(historyEntry.sets)) {
            const validSets = historyEntry.sets.filter(
              (set: any) => set && typeof set.setNumber === "number"
            ) as ExerciseSet[];
            
            const workout = workoutsByDate[date];
            if (workout && exercise) {
              // Check if this exercise is already in the workout
              const existingExerciseIndex = workout.exercises.findIndex(
                (e) => e.id === exercise.id
              );
              
              if (existingExerciseIndex === -1) {
                // Add new exercise
                workout.exercises.push({
                  id: exercise.id,
                  title: exercise.title,
                  sets: validSets,
                  bestEstimated1RM: historyEntry.bestEstimated1RM,
                });
              }
            }
          }
        }
      }
    }
  }
};

/**
 * Calculates total volume (weight × reps) for a workout
 * @param workout The workout to calculate volume for
 * @returns Total volume in pounds
 */
export const calculateWorkoutVolume = (workout: Workout): number => {
  let totalVolume = 0;

  for (const exercise of workout.exercises) {
    for (const set of exercise.sets) {
      // Each set has rawValue1 (reps) and rawValue2 (weight)
      if (set.rawValue1 && set.rawValue2) {
        totalVolume += set.rawValue1 * set.rawValue2;
      }
    }
  }

  return totalVolume;
};
