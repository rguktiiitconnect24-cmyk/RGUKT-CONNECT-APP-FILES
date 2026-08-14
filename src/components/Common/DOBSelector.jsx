import React, { useState, useEffect, useRef } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';
import './DOBSelector.css';

const MONTHS = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

const DOBSelector = ({ value, onChange, error }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);

    // Parse existing value (YYYY-MM-DD)
    const [day, setDay] = useState('');
    const [month, setMonth] = useState('');
    const [year, setYear] = useState('');

    useEffect(() => {
        if (value) {
            const [y, m, d] = value.split('-');
            setYear(y || '');
            setMonth(m ? String(parseInt(m, 10)) : '');
            setDay(d ? String(parseInt(d, 10)) : '');
        }
    }, [value]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Generate arrays
    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 31 }, (_, i) => currentYear - i); // 0 to 30 years old
    const days = Array.from({ length: 31 }, (_, i) => i + 1);

    const handleSelect = (type, val) => {
        let newDay = type === 'day' ? val : day;
        let newMonth = type === 'month' ? val : month;
        let newYear = type === 'year' ? val : year;

        if (type === 'day') setDay(val);
        if (type === 'month') setMonth(val);
        if (type === 'year') setYear(val);

        if (newDay && newMonth && newYear) {
            // Format to YYYY-MM-DD
            const formattedMonth = newMonth.toString().padStart(2, '0');
            const formattedDay = newDay.toString().padStart(2, '0');
            onChange(`${newYear}-${formattedMonth}-${formattedDay}`);
        }
    };

    const displayValue = () => {
        if (!day || !month || !year) return '';
        return `${day} ${MONTHS[parseInt(month) - 1]} ${year}`;
    };

    return (
        <div className="dob-selector-container" ref={containerRef}>
            <div 
                className={`glow-input dob-display-input ${error ? 'error' : ''} ${isOpen ? 'active' : ''}`}
                onClick={() => setIsOpen(!isOpen)}
            >
                {displayValue() || <span className="placeholder-text">Select Date of Birth</span>}
                <ChevronDown size={18} className={`dob-chevron ${isOpen ? 'open' : ''}`} />
            </div>

            {isOpen && (
                <div className="dob-dropdown-panel animate-fade-in-up">
                    <div className="dob-columns">
                        {/* Day Column */}
                        <div className="dob-column">
                            <div className="dob-col-header">Day</div>
                            <div className="dob-col-scroll">
                                {days.map(d => (
                                    <div 
                                        key={d} 
                                        className={`dob-option ${day === String(d) ? 'selected' : ''}`}
                                        onClick={() => handleSelect('day', String(d))}
                                    >
                                        {d}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Month Column */}
                        <div className="dob-column">
                            <div className="dob-col-header">Month</div>
                            <div className="dob-col-scroll">
                                {MONTHS.map((m, idx) => (
                                    <div 
                                        key={m} 
                                        className={`dob-option ${month === String(idx + 1) ? 'selected' : ''}`}
                                        onClick={() => handleSelect('month', String(idx + 1))}
                                    >
                                        {m}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Year Column */}
                        <div className="dob-column">
                            <div className="dob-col-header">Year</div>
                            <div className="dob-col-scroll">
                                {years.map(y => (
                                    <div 
                                        key={y} 
                                        className={`dob-option ${year === String(y) ? 'selected' : ''}`}
                                        onClick={() => handleSelect('year', String(y))}
                                    >
                                        {y}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    {day && month && year && (
                        <div className="dob-dropdown-footer">
                            <button 
                                type="button" 
                                className="dob-done-btn"
                                onClick={() => setIsOpen(false)}
                            >
                                Done
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default DOBSelector;
