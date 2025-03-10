import React, { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface SearchBarProps {
  onSearch: (query: string) => void;
  placeholder?: string;
}

const SearchBar: React.FC<SearchBarProps> = ({
  onSearch,
  placeholder = "Search workouts or exercises...",
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const isInitialMount = useRef(true);

  // Use debounce to reduce frequency of search updates
  useEffect(() => {
    // Skip the first render
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    // Create debounce timer
    const timer = setTimeout(() => {
      onSearch(searchQuery);
    }, 300);

    // Cleanup function clears the timer
    return () => clearTimeout(timer);
  }, [searchQuery]); // Removed onSearch from dependencies

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  return (
    <div className="flex w-full sm:max-w-sm items-center relative">
      <Search className="h-4 w-4 absolute left-2 sm:left-3 text-muted-foreground" />
      <Input
        type="text"
        placeholder={placeholder}
        value={searchQuery}
        onChange={handleInputChange}
        className="flex-1 pl-8 sm:pl-9 h-9 sm:h-10 text-sm sm:text-base"
      />
    </div>
  );
};

export default SearchBar;
