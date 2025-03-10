import React from "react";

interface DateRangeFilterProps {
  startDate: string;
  endDate: string;
  onFilter: (startDate: string, endDate: string) => void;
}

const DateRangeFilter: React.FC<DateRangeFilterProps> = ({
  startDate,
  endDate,
  onFilter,
}) => {
  return (
    <div className="flex flex-col md:flex-row gap-4 mb-6 pb-4 border-b border-gray-200">
      <div className="flex flex-col">
        <label
          htmlFor="startDate"
          className="text-sm font-medium text-gray-700 mb-1"
        >
          Start Date
        </label>
        <input
          type="date"
          id="startDate"
          value={startDate}
          onChange={(e) => onFilter(e.target.value || "", endDate)}
          className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <div className="flex flex-col">
        <label
          htmlFor="endDate"
          className="text-sm font-medium text-gray-700 mb-1"
        >
          End Date
        </label>
        <input
          type="date"
          id="endDate"
          value={endDate}
          onChange={(e) => onFilter(startDate, e.target.value || "")}
          className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <div className="flex items-end">
        <button
          onClick={() => {
            // Reset to last month to today
            const today = new Date();
            const lastMonth = new Date();
            lastMonth.setMonth(today.getMonth() - 1);

            const newStartDate = lastMonth.toISOString().split("T")[0];
            const newEndDate = today.toISOString().split("T")[0];

            if (newStartDate && newEndDate) {
              onFilter(newStartDate, newEndDate);
            }
          }}
          className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
        >
          Last 30 Days
        </button>
      </div>
    </div>
  );
};

export default DateRangeFilter;
