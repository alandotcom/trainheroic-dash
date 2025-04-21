import { z } from "zod";

// Basic schema for API error handling
export const errorSchema = z.object({
  name: z.string(),
  message: z.string()
});

// Auth response schema
export const authResponseSchema = z.object({
  id: z.number(),
  api_token: z.string(),
  refresh_token: z.string().optional(),
  api_ttl: z.number().optional(),
  scope: z.string().optional(),
  role: z.string().optional(),
  session_id: z.string()
});

// Exercise schema
export const exerciseSchema = z.object({
  id: z.number(),
  userId: z.number(),
  title: z.string(),
  logo: z.string().optional(),
  hasVideo: z.boolean().optional(),
  videoUrl: z.string().optional(),
  isCircuit: z.boolean().optional(),
  instructions: z.string().optional(),
  prescription: z.string().optional(),
  param1Type: z.number().nullable().optional(),
  param2Type: z.union([z.number(), z.null()]).optional()
});

// Exercise set schema
export const exerciseSetSchema = z.object({
  setNumber: z.number(),
  formattedValue: z.string(),
  rawValue1: z.number(),
  rawValue2: z.number().optional(),
  savedWorkoutSetExerciseId: z.number()
});

// Exercise rep max schema
export const repMaxSchema = z.object({
  reps: z.number(),
  weight: z.number()
});

// History entry schema
export const historyEntrySchema = z.object({
  dateCompleted: z.string(),
  notes: z.string().nullable(),
  isLift: z.boolean(),
  param1Type: z.number().nullable(),
  param2Type: z.number().nullable(),
  savedWorkoutSetExerciseId: z.number(),
  teamId: z.number(),
  programWorkoutId: z.number(),
  abr: z.string(),
  bestEstimated1RM: z.number().optional(),
  repMaxes: z.array(repMaxSchema).optional(),
  sets: z.array(
    z.preprocess(
      (val) => {
        // Ensure we only process objects with valid setNumber
        if (typeof val === "object" && val && "setNumber" in val && typeof val.setNumber === "number") {
          return val;
        }
        return null;
      },
      exerciseSetSchema.optional()
    )
  ).transform(sets => sets.filter(Boolean))
});

// Exercise history response schema
export const exerciseHistoryResponseSchema = z.object({
  liftPRs: z.array(
    z.object({
      weight: z.number(),
      savedWorkoutSetExerciseId: z.number(),
      setNumber: z.number(),
      dateCompleted: z.string(),
      reps: z.number(),
      units: z.string(),
      isMetric: z.boolean(),
      description: z.string()
    })
  ).optional(),
  singleParamPRs: z.array(z.unknown()).optional(),
  history: z.array(historyEntrySchema)
});

// Recent workout schema
export const workoutSchema = z.object({
  id: z.number().optional(),
  date: z.string().optional(),
  name: z.string().optional(),
  exercise_stats: z.array(
    z.object({
      exercise_id: z.number().optional()
    }).passthrough()
  ).optional(),
}).passthrough();

// Response schemas with arrays
export const exercisesResponseSchema = z.array(exerciseSchema);
export const workoutsResponseSchema = z.array(workoutSchema);

// Helper function to safely validate API responses
export function validateApiResponse<T>(schema: z.ZodType<T>, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (error) {
    console.error("API validation error:", error);
    throw new Error("Invalid API response format");
  }
}