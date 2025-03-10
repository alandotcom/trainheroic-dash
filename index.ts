import { getExerciseHistory, getHistory, auth } from "./api";
import type { ExerciseSet, Workout } from "./api";

/**
 * Fetches comprehensive workout history for the user
 * @returns A Promise that resolves to an array of Workouts
 */
const getWorkoutHistory = async (): Promise<Workout[]> => {
  console.log("Fetching all exercises...");

  const { data } = await auth("username", "password");

  if (data === undefined) {
    throw new Error();
  }
  const sessionToken = data.session_id;
  const userId = data.id;

  // Step 1: Get all exercises the user has done
  const exercisesResponse = await getHistory(sessionToken);
  if (!exercisesResponse.data) {
    throw new Error("Failed to fetch exercise history");
  }

  const exercises = exercisesResponse.data;
  console.log(`Found ${exercises.length} exercises in history`);

  // Step 2: Create a map to store workouts by date
  const workoutsByDate: Record<string, Workout> = {};

  // Step 3: For each exercise, fetch its detailed history
  for (const exercise of exercises) {
    const exerciseId = exercise.id.toString();
    console.log(
      `Fetching history for exercise: ${exercise.title} (ID: ${exerciseId})`,
    );

    const exerciseHistoryResponse = await getExerciseHistory(
      exerciseId,
      userId,
      sessionToken,
    );

    if (!exerciseHistoryResponse.data?.history) {
      console.warn(
        `No history found for exercise ${exercise.title} (ID: ${exerciseId})`,
      );
      continue;
    }

    const exerciseHistory = exerciseHistoryResponse.data.history;
    console.log(
      `Found ${exerciseHistory.length} history entries for ${exercise.title}`,
    );

    // Step 4: Process each history entry for this exercise
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
            (set) => set && typeof set.setNumber === "number",
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

  // Step 5: Convert the map to an array and sort by date (newest first)
  return Object.values(workoutsByDate).sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
};

/**
 * Gets workouts for a specific date range
 * @param workouts Array of workouts to filter
 * @param startDate Start date in ISO format (YYYY-MM-DD)
 * @param endDate End date in ISO format (YYYY-MM-DD)
 * @returns Filtered array of workouts
 */
const getWorkoutsInDateRange = (
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
 * Calculates total volume (weight × reps) for a workout
 * @param workout The workout to calculate volume for
 * @returns Total volume in pounds
 */
const calculateWorkoutVolume = (workout: Workout): number => {
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

/**
 * Log workout details to console
 * @param workout The workout to log
 */
const logWorkoutDetails = (workout: Workout): void => {
  console.log(`\n===== WORKOUT: ${workout.date} =====`);
  console.log(`Total exercises: ${workout.exercises.length}`);
  console.log(`Total volume: ${calculateWorkoutVolume(workout)} lbs`);

  workout.exercises.forEach((exercise, i) => {
    console.log(`\n${i + 1}. ${exercise.title}`);
    console.log(`   Sets: ${exercise.sets.length}`);
    if (exercise.bestEstimated1RM) {
      console.log(`   Estimated 1RM: ${exercise.bestEstimated1RM} lbs`);
    }

    exercise.sets.forEach((set) => {
      const reps = set.rawValue1;
      const weight = set.rawValue2;
      const weightStr = weight ? `@ ${weight} lbs` : "";
      console.log(`   Set ${set.setNumber}: ${reps} reps ${weightStr}`);
    });
  });
};

/**
 * Main function to execute the workout history compilation
 */
const main = async () => {
  try {
    console.log("Starting workout history compilation...");

    // Get all workouts
    const allWorkouts = await getWorkoutHistory();
    console.log(`\nFound ${allWorkouts.length} total workouts`);

    // Get workouts from the last month
    const today = new Date();
    const lastMonth = new Date();
    lastMonth.setMonth(today.getMonth() - 1);

    const startDate = lastMonth.toISOString().split("T")[0];
    const endDate = today.toISOString().split("T")[0];

    // Make sure we have valid date strings
    if (startDate && endDate) {
      console.log(`\nFiltering workouts between ${startDate} and ${endDate}`);
      const recentWorkouts = getWorkoutsInDateRange(
        allWorkouts,
        startDate,
        endDate,
      );
      console.log(`Found ${recentWorkouts.length} workouts in the last month`);
    }

    // Log details of the 3 most recent workouts
    const workoutsToLog = allWorkouts.slice(0, 3);
    console.log("\n===== MOST RECENT WORKOUTS =====");
    workoutsToLog.forEach((workout) => {
      logWorkoutDetails(workout);
    });
  } catch (error) {
    console.error("Error compiling workout history:", error);
  }
};

// Run the main function
main();
