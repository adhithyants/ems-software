import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import './CustomDatePicker.css';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export default function CustomDatePicker({
    selectedDate, // Date | null
    startDate, // Date | null (for range)
    endDate, // Date | null (for range)
    onChange, // (date: Date) => void OR (range: [Date | null, Date | null]) => void
    isRange = false,
    placeholder = "Select date",
    minDate = null,
    className = "",
    preferredPlacement = null // 'right' | 'left' | 'top' | 'bottom'
}) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);

    // Internal calendar view state (which month/year are we looking at?)
    const initialViewDate = selectedDate || startDate || new Date();
    const [viewMonth, setViewMonth] = useState(initialViewDate.getMonth());
    const [viewYear, setViewYear] = useState(initialViewDate.getFullYear());

    // For range picking logic
    const [hoverDate, setHoverDate] = useState(null);
    const [placement, setPlacement] = useState('bottom'); 
    const [verticalOffset, setVerticalOffset] = useState(0);

    // Sync view when props change unexpectedly
    useEffect(() => {
        if (!isOpen) {
            const d = selectedDate || startDate || new Date();
            setViewMonth(d.getMonth());
            setViewYear(d.getFullYear());
            setHoverDate(null);
        } else if (containerRef.current) {
            // High-precision window detection
            const rect = containerRef.current.getBoundingClientRect();
            const viewportHeight = window.innerHeight;
            const viewportWidth = window.innerWidth;
            
            const space = {
                bottom: viewportHeight - rect.bottom,
                top: rect.top,
                right: viewportWidth - rect.right,
                left: rect.left
            };

            const CALENDAR_HEIGHT = 440;
            const CALENDAR_WIDTH = 340;

            // 0. Extreme Zoom Detection (< 480px height)
            if (viewportHeight < 480) {
                setPlacement('inline');
                setVerticalOffset(0);
                return;
            }

            // 1. If user forced a preference, try it first
            if (preferredPlacement && space[preferredPlacement] > (['left', 'right'].includes(preferredPlacement) ? CALENDAR_WIDTH : CALENDAR_HEIGHT)) {
                setPlacement(preferredPlacement);
                
                // Vertical Adjustment for Side Placement
                if (['right', 'left'].includes(preferredPlacement)) {
                    const center = rect.top + rect.height / 2;
                    const bottomEdge = center + CALENDAR_HEIGHT / 2;
                    const topEdge = center - CALENDAR_HEIGHT / 2;
                    
                    if (bottomEdge > viewportHeight) {
                        setVerticalOffset(viewportHeight - bottomEdge - 20); // 20px padding
                    } else if (topEdge < 0) {
                        setVerticalOffset(-topEdge + 20);
                    } else {
                        setVerticalOffset(0);
                    }
                }
                return;
            }

            // 2. Horizontal-First Priority (Vertical Shifting for Side-Openings)
            let bestPlacement = 'bottom';
            let offset = 0;

            if (preferredPlacement === 'right' || (space.right > CALENDAR_WIDTH && space.right > space.left)) {
                if (space.right > CALENDAR_WIDTH) {
                    bestPlacement = 'right';
                    const center = rect.top + rect.height / 2;
                    const bEdge = center + CALENDAR_HEIGHT / 2;
                    const tEdge = center - CALENDAR_HEIGHT / 2;
                    if (bEdge > viewportHeight) offset = viewportHeight - bEdge - 20;
                    else if (tEdge < 0) offset = -tEdge + 20;
                }
                else if (space.left > CALENDAR_WIDTH) {
                    bestPlacement = 'left';
                    const center = rect.top + rect.height / 2;
                    const bEdge = center + CALENDAR_HEIGHT / 2;
                    if (bEdge > viewportHeight) offset = viewportHeight - bEdge - 20;
                }
                else if (space.bottom > CALENDAR_HEIGHT) bestPlacement = 'bottom';
                else bestPlacement = 'top';
            } 
            else if (preferredPlacement === 'left' || (space.left > CALENDAR_WIDTH)) {
                if (space.left > CALENDAR_WIDTH) {
                    bestPlacement = 'left';
                    const center = rect.top + rect.height / 2;
                    const bEdge = center + CALENDAR_HEIGHT / 2;
                    if (bEdge > viewportHeight) offset = viewportHeight - bEdge - 20;
                }
                else if (space.right > CALENDAR_WIDTH) bestPlacement = 'right';
                else if (space.bottom > CALENDAR_HEIGHT) bestPlacement = 'bottom';
                else bestPlacement = 'top';
            }
            // 3. Vertical Fallback
            else {
                if (space.bottom > CALENDAR_HEIGHT) bestPlacement = 'bottom';
                else if (space.top > CALENDAR_HEIGHT) bestPlacement = 'top';
                else bestPlacement = 'bottom';
            }

            setPlacement(bestPlacement);
            setVerticalOffset(offset);
        }
    }, [isOpen, selectedDate, startDate, preferredPlacement, isRange]);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Generate days for the current view
    const getDaysInMonth = (month, year) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (month, year) => new Date(year, month, 1).getDay();

    const renderCalendarDays = () => {
        const totalDays = getDaysInMonth(viewMonth, viewYear);
        const firstDayIndex = getFirstDayOfMonth(viewMonth, viewYear);
        const prevMonthDays = getDaysInMonth(viewMonth === 0 ? 11 : viewMonth - 1, viewMonth === 0 ? viewYear - 1 : viewYear);

        const days = [];

        // Previous month padding
        for (let i = firstDayIndex - 1; i >= 0; i--) {
            days.push({
                date: new Date(viewMonth === 0 ? viewYear - 1 : viewYear, viewMonth === 0 ? 11 : viewMonth - 1, prevMonthDays - i),
                isCurrentMonth: false,
                isPast: false // We check minDate separately
            });
        }

        // Current month days
        for (let i = 1; i <= totalDays; i++) {
            days.push({
                date: new Date(viewYear, viewMonth, i),
                isCurrentMonth: true,
                isPast: false
            });
        }

        // Next month padding to fill 6 rows (42 cells total)
        const nextDays = 42 - days.length;
        for (let i = 1; i <= nextDays; i++) {
            days.push({
                date: new Date(viewMonth === 11 ? viewYear + 1 : viewYear, viewMonth === 11 ? 0 : viewMonth + 1, i),
                isCurrentMonth: false,
                isPast: false
            });
        }

        return days.map(dayObj => {
            // Apply MinDate logic
            if (minDate && dayObj.date < new Date(minDate.setHours(0, 0, 0, 0))) {
                dayObj.isDisabled = true;
            } else {
                dayObj.isDisabled = false;
            }
            return dayObj;
        });
    };

    const handleDateClick = (date) => {
        if (isRange) {
            if (!startDate || (startDate && endDate)) {
                // Start a new range
                onChange([date, null]);
            } else if (startDate && !endDate) {
                // Complete the range (ensure start is before end)
                if (date < startDate) {
                    onChange([date, startDate]);
                } else {
                    onChange([startDate, date]);
                }
                setTimeout(() => setIsOpen(false), 200); // Auto-close neatly
            }
        } else {
            onChange(date);
            setIsOpen(false);
        }
    };

    const handlePrevMonth = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (viewMonth === 0) {
            setViewMonth(11);
            setViewYear(viewYear - 1);
        } else {
            setViewMonth(viewMonth - 1);
        }
    };

    const handleNextMonth = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (viewMonth === 11) {
            setViewMonth(0);
            setViewYear(viewYear + 1);
        } else {
            setViewMonth(viewMonth + 1);
        }
    };

    // Style Helpers
    const isSameDay = (d1, d2) => d1 && d2 && d1.getDate() === d2.getDate() && d1.getMonth() === d2.getMonth() && d1.getFullYear() === d2.getFullYear();
    const isWithinRange = (date) => {
        if (!isRange) return false;
        if (startDate && endDate && date > startDate && date < endDate) return true;
        if (startDate && !endDate && hoverDate && date > startDate && date < hoverDate) return true;
        if (startDate && !endDate && hoverDate && date < startDate && date > hoverDate) return true; // reverse hover
        return false;
    };

    const handleApply = () => {
        if (isRange && startDate && !endDate) {
            // If only start date is selected, assume they want a single day report
            onChange([startDate, startDate]);
        }
        setIsOpen(false);
    };

    // Format display string
    let displayString = placeholder;
    if (isRange) {
        if (startDate && endDate) {
            if (isSameDay(startDate, endDate)) {
                displayString = startDate.toLocaleDateString('en-GB');
            } else {
                displayString = `${startDate.toLocaleDateString('en-GB')} to ${endDate.toLocaleDateString('en-GB')}`;
            }
        } else if (startDate) {
            displayString = `${startDate.toLocaleDateString('en-GB')} to ...`;
        }
    } else if (selectedDate) {
        displayString = selectedDate.toLocaleDateString('en-GB');
    }

    const yearOptions = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i);

    return (
        <div className={`custom-datepicker-wrapper ${className}`} ref={containerRef}>
            {/* Input Trigger */}
            <div
                className="custom-datepicker-trigger select"
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    userSelect: 'none',
                    minWidth: '220px',
                    height: '42px', /* Match standard form inputs */
                    padding: '0 0.85rem'
                }}
            >
                <div style={{ 
                    color: (isRange && !startDate) || (!isRange && !selectedDate) ? 'var(--text-muted)' : 'inherit',
                    display: 'flex',
                    alignItems: 'center',
                    fontSize: '0.9rem',
                    lineHeight: '1'
                }}>
                    {displayString}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', color: 'var(--text-muted)' }}>
                    <CalendarIcon size={16} />
                </div>
            </div>

            {/* Calendar Popup */}
            {isOpen && (
                <div 
                    className={`calendar-popup opens-${placement}`}
                    style={
                        ['right', 'left'].includes(placement) 
                        ? { transform: `translateY(calc(-50% + ${verticalOffset}px)) translateX(${placement === 'right' ? '10px' : '-10px'})` } 
                        : {}
                    }
                >
                    <div className="calendar">
                        <div className="calendar__opts">
                            <select
                                name="calendar__month"
                                id="calendar__month"
                                value={viewMonth}
                                onChange={(e) => setViewMonth(parseInt(e.target.value))}
                            >
                                {MONTHS.map((mon, idx) => (
                                    <option key={mon} value={idx}>{mon}</option>
                                ))}
                            </select>

                            <select
                                name="calendar__year"
                                id="calendar__year"
                                value={viewYear}
                                onChange={(e) => setViewYear(parseInt(e.target.value))}
                            >
                                {yearOptions.map(y => (
                                    <option key={y} value={y}>{y}</option>
                                ))}
                            </select>
                        </div>

                        <div className="calendar__body">
                            <div className="calendar__days">
                                {DAYS.map((d, i) => <div key={i}>{d}</div>)}
                            </div>

                            <div className="calendar__dates">
                                {renderCalendarDays().map((dayObj, i) => {
                                    const { date, isCurrentMonth, isDisabled } = dayObj;
                                    const isSelected = !isRange && isSameDay(date, selectedDate);
                                    const isStart = isRange && isSameDay(date, startDate);
                                    const isEnd = isRange && isSameDay(date, endDate);
                                    const isInRange = isWithinRange(date);

                                    let classNames = "calendar__date";
                                    if (!isCurrentMonth || isDisabled) classNames += " calendar__date--grey";
                                    if (isSelected) classNames += " calendar__date--selected calendar__date--first-date calendar__date--last-date";
                                    if (isStart) classNames += " calendar__date--selected calendar__date--first-date calendar__date--range-start";
                                    if (isEnd) classNames += " calendar__date--selected calendar__date--last-date calendar__date--range-end";
                                    if (isInRange) classNames += " calendar__date--in-range";

                                    return (
                                        <div
                                            key={i}
                                            className={classNames}
                                            onClick={() => !isDisabled && handleDateClick(date)}
                                            onMouseEnter={() => !isDisabled && setHoverDate(date)}
                                        >
                                            <span>{date.getDate()}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="calendar__buttons">
                            <button className="calendar__button calendar__button--grey" onClick={handlePrevMonth}>
                                <ChevronLeft size={18} style={{ margin: '0 auto' }} />
                            </button>
                            <button className="calendar__button calendar__button--grey" onClick={handleNextMonth}>
                                <ChevronRight size={18} style={{ margin: '0 auto' }} />
                            </button>
                        </div>
                        {isRange && (
                            <div style={{ padding: '0 20px 20px', display: 'flex', justifyContent: 'flex-end', background: 'var(--bg-card)', borderBottomLeftRadius: '34px', borderBottomRightRadius: '34px' }}>
                                <button className="calendar__button calendar__button--primary" onClick={handleApply} style={{ width: '100%' }}>Apply Option</button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
