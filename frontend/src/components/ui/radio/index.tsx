import React from 'react'

interface RadioProps {
    label: string
    name: string
    value: string
    checked: boolean
    onChange: (value: string) => void
    color: string 
}

const Radio: React.FC<RadioProps> = ({
    label,
    name,
    value,
    checked,
    onChange,
    color,
}) => {

    const getColorClass = () => {
        switch (color) {
            case 'green':
                return 'custom-radio-green'
            case 'blue':
                return 'custom-radio-blue'
            case 'red':
                return 'bg-red-500'
            default:
                return ''
        }
    }

    return (
        <label className="inline-flex items-center">
            <input
                type="radio"
                name={name}
                value={value}
                checked={checked}
                onChange={() => onChange(value)}
                className={`text-red-800 custom-radio ${getColorClass()}`} 
            />
            <span className="ml-2">{label}</span>
        </label>
    )
}

export default Radio
 