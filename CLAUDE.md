# TrainHeroic Project Guidelines

## Commands
- Build: `bun run build`
- Development: `bun run dev`
- Preview: `bun run serve`
- Type Checking: `tsc --noEmit` (strict mode enabled)
- Lint: `eslint src/**/*.{ts,tsx}`
- Format: `prettier --write src/**/*.{ts,tsx}`

## Project Structure
- `/src/components/` - UI components
- `/src/` - Main application logic
- `/api.ts` - API client and data fetching
- `/train-heroic-schema.d.ts` - TypeScript definitions for API

## UI Framework
- React with TypeScript
- Shadcn UI for components
- Tailwind CSS for styling
- Lucide React for icons (version compatible with FileSpreadsheet icon)

## Key Components
- `App.tsx` - Main application with tabbed interface
- `WorkoutTable.tsx` - Displays workout history with filtering
- `LoginForm.tsx` - User authentication
- `DateRangeFilter.tsx` - Date range selection for workouts
- `SearchBar.tsx` - Search functionality for workouts
- `DashboardOverview.tsx` - Statistics and charts
- `ExerciseDetail.tsx` - Detailed view for exercises
- `ExportData.tsx` - Export functionality for workout data

## Code Style Guidelines
- **Simplicity**: Write simple, readable code with minimal complexity
- **TypeScript**: Use strict typing - avoid type assertions, prefer type guards
- **Functions**: Use early returns, add descriptive comments
- **Naming**: Use descriptive names, prefix handlers with "handle" (e.g., handleClick)
- **Immutability**: Prefer functional, immutable style when possible
- **Components**: Define composing functions before their dependencies
- **Changes**: Make minimal code changes, modify only what's needed for the task
- **DRY**: Don't repeat yourself - extract reusable functions and components
- **Maintainability**: Write code that's easy to maintain and test

## API Usage
- Use api.ts for API requests
- Use Bun for both interpreter and package manager
- Schema defined in train-heroic-schema.yml

## Data Flow
- Fetch workout data from TrainHeroic API
- Transform data using utility functions in workoutUtils.ts
- Display data in WorkoutTable and other components
- Filter and search functionality provided through UI components