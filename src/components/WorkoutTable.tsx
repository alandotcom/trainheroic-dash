import React, {
  useState,
  useCallback,
  useMemo,
  useRef,
  useEffect,
} from "react";
import type { Workout, WorkoutExercise } from "../../api";
import { calculateWorkoutVolume } from "../workoutUtils";
import SearchBar from "./SearchBar";
import ExerciseDetail from "./ExerciseDetail";
import ExportData from "./ExportData";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ChevronDown,
  ChevronUp,
  Dumbbell,
  Info,
  ChevronDownSquare,
  ChevronUpSquare,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface WorkoutTableProps {
  workouts: Workout[];
}

const WorkoutTable: React.FC<WorkoutTableProps> = ({ workouts }) => {
  const [expandedWorkouts, setExpandedWorkouts] = useState<Set<string>>(
    new Set()
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedExercise, setSelectedExercise] =
    useState<WorkoutExercise | null>(null);
  const [isExerciseDetailOpen, setIsExerciseDetailOpen] = useState(false);
  const [pendingWorkoutToView, setPendingWorkoutToView] = useState<
    string | null
  >(null);
  const workoutRefs = useRef<{ [key: string]: HTMLTableRowElement | null }>({});

  // Create a map of workout dates to unique IDs for stable keys
  const workoutKeys = useMemo(() => {
    const map = new Map<string, string>();
    workouts.forEach((workout, index) => {
      const key = workout.programWorkoutId
        ? `${workout.date}-${workout.programWorkoutId}`
        : `${workout.date}-${index}`;
      map.set(workout.date, key);
    });
    return map;
  }, [workouts]);

  // Format date strings for better readability
  const formatDate = (dateString: string): string => {
    // Add a day to fix the off-by-one issue
    const date = new Date(dateString);
    date.setDate(date.getDate() + 1);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Get a unique identifier for a workout
  const getWorkoutKey = useCallback(
    (workout: Workout) => {
      return (
        workoutKeys.get(workout.date) ||
        `${workout.date}-${workout.programWorkoutId || ""}`
      );
    },
    [workoutKeys]
  );

  // Toggle workout details expanding/collapsing
  const toggleWorkoutExpand = useCallback(
    (workout: Workout) => {
      const workoutKey = getWorkoutKey(workout);
      setExpandedWorkouts((prevExpanded) => {
        const newExpanded = new Set(prevExpanded);
        if (newExpanded.has(workoutKey)) {
          newExpanded.delete(workoutKey);
        } else {
          newExpanded.add(workoutKey);
        }
        return newExpanded;
      });
    },
    [getWorkoutKey]
  );

  // Highlight matching text
  const highlightText = useCallback((text: string, query: string) => {
    if (!query.trim()) return text;

    const regex = new RegExp(
      `(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`,
      "gi"
    );
    const parts = text.split(regex);

    return parts.map((part, i) =>
      regex.test(part) ? (
        <mark key={i} className="bg-yellow-200">
          {part}
        </mark>
      ) : (
        part
      )
    );
  }, []);

  // Filter workouts based on search query
  const filteredWorkouts = useMemo(
    () =>
      searchQuery
        ? workouts.filter((workout) => {
            // Search in date
            if (
              formatDate(workout.date)
                .toLowerCase()
                .includes(searchQuery.toLowerCase())
            ) {
              return true;
            }

            // Search in exercise titles
            if (
              workout.exercises.some((exercise) =>
                exercise.title.toLowerCase().includes(searchQuery.toLowerCase())
              )
            ) {
              return true;
            }

            // Check volume (approximate search)
            const volumeString = calculateWorkoutVolume(workout).toString();
            if (volumeString.includes(searchQuery)) {
              return true;
            }

            return false;
          })
        : workouts,
    [workouts, searchQuery, formatDate]
  );

  // Handle viewing a workout from exercise detail
  const handleViewWorkout = useCallback(
    (workoutDate: string) => {
      // Close the exercise detail modal first
      setIsExerciseDetailOpen(false);

      // Set the pending workout to view
      setPendingWorkoutToView(workoutDate);

      // Use setTimeout to ensure the modal is closed before we try to navigate
      setTimeout(() => {
        // Find the workout by date
        const workout = workouts.find((w) => w.date === workoutDate);
        if (!workout) {
          console.warn(`Workout not found for date: ${workoutDate}`);
          setPendingWorkoutToView(null);
          return;
        }

        // Expand the workout
        const workoutKey = getWorkoutKey(workout);
        setExpandedWorkouts((prev) => {
          const newExpanded = new Set(prev);
          newExpanded.add(workoutKey);
          return newExpanded;
        });

        // Find the index of the workout in the filtered list
        const workoutIndex = filteredWorkouts.findIndex(
          (w) => w.date === workoutDate
        );
        if (workoutIndex === -1) {
          console.warn(
            `Workout not found in filtered list for date: ${workoutDate}`
          );
          setPendingWorkoutToView(null);
          return;
        }

        // Clear the search query to ensure the workout is visible
        if (searchQuery) {
          setSearchQuery("");
        }

        // Scroll to the workout
        try {
          // Use the workout date as a selector
          const selector = `tr[data-date="${workoutDate}"]`;
          const workoutRow = document.querySelector(selector);

          if (workoutRow) {
            // Scroll to the workout row
            workoutRow.scrollIntoView({ behavior: "smooth" });

            // Highlight the row
            workoutRow.classList.add("bg-primary/20");
            setTimeout(() => {
              workoutRow.classList.remove("bg-primary/20");
              setPendingWorkoutToView(null);
            }, 2000);
          } else {
            console.warn(`Could not find workout row for date: ${workoutDate}`);
            setPendingWorkoutToView(null);
          }
        } catch (error) {
          console.error("Error scrolling to workout:", error);
          setPendingWorkoutToView(null);
        }
      }, 100);
    },
    [workouts, getWorkoutKey, filteredWorkouts, searchQuery]
  );

  // Expand all workouts
  const expandAllWorkouts = useCallback(() => {
    // If all are expanded, collapse all instead
    if (filteredWorkouts.length === expandedWorkouts.size) {
      setExpandedWorkouts(new Set());
    } else {
      // Create a new Set with all workout unique keys
      setExpandedWorkouts(
        new Set(filteredWorkouts.map((w) => getWorkoutKey(w)))
      );
    }
  }, [filteredWorkouts, expandedWorkouts.size, getWorkoutKey]);

  // Handle search
  const handleSearch = useCallback(
    (query: string) => {
      setSearchQuery(query);

      // If there is a search query, expand all matching workouts
      if (query.trim()) {
        const matchingWorkouts = workouts.filter(
          (workout) =>
            // Search in date
            formatDate(workout.date)
              .toLowerCase()
              .includes(query.toLowerCase()) ||
            // Search in exercise titles
            workout.exercises.some((exercise) =>
              exercise.title.toLowerCase().includes(query.toLowerCase())
            ) ||
            // Check volume
            calculateWorkoutVolume(workout).toString().includes(query)
        );
        setExpandedWorkouts(
          new Set(matchingWorkouts.map((w) => getWorkoutKey(w)))
        );
      }
    },
    [workouts, getWorkoutKey, formatDate]
  );

  // Open exercise details dialog
  const openExerciseDetails = useCallback((exercise: WorkoutExercise) => {
    setSelectedExercise(exercise);
    setIsExerciseDetailOpen(true);
  }, []);

  if (workouts.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No workouts found.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
        <SearchBar
          onSearch={handleSearch}
          placeholder="Search by exercise, date, or volume..."
        />
        <div className="flex items-center gap-2 mt-2 sm:mt-0 w-full sm:w-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={expandAllWorkouts}
            className="flex items-center gap-1 flex-1 sm:flex-none justify-center"
          >
            {filteredWorkouts.length === expandedWorkouts.size ? (
              <>
                <ChevronUpSquare className="h-4 w-4" />
                <span className="hidden xs:inline">Collapse All</span>
                <span className="xs:hidden">Collapse</span>
              </>
            ) : (
              <>
                <ChevronDownSquare className="h-4 w-4" />
                <span className="hidden xs:inline">Expand All</span>
                <span className="xs:hidden">Expand</span>
              </>
            )}
          </Button>
          <ExportData workouts={workouts} />
        </div>
      </div>

      {searchQuery && (
        <div className="text-sm text-muted-foreground mb-2">
          Found {filteredWorkouts.length} workout
          {filteredWorkouts.length !== 1 ? "s" : ""} matching "{searchQuery}"
        </div>
      )}

      <div className="rounded-md border overflow-hidden">
        <div className="overflow-x-auto max-w-full">
          <Table className="w-full table-fixed">
            <TableHeader>
              <TableRow>
                <TableHead className="whitespace-nowrap w-1/3">Date</TableHead>
                <TableHead className="whitespace-nowrap w-1/3">
                  Exercises
                </TableHead>
                <TableHead className="whitespace-nowrap w-1/3">
                  Volume
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredWorkouts.map((workout, index) => {
                const workoutKey = getWorkoutKey(workout);
                const isHighlighted = workout.date === pendingWorkoutToView;

                return (
                  <React.Fragment key={workoutKey}>
                    <TableRow
                      data-date={workout.date}
                      className={`hover:bg-muted/50 cursor-pointer ${
                        isHighlighted
                          ? "bg-primary/20"
                          : searchQuery &&
                            (formatDate(workout.date)
                              .toLowerCase()
                              .includes(searchQuery.toLowerCase()) ||
                              workout.exercises.some((ex) =>
                                ex.title
                                  .toLowerCase()
                                  .includes(searchQuery.toLowerCase())
                              ) ||
                              calculateWorkoutVolume(workout)
                                .toString()
                                .includes(searchQuery))
                          ? "bg-yellow-50"
                          : ""
                      }`}
                      onClick={() => toggleWorkoutExpand(workout)}
                    >
                      <TableCell className="font-medium whitespace-nowrap w-1/3 min-w-[100px]">
                        {searchQuery
                          ? highlightText(formatDate(workout.date), searchQuery)
                          : formatDate(workout.date)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap w-1/3 min-w-[80px]">
                        {workout.exercises.length}{" "}
                        <span className="hidden xs:inline">
                          {workout.exercises.length === 1
                            ? "exercise"
                            : "exercises"}
                        </span>
                      </TableCell>
                      <TableCell className="flex justify-between items-center whitespace-nowrap w-1/3 min-w-[100px]">
                        <span>
                          {searchQuery
                            ? highlightText(
                                calculateWorkoutVolume(
                                  workout
                                ).toLocaleString() + " lbs",
                                searchQuery
                              )
                            : calculateWorkoutVolume(workout).toLocaleString() +
                              " lbs"}
                        </span>
                        {expandedWorkouts.has(workoutKey) ? (
                          <ChevronUp className="h-4 w-4 ml-1" />
                        ) : (
                          <ChevronDown className="h-4 w-4 ml-1" />
                        )}
                      </TableCell>
                    </TableRow>

                    {/* Expanded workout details */}
                    {expandedWorkouts.has(workoutKey) && (
                      <TableRow>
                        <TableCell colSpan={3} className="bg-muted/50 p-0">
                          <div className="p-2 sm:p-4">
                            <div className="w-full overflow-x-auto">
                              <h3 className="font-bold text-lg mb-2 sm:mb-4">
                                Workout Details
                              </h3>

                              <div className="space-y-3 sm:space-y-4">
                                {workout.exercises.map((exercise, index) => (
                                  <div
                                    key={exercise.id}
                                    className="border rounded-lg p-3 sm:p-4 bg-background min-w-[280px]"
                                  >
                                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-2">
                                      <div className="min-w-0 flex-1 max-w-full">
                                        <div className="font-semibold text-base sm:text-lg flex items-center">
                                          <Dumbbell className="mr-1 sm:mr-2 h-4 w-4 flex-shrink-0" />
                                          <span className="overflow-hidden text-ellipsis whitespace-nowrap block">
                                            {searchQuery &&
                                            exercise.title
                                              .toLowerCase()
                                              .includes(
                                                searchQuery.toLowerCase()
                                              )
                                              ? highlightText(
                                                  exercise.title,
                                                  searchQuery
                                                )
                                              : exercise.title}
                                          </span>
                                        </div>

                                        {exercise.bestEstimated1RM && (
                                          <Badge
                                            variant="outline"
                                            className="mt-1"
                                          >
                                            Est. 1RM:{" "}
                                            {Math.round(
                                              exercise.bestEstimated1RM
                                            )}{" "}
                                            lbs
                                          </Badge>
                                        )}
                                      </div>

                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={(e) => {
                                          e.stopPropagation(); // Prevent row click
                                          openExerciseDetails(exercise);
                                        }}
                                        className="w-full sm:w-auto justify-center"
                                      >
                                        <Info className="h-4 w-4 mr-1" />
                                        Details
                                      </Button>
                                    </div>

                                    <div className="mt-3">
                                      <div className="grid grid-cols-2 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                                        {exercise.sets.map((set, setIndex) => (
                                          <div
                                            key={
                                              set.savedWorkoutSetExerciseId
                                                ? `set-${set.savedWorkoutSetExerciseId}-${set.setNumber}`
                                                : `${exercise.id}-set-${set.setNumber}-${setIndex}`
                                            }
                                            className="bg-muted p-1.5 sm:p-2 rounded-md text-xs sm:text-sm"
                                          >
                                            <div className="font-medium">
                                              Set {set.setNumber}
                                            </div>
                                            <div>
                                              {set.rawValue1 || "0"} reps
                                              {set.rawValue2
                                                ? ` @ ${set.rawValue2} lbs`
                                                : ""}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      {selectedExercise && (
        <ExerciseDetail
          exercise={selectedExercise}
          open={isExerciseDetailOpen}
          onOpenChange={setIsExerciseDetailOpen}
          workouts={workouts}
          onViewWorkout={handleViewWorkout}
        />
      )}
    </div>
  );
};

export default WorkoutTable;
