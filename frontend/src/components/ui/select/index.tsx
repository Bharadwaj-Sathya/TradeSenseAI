/* eslint-disable @typescript-eslint/no-explicit-any */
import { ChevronDown } from "lucide-react";
import React, {
  type MouseEvent as ReactMouseEvent,
  useEffect,
  useRef,
  useState,
} from "react";

interface SelectOption {
  [key: string]: any; // Allow flexibility in object structure
}

interface SelectOptionsProps {
  label: string;
  options: SelectOption[]; // Array of objects
  className?: string; // Optional for flexibility
  disabled?: boolean; // Optional
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  value: string;
  onSelect?: (selectedOption: SelectOption) => void;
  dataKey: string; // Key of the object to display
}

const Select: React.FC<SelectOptionsProps> = ({
  label,
  options,
  className = "",
  disabled = false,
  onChange,
  value,
  onSelect,
  dataKey,
}) => {
  const [inputValue, setInputValue] = useState<string>(value);
  const [showOptions, setShowOptions] = useState<boolean>(false);
  const node = useRef<HTMLDivElement>(null);

  // Sync inputValue with the parent component's value
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Close dropdown on clicks outside
  useEffect(() => {
    const handleClickOutside = (e: Event) => {
      if (node.current && !node.current.contains(e.target as Node)) {
        setShowOptions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleOptionClick = (option: SelectOption) => {
    setInputValue(option[dataKey]); // Use dataKey to set value
    setShowOptions(false);
    if (onSelect) {
      onSelect(option); // Trigger callback with full object
    }
  };

  const handleInputClick = (
    e: ReactMouseEvent<HTMLInputElement> | ReactMouseEvent<HTMLButtonElement>
  ) => {
    e.preventDefault();
    if (!disabled) {
      setShowOptions(!showOptions);
    }
  };

  return (
    <div ref={node} className="relative">
      <label
        htmlFor="select-input"
        className="block mb-0 text-sm font-medium text-gray-700"
      >
        {label}
      </label>
      <div className="relative">
        <input
          id="select-input"
          type="text"
          className={`px-2 bg-gray-50 border border-gray-400 text-gray-700 text-sm rounded placeholder:text-sm focus:outline-gray-500 mt-1 pr-10 ${className}`}
          value={inputValue}
          onChange={onChange}
          onClick={handleInputClick}
          disabled={disabled}
          readOnly
          placeholder="Select an option"
        />
        <button
          type="button"
          className="absolute inset-y-0 mt-1 right-0 flex items-center justify-center pr-2"
          onClick={handleInputClick}
          onMouseDown={(e) => e.preventDefault()}
        >
          <ChevronDown size={18} />
        </button>
      </div>
      {showOptions && (
        <ul className="absolute z-10 mt-1 text-xs bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 w-full overflow-auto">
          {options.length > 0 ? (
            options.map((option, index) => (
              <li
                key={index}
                onClick={() => handleOptionClick(option)}
                className="cursor-pointer text-xs hover:bg-gray-200 border-gray-100 border-b-2 p-2"
              >
                {option[dataKey]} {/* Display the value based on dataKey */}
              </li>
            ))
          ) : (
            <li className="p-2 text-xs text-gray-500">No options available</li>
          )}
        </ul>
      )}
    </div>
  );
};

export default Select;
