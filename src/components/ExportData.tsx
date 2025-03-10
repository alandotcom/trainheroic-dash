import React from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Download, FileJson, FileSpreadsheet, FileText } from "lucide-react";
import { saveAs } from "file-saver";
import type { Workout } from "../../api";
import { calculateWorkoutVolume } from "../workoutUtils";

interface ExportDataProps {
  workouts: Workout[];
}

const ExportData: React.FC<ExportDataProps> = ({ workouts }) => {
  const exportAsJson = () => {
    const data = JSON.stringify(workouts, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    saveAs(blob, `trainheroic_workouts_${formatDateForFilename()}.json`);
  };

  const exportAsCsv = () => {
    // Create CSV header row
    const header = "Date,Exercise,Set,Reps,Weight (lbs),Volume (lbs)\n";

    // Convert workouts to CSV rows
    const rows = workouts
      .flatMap((workout) => {
        const date = new Date(workout.date).toISOString().split("T")[0]; // YYYY-MM-DD format

        return workout.exercises.flatMap((exercise) => {
          return exercise.sets.map((set) => {
            const reps = set.rawValue1 || 0;
            const weight = set.rawValue2 || 0;
            const volume = reps * weight;

            // Format: Date, Exercise, Set #, Reps, Weight, Volume
            return `"${date}","${exercise.title}",${set.setNumber},${reps},${weight},${volume}`;
          });
        });
      })
      .join("\n");

    // Combine header and rows
    const csv = header + rows;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    saveAs(blob, `trainheroic_workouts_${formatDateForFilename()}.csv`);
  };

  const exportAsSummaryText = () => {
    // Create a nicely formatted text summary
    const lines: string[] = [];

    // Add title and export date
    lines.push("TRAINHEROIC WORKOUT SUMMARY");
    lines.push(`Exported on: ${new Date().toLocaleDateString()}`);
    lines.push(""); // Empty line

    // Add overall stats
    lines.push("OVERALL STATISTICS");
    lines.push(`Total Workouts: ${workouts.length}`);

    const totalExercises = workouts.reduce(
      (total, workout) => total + workout.exercises.length,
      0
    );
    lines.push(`Total Exercises: ${totalExercises}`);

    const uniqueExercises = new Set(
      workouts.flatMap((workout) =>
        workout.exercises.map((exercise) => exercise.title)
      )
    ).size;
    lines.push(`Unique Exercises: ${uniqueExercises}`);

    const totalVolume = workouts.reduce(
      (total, workout) => total + calculateWorkoutVolume(workout),
      0
    );
    lines.push(`Total Volume: ${totalVolume.toLocaleString()} lbs`);
    lines.push(""); // Empty line

    // Add workout summaries
    lines.push("WORKOUT SUMMARIES");
    workouts.forEach((workout) => {
      const date = new Date(workout.date).toLocaleDateString();
      const volume = calculateWorkoutVolume(workout).toLocaleString();

      lines.push(`Date: ${date}`);
      lines.push(`Volume: ${volume} lbs`);
      lines.push(`Exercises: ${workout.exercises.length}`);

      // Add exercise details
      workout.exercises.forEach((exercise, index) => {
        lines.push(`  ${index + 1}. ${exercise.title}`);

        // Add set information
        exercise.sets.forEach((set) => {
          lines.push(
            `     Set ${set.setNumber}: ${set.rawValue1 || 0} reps @ ${
              set.rawValue2 || 0
            } lbs`
          );
        });
      });

      lines.push(""); // Empty line between workouts
    });

    // Create text file
    const text = lines.join("\n");
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    saveAs(blob, `trainheroic_summary_${formatDateForFilename()}.txt`);
  };

  // Helper for consistent filename dates
  const formatDateForFilename = () => {
    const now = new Date();
    return now.toISOString().split("T")[0]; // YYYY-MM-DD format
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-1 sm:gap-2 flex-1 sm:flex-none justify-center"
        >
          <Download className="h-4 w-4" />
          <span className="hidden xs:inline">Export Data</span>
          <span className="xs:hidden">Export</span>
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Export Workout Data</SheetTitle>
          <SheetDescription>
            Choose a format to export your workout history
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 sm:mt-6 space-y-4 sm:space-y-6">
          <Alert>
            <AlertDescription className="text-xs sm:text-sm">
              Your data is exported locally and is never sent to any server.
            </AlertDescription>
          </Alert>

          <div className="space-y-3 sm:space-y-4">
            <Button
              variant="outline"
              className="w-full justify-start gap-2 text-sm"
              onClick={exportAsCsv}
            >
              <FileSpreadsheet className="h-4 w-4 sm:h-5 sm:w-5" />
              Export as CSV
              <span className="ml-auto text-[10px] sm:text-xs text-muted-foreground">
                For Excel, Google Sheets
              </span>
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start gap-2 text-sm"
              onClick={exportAsJson}
            >
              <FileJson className="h-4 w-4 sm:h-5 sm:w-5" />
              Export as JSON
              <span className="ml-auto text-[10px] sm:text-xs text-muted-foreground">
                Raw data format
              </span>
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start gap-2 text-sm"
              onClick={exportAsSummaryText}
            >
              <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
              Export as Text Summary
              <span className="ml-auto text-[10px] sm:text-xs text-muted-foreground">
                Human-readable format
              </span>
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default ExportData;
