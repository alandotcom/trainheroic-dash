import { getExerciseHistory, getHistory, auth } from "../api";
import type { ExerciseSet, Workout, Exercise } from "../api";

// Cache structure
interface CacheData {
  timestamp: number;
  data: any;
}

// Cache expiration time (24 hours in milliseconds)
const CACHE_EXPIRATION = 24 * 60 * 60 * 1000;

// LocalStorage cache keys
const CACHE_KEYS = {
  AUTH: 'trainheroic_auth_cache',
  EXERCISES: 'trainheroic_exercises_cache',
  EXERCISE_HISTORY_PREFIX: 'trainheroic_exercise_history_',
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
    console.warn('Failed to save to localStorage:', error);
  }
};

/**
 * Retrieves data from localStorage
 * @param key The localStorage key
 * @returns The cached data or null if not found/expired
 */
const getFromCache = <T>(key: string): { data: T; timestamp: number } | null => {
  try {
    const cached = localStorage.getItem(key);
    if (!cached) return null;
    
    const cacheData = JSON.parse(cached) as CacheData;
    const now = Date.now();
    
    // Check if cache is expired
    if (now - cacheData.timestamp > CACHE_EXPIRATION) {
      localStorage.removeItem(key);
      return null;
    }
    
    return cacheData as { data: T; timestamp: number };
  } catch (error) {
    console.warn('Failed to retrieve from localStorage:', error);
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
  cacheName: 'auth' | 'exercises' | 'exerciseHistory',
  fetchFn: () => Promise<T>
): Promise<T> => {
  // Determine the localStorage key based on cache name
  let storageKey: string;
  if (cacheName === 'auth') {
    storageKey = CACHE_KEYS.AUTH;
  } else if (cacheName === 'exercises') {
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
 * Clears all TrainHeroic caches from localStorage
 */
export const clearAllCaches = () => {
  try {
    // Clear specific cache items
    localStorage.removeItem(CACHE_KEYS.AUTH);
    localStorage.removeItem(CACHE_KEYS.EXERCISES);
    
    // Clear all exercise history items by iterating through localStorage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(CACHE_KEYS.EXERCISE_HISTORY_PREFIX)) {
        localStorage.removeItem(key);
      }
    }
    
    console.log('All TrainHeroic caches cleared successfully');
  } catch (error) {
    console.error('Error clearing caches:', error);
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
  onProgress?: (progress: number) => void
): Promise<Workout[]> => {
  console.log("Authenticating and fetching workout history...");
  
  // Report initial progress
  onProgress?.(0);

  // Step 1: Authenticate with provided credentials (with caching)
  const authData = await fetchWithCache<any>(
    email,
    'auth',
    async () => {
      const { data } = await auth(email, password);
      if (data === undefined) {
        throw new Error("Authentication failed");
      }
      return data;
    }
  );
  
  const sessionToken = authData.session_id;
  const userId = authData.id;
  
  // Report progress after auth
  onProgress?.(10);

  // Step 2: Get all exercises the user has done (with caching)
  const exercises = await fetchWithCache<Exercise[]>(
    'exercises-list',
    'exercises',
    async () => {
      const exercisesResponse = await getHistory(sessionToken);
      if (!exercisesResponse.data) {
        throw new Error("Failed to fetch exercise history");
      }
      return exercisesResponse.data;
    }
  );
  
  console.log(`Found ${exercises.length} exercises in history`);
  
  // Report progress after fetching exercise list
  onProgress?.(20);

  // Step 3: Create a map to store workouts by date
  const workoutsByDate: Record<string, Workout> = {};

  // Step 4: Fetch exercise history concurrently with rate limiting
  // Maximum number of concurrent requests
  const MAX_CONCURRENT_REQUESTS = 5;
  
  // Process an exercise and return its history
  const processExercise = async (exercise: Exercise, index: number) => {
    if (!exercise) return null;
    
    const exerciseId = String(exercise.id);
    console.log(
      `Fetching history for exercise: ${exercise.title} (ID: ${exerciseId})`
    );

    try {
      // Fetch exercise history with caching
      const exerciseHistory = await fetchWithCache<any[]>(
        exerciseId,
        'exerciseHistory',
        async () => {
          const exerciseHistoryResponse = await getExerciseHistory(
            exerciseId,
            userId,
            sessionToken
          );
          
          if (!exerciseHistoryResponse.data?.history) {
            console.warn(
              `No history found for exercise ${exercise.title} (ID: ${exerciseId})`
            );
            return [];
          }
          
          return exerciseHistoryResponse.data.history;
        }
      );

      console.log(
        `Found ${exerciseHistory.length} history entries for ${exercise.title}`
      );
      
      // Report progress during exercise history fetching
      const progressPercent = 20 + Math.floor(80 * (index + 1) / exercises.length);
      onProgress?.(progressPercent);

      return { exercise, exerciseHistory };
    } catch (error) {
      console.error(`Error fetching history for ${exercise.title}:`, error);
      
      // Report progress even on error
      const progressPercent = 20 + Math.floor(80 * (index + 1) / exercises.length);
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
          processExercise(exercise, i + batchIndex)
        );
      
      // Process this batch concurrently
      const batchResults = await Promise.all(batch);
      results.push(...batchResults.filter(Boolean));
    }
    
    return results;
  };
  
  // Process all exercises and populate the workoutsByDate map
  const exerciseResults = await processExercisesInBatches();
  
  // Step 5: Process each history entry for all exercises
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

        // Add this exercise to the workout
        if (historyEntry.sets && Array.isArray(historyEntry.sets)) {
          // Ensure we have valid set data
          const validSets = historyEntry.sets.filter(
            (set: any) => set && typeof set.setNumber === "number"
          ) as ExerciseSet[];

          const workout = workoutsByDate[date];
          if (workout && exercise) {
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

  // Step 6: Convert the map to an array and sort by date (newest first)
  return Object.values(workoutsByDate).sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
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
  endDate: string
): Workout[] => {
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();

  return workouts.filter((workout) => {
    const workoutDate = new Date(workout.date).getTime();
    return workoutDate >= start && workoutDate <= end;
  });
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
