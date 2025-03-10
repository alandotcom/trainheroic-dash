import type { paths } from "./train-heroic-schema";
import createClient from "openapi-fetch";
import type { Middleware } from "openapi-fetch";
import type { IterableElement, PickDeep, RequiredDeep } from "type-fest";

// Constants
// Not required for anything but just keeping here. This is the Deuce GPP team ID
// const TEAM_ID = 594128;

// Initialize the TrainHeroic API client
const client = createClient<paths>({
  baseUrl: "https://api.trainheroic.com",
  headers: {
    "content-type": "application/json",
    // "session-token": SESSION_TOKEN,
  },
});

const makeDefaultOptions = (sessionToken: string) => ({
  headers: {
    "session-token": sessionToken,
  },
});

// Client Middleware to handle errors

const ErrorMiddleware: Middleware = {
  async onRequest({ request, options }) {
    console.debug(request);
    return request;
  },
  async onResponse({ request, response, options }) {
    const { status } = response;

    if (status >= 500) {
      throw new Error(
        `Server Error: ${response.statusText} ${response.status}`,
      );
    }

    if (status >= 400) {
      throw new Error(
        `Client Error: ${response.statusText} ${response.status}`,
      );
    }
  },
  async onError({ error }) {
    console.error("Fetch Error", error);
    return new Error(`Fetch Error: ${(error as Error).name}`, { cause: error });
  },
};

client.use(ErrorMiddleware);

// Auth
// Get session token and user ID

export const auth = (email: string, password: string) =>
  client.POST("/auth", { body: { email, password } });

export type AuthResponse = RequiredDeep<
  Awaited<ReturnType<typeof auth>>
>["data"];

/**
 * @example [
  {
    "id": 1659830,
    "userId": 44340,
    "title": "1 1/4 BARBELL BACK SQUAT",
    "logo": "https://static.trainheroic.com/logos/logo5554e2bec5d1c_thumb.png",
    "hasVideo": false,
    "videoUrl": "",
    "isCircuit": false,
    "instructions": "",
    "prescription": "Reps",
    "param1Type": 3,
    "param2Type": null
  },
  {
    "id": 1677442,
    "userId": 44340,
    "title": "1 1/4 DB Bench Press",
    "logo": "https://static.trainheroic.com/logos/logo5554e2bec5d1c_thumb.png",
    "hasVideo": false,
    "videoUrl": "",
    "isCircuit": false,
    "instructions": "",
    "prescription": "Reps @ Weight (lb)",
    "param1Type": 3,
    "param2Type": 1
  }]
 */
export const getHistory = (sessionToken: string) =>
  client.GET("/v5/users/exercises/history", makeDefaultOptions(sessionToken));
export type Exercise = IterableElement<
  Awaited<ReturnType<typeof getHistory>>["data"]
>;

/**
 *
 * @example
 * {
  "liftPRs": [
    {
      "weight": 315,
      "savedWorkoutSetExerciseId": 1996293484,
      "setNumber": 5,
      "dateCompleted": "2024-12-19",
      "reps": 1,
      "units": " lb",
      "isMetric": false,
      "description": "1 Rep Max"
    },
    {
      "weight": 275,
      "savedWorkoutSetExerciseId": 1986595561,
      "setNumber": 3,
      "dateCompleted": "2024-12-12",
      "reps": 2,
      "units": " lb",
      "isMetric": false,
      "description": "2 Rep Max"
    },
    {
      "weight": 295,
      "savedWorkoutSetExerciseId": 1975439979,
      "setNumber": 3,
      "dateCompleted": "2024-11-27",
      "reps": 3,
      "units": " lb",
      "isMetric": false,
      "description": "3 Rep Max"
    },
    {
      "weight": 265,
      "savedWorkoutSetExerciseId": 2096820679,
      "setNumber": 3,
      "dateCompleted": "2025-03-04",
      "reps": 5,
      "units": " lb",
      "isMetric": false,
      "description": "5 Rep Max"
    },
    {
      "weight": 205,
      "savedWorkoutSetExerciseId": 1499390916,
      "setNumber": 4,
      "dateCompleted": "2023-10-16",
      "reps": 7,
      "units": " lb",
      "isMetric": false,
      "description": "7 Rep Max"
    }
  ],
  "singleParamPRs": [],
  "history": [
    {
      "dateCompleted": "2025-03-04",
      "notes": null,
      "isLift": true,
      "param1Type": 3,
      "param2Type": 1,
      "savedWorkoutSetExerciseId": 2096820679,
      "teamId": 594128,
      "programWorkoutId": 109776389,
      "abr": "5, 5, 5, 3, 3 @ 225, 245, 265, 275, 275 lb",
      "bestEstimated1RM": 304.6,
      "repMaxes": [
        {
          "reps": 3,
          "weight": 275
        },
        {
          "reps": 5,
          "weight": 265
        }
      ],
      "sets": [
        {
          "setNumber": 1,
          "formattedValue": "5 @ 225 lb",
          "rawValue1": 5,
          "rawValue2": 225,
          "savedWorkoutSetExerciseId": 2096820679
        },
        {
          "setNumber": 2,
          "formattedValue": "5 @ 245 lb",
          "rawValue1": 5,
          "rawValue2": 245,
          "savedWorkoutSetExerciseId": 2096820679
        },
        {
          "setNumber": 3,
          "formattedValue": "5 @ 265 lb",
          "rawValue1": 5,
          "rawValue2": 265,
          "savedWorkoutSetExerciseId": 2096820679
        },
        {
          "setNumber": 4,
          "formattedValue": "3 @ 275 lb",
          "rawValue1": 3,
          "rawValue2": 275,
          "savedWorkoutSetExerciseId": 2096820679
        },
        {
          "setNumber": 5,
          "formattedValue": "3 @ 275 lb",
          "rawValue1": 3,
          "rawValue2": 275,
          "savedWorkoutSetExerciseId": 2096820679
        }
      ]
    },
    {
      "dateCompleted": "2025-02-23",
      "notes": null,
      "isLift": true,
      "param1Type": 3,
      "param2Type": 1,
      "savedWorkoutSetExerciseId": 2083330285,
      "teamId": 594128,
      "programWorkoutId": 108945483,
      "abr": "4 x 5 @ 185, 225, 245, 245 lb",
      "bestEstimated1RM": 281.61,
      "repMaxes": [
        {
          "reps": 5,
          "weight": 245
        }
      ],
      "sets": [
        {
          "setNumber": 1,
          "formattedValue": "5 @ 185 lb",
          "rawValue1": 5,
          "rawValue2": 185,
          "savedWorkoutSetExerciseId": 2083330285
        },
        {
          "setNumber": 2,
          "formattedValue": "5 @ 225 lb",
          "rawValue1": 5,
          "rawValue2": 225,
          "savedWorkoutSetExerciseId": 2083330285
        },
        {
          "setNumber": 3,
          "formattedValue": "5 @ 245 lb",
          "rawValue1": 5,
          "rawValue2": 245,
          "savedWorkoutSetExerciseId": 2083330285
        },
        {
          "setNumber": 4,
          "formattedValue": "5 @ 245 lb",
          "rawValue1": 5,
          "rawValue2": 245,
          "savedWorkoutSetExerciseId": 2083330285
        }
      ]
    },
    {
      "dateCompleted": "2025-02-16",
      "notes": null,
      "isLift": true,
      "param1Type": 3,
      "param2Type": 1,
      "savedWorkoutSetExerciseId": 2074524033,
      "teamId": 594128,
      "programWorkoutId": 108393337,
      "abr": "4 x 5 @ 225 lb",
      "bestEstimated1RM": 258.62,
      "repMaxes": [
        {
          "reps": 5,
          "weight": 225
        }
      ],
      "sets": [
        {
          "setNumber": 1,
          "formattedValue": "5 @ 225 lb",
          "rawValue1": 5,
          "rawValue2": 225,
          "savedWorkoutSetExerciseId": 2074524033
        },
        {
          "setNumber": 2,
          "formattedValue": "5 @ 225 lb",
          "rawValue1": 5,
          "rawValue2": 225,
          "savedWorkoutSetExerciseId": 2074524033
        },
        {
          "setNumber": 3,
          "formattedValue": "5 @ 225 lb",
          "rawValue1": 5,
          "rawValue2": 225,
          "savedWorkoutSetExerciseId": 2074524033
        },
        {
          "setNumber": 4,
          "formattedValue": "5 @ 225 lb",
          "rawValue1": 5,
          "rawValue2": 225,
          "savedWorkoutSetExerciseId": 2074524033
        }
      ]
    },
  ]
 *
 */
export const getExerciseHistory = (
  exerciseId: string,
  userId: number,
  sessionToken: string,
) =>
  client.GET("/v5/exercises/{id}/history", {
    ...makeDefaultOptions(sessionToken),
    params: { query: { userId }, path: { id: exerciseId } },
  });

export type ExerciseHistory = RequiredDeep<
  Awaited<ReturnType<typeof getExerciseHistory>>
>["data"]["history"];
export type ExercisePRs = RequiredDeep<
  Awaited<ReturnType<typeof getExerciseHistory>>
>["data"]["liftPRs"];

export const getRecentWorkouts = (
  sessionToken: string,
  startDate: string,
  endDate: string,
) =>
  client.GET("/3.0/athlete/programworkout/range", {
    ...makeDefaultOptions(sessionToken),
    params: { query: { startDate, endDate } },
  });

export type RecentWorkout = IterableElement<
  RequiredDeep<Awaited<ReturnType<typeof getRecentWorkouts>>>["data"]
>;

/*
 * API Response Field Definitions:
 *
 * rawValue1 - Number of repetitions (reps) performed in a set
 *             Example: 5 (from "5 @ 225 lb")
 *
 * rawValue2 - Weight used for the exercise in pounds
 *             Example: 225 (from "5 @ 225 lb")
 *
 * param1Type - Type indicator for the first parameter (repetitions)
 *              Value 3 represents repetitions as the measurement type
 *
 * param2Type - Type indicator for the second parameter (weight)
 *              Value 1 represents weight as the measurement type
 *
 * Together these fields define a complete strength training set: how many times
 * (repetitions) a specific weight was lifted. The formattedValue field combines
 * these values into a human-readable format (e.g., "5 @ 225 lb").
 */

// Extract the history entry type
export type HistoryEntry = IterableElement<ExerciseHistory>;

// Extract the set type from the history entry
export type ExerciseSet = IterableElement<HistoryEntry["sets"]>;

// Workout data types - hierarchical structure for the UI
export interface WorkoutExercise {
  id: string | number;
  title: string;
  sets: ExerciseSet[];
  bestEstimated1RM?: number;
}

export interface Workout {
  date: string;
  programWorkoutId?: number;
  exercises: WorkoutExercise[];
}
