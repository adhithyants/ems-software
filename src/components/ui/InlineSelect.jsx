import React from 'react';
import './InlineSelect.css';

export default function InlineSelect({ value, options, onChange, disabled }) {
    return (
        <select
            className={`inline-select inline-select--${value.toLowerCase()}`}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            onClick={(e) => e.stopPropagation()}
        >
            {options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                    {opt.label}
                </option>
            ))}
        </select>
    );
}
