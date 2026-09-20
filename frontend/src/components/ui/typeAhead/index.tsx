/* eslint-disable @typescript-eslint/no-explicit-any */
import React, {
  type ChangeEvent,
  type MouseEvent as ReactMouseEvent,
  useEffect,
  useRef,
  useState,
} from "react";
// Local debounce utility replacing lodash/debounce
function debounce<T extends (...args: Parameters<T>) => void>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout> | null = null
  return (...args: Parameters<T>) => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}

import { Search, X } from "lucide-react";
interface TypeaheadProps {
  label: string;
  className?: string;
  placeholder: string;
  staticData: string[];
  isStaticData: boolean;
  onSelect: (value: object) => void;
  onChange?: (value: string) => void;
  disabled: boolean;
  value: string | undefined;
  customLoading: string;
  dataKey: string;
  fetchSuggestions?: (query: string) => Promise<string[]>;
}

const TypeAhead: React.FC<TypeaheadProps> = ({
  label,
  className = "",
  placeholder,
  staticData,
  isStaticData,
  onSelect,
  disabled,
  onChange,
  value,
  customLoading,
  dataKey,
  fetchSuggestions,
}) => {
  // State hooks to manage input value, options visibility, suggestions, loading, and errors
  const [inputValue, setInputValue] = useState(value || "");
  const [showOptions, setShowOptions] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reference to handle clicks outside the component
  const node = useRef<HTMLDivElement>(null);

  // Handles input change and updates the state and parent component
  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    if (onChange) {
      onChange(e.target.value);
    }
    setShowOptions(true);
  };

  // Toggles options visibility on input click
  const handleInputClick = () => {
    if (!showOptions) {
      setShowOptions(true);
    }
  };

  // Resets the input value and hides options
  const handleReset = () => {
    setInputValue("");
    setShowOptions(false);
    if (onChange) {
      onChange("");
    }
  };

  // Handles button click to toggle options visibility or reset input value
  const handleButtonClick = (e: ReactMouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (showOptions) {
      if (inputValue.length > 0) {
        handleReset();
      } else {
        setShowOptions(true);
      }
    }
  };

  // Handles option click and updates the input value and selection
  const handleOptionClick = (option: object | any) => {
    const displayValue = option[dataKey];
    if (typeof displayValue === "string") {
      setInputValue(displayValue);
      setShowOptions(false);
      onSelect(option);
    } else {
      console.error("Option value is not a string");
    }
  };

  // Handles click outside the component to hide options
  const handleClickOutside = (event: MouseEvent) => {
    if (node.current && !node.current.contains(event.target as Node)) {
      setShowOptions(false);
    }
  };

  // Set up event listener for clicks outside the component
  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    setInputValue(value || "");
  }, [value]);

  const getSuggestions = async (query: string) => {
    setError(null);
    setLoading(true);
    try {
      let result: string[] = [];

      if (isStaticData) {
        // Filter static data based on query
        result = staticData.filter((item) =>
          item.toLowerCase().includes(query)
        );
      } else if (fetchSuggestions) {
        // Fetch suggestions from the server
        const data = await fetchSuggestions(query);
        if (data) {
          result = data;
        } else {
          setError("Failed to fetch suggestions");
        }
      }
      setSuggestions(result);
    } catch (err) {
      console.error("Error fetching suggestions:", err);
      setError("Failed to fetch suggestions");
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  // Move debounce initialization outside of the effect and useRef for stable reference
  const debouncedGetSuggestions = useRef(
    debounce((query: string) => getSuggestions(query), 300)
  );

  // Reference to track the last input value that triggered an API call
  const lastSearchedQuery = useRef<string | null>(null);

  useEffect(() => {
    if (inputValue.trim().length > 3) {
      if (lastSearchedQuery.current !== inputValue.trim()) {
        lastSearchedQuery.current = inputValue.trim(); // Update the query

        if (isStaticData) {
          // Filter static data
          const filteredData = staticData.filter((item) =>
            item.toLowerCase().includes(inputValue.trim().toLowerCase())
          );
          setSuggestions(filteredData);
        } else {
          debouncedGetSuggestions.current(inputValue); // Fetch suggestions if not static
        }
      }
    } else {
      // Clear suggestions and reset last query for shorter input
      setSuggestions([]);
      lastSearchedQuery.current = null;
    }
  }, [inputValue, isStaticData, staticData]);

  return (
    <div ref={node} className={`relative ${className}`}>
      <label
        htmlFor="type-search"
        className="block text-sm font-medium text-gray-700"
      >
        {label}
      </label>
      <div className="relative">
        <input
          type="text"
          id="type-search"
          className={`h-8 px-1 bg-gray-50 border border-gray-400 text-gray-700 text-sm rounded placeholder:text-sm focus:outline-gray-500 mt-1 pr-10 ${className}`}
          placeholder={placeholder}
          onChange={handleInputChange}
          onClick={handleInputClick}
          disabled={disabled}
          value={inputValue}
          autoComplete="off"
        />
        <button
          type="button"
          className="absolute inset-y-0 right-0 flex items-center p-2 mt-1 pr-3"
          onClick={handleButtonClick}
          onMouseDown={(e) => e.preventDefault()}
        >
          {showOptions ? <X size={20} /> : <Search size={18} />}
        </button>
      </div>
      {showOptions && (
        <ul className="absolute z-10 mt-1 text-xs bg-white border border-gray-300 rounded-md shadow-lg max-h-60 w-full overflow-auto">
          {loading ? (
            <li className="p-2 text-xs text-gray-500 ">
              {customLoading || "Loading..."}
            </li>
          ) : error ? (
            <li className="p-2 text-xs text-red-600">{error}</li>
          ) : suggestions.length === 0 ? (
            <li className="p-2 text-xs text-gray-500">No results found</li>
          ) : (
            Array.isArray(suggestions) &&
            suggestions.map((option, index) => {
              const value = typeof option === "object" ? option[dataKey] : "";
              return (
                <li
                  key={index}
                  onClick={() => handleOptionClick(option)}
                  className="cursor-pointer text-xs hover:bg-gray-200 p-2"
                >
                  {value}
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
};

export default TypeAhead;
