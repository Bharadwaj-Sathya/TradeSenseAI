import React from "react";
import Radio from "../radio";
import { Label } from "../label";

interface RadioGroupProps {
  options: { label: string; value: string }[];
  name: string;
  selectedValue: string;
  onChange: (value: string) => void;
  color: string;
  label: string;
}

const RadioGroup: React.FC<RadioGroupProps> = ({
  options,
  name,
  selectedValue,
  onChange,
  color,
  label,
}) => {
  return (
    <div className="flex flex-col">
      <Label htmlFor={name}>{label}</Label>
      <div className="flex flex-row font-normal text-sm text-black rounded mt-2 gap-4 focus-within:outline-gray-500 ">
        {options.map((option) => (
          <Radio
            key={option.value}
            label={option.label}
            name={name}
            value={option.value}
            checked={selectedValue === option.value}
            onChange={onChange}
            color={color}
          />
        ))}
      </div>
    </div>
  );
};

export default RadioGroup;

/* <RadioGroup
label='Select an Option' // The label for the radio button group
options={[
  { label: 'Kg', value: 'kg' },
  { label: 'Lbs', value: 'lbs' },
]}
name='example'
color='blue'
selectedValue={'kg'}
onChange={function (value: string): void {
  throw new Error('Function not implemented.');
}}
/> */
