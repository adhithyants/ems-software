import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import './AttendanceCalendar.css';

export default function AttendanceCalendar({ records = [], currentMonth, currentYear, onMonthChange, onYearChange }) {
    // Current date state for navigation
    const [viewDate, setViewDate] = useState(new Date(currentYear, currentMonth - 1, 1));

    // Sync external props with internal state if needed, though we'll primarily use props
    const viewMonth = currentMonth - 1;
    const viewYr = currentYear;

    const navPrevMonth = () => {
        let newMonth = currentMonth - 1;
        let newYear = currentYear;
        if (newMonth < 1) {
            newMonth = 12;
            newYear--;
        }
        onMonthChange(newMonth);
        if (newYear !== currentYear) onYearChange(newYear);
    };

    const navNextMonth = () => {
        let newMonth = currentMonth + 1;
        let newYear = currentYear;
        if (newMonth > 12) {
            newMonth = 1;
            newYear++;
        }
        onMonthChange(newMonth);
        if (newYear !== currentYear) onYearChange(newYear);
    };

    const parseDuration = (dur) => {
        if (!dur || dur === '00:00:00') return 0;
        const [h, m] = dur.split(':').map(Number);
        return h + m / 60;
    };

    // Build data map: "YYYY-MM-DD" -> { hours, isLate }
    const dataMap = useMemo(() => {
        const map = {};
        records.forEach(r => {
            map[r.date] = {
                hours: parseDuration(r.total_active_duration),
                raw: r.total_active_duration,
                isLate: r.is_late,
                isLeave: r.is_leave,
                leaveType: r.leave_type
            };
        });
        return map;
    }, [records]);

    const getLevel = (hours) => {
        if (hours === 0) return 0;
        if (hours < 4) return 1;
        if (hours < 6) return 2;
        if (hours < 8) return 3;
        return 4;
    };

    // Generate calendar days
    const calendarDays = useMemo(() => {
        const firstDay = new Date(viewYr, viewMonth, 1);
        const lastDay = new Date(viewYr, viewMonth + 1, 0);

        // Calculate days from previous month to fill the first row (start on Sunday = 0)
        const START_DAY = 0; // 0 = Sunday, 1 = Monday. Let's stick to Sunday start.
        let startOffset = firstDay.getDay() - START_DAY;
        if (startOffset < 0) startOffset += 7;

        const days = [];
        
        // Previous month days
        const prevMonthLastDay = new Date(viewYr, viewMonth, 0).getDate();
        for (let i = startOffset - 1; i >= 0; i--) {
            days.push({
                num: prevMonthLastDay - i,
                isCurrentMonth: false,
                dateStr: null
            });
        }

        // Current month days
        const numDays = lastDay.getDate();
        for (let i = 1; i <= numDays; i++) {
            const dateObj = new Date(viewYr, viewMonth, i);
            const yyyy = dateObj.getFullYear();
            const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
            const dd = String(dateObj.getDate()).padStart(2, '0');
            const dateStr = `${yyyy}-${mm}-${dd}`;
            
            days.push({
                num: i,
                isCurrentMonth: true,
                dateStr,
                isWeekend: dateObj.getDay() === 0 || dateObj.getDay() === 6
            });
        }

        // Next month days to fill final row
        const totalCells = Math.ceil(days.length / 7) * 7;
        const remaining = totalCells - days.length;
        for (let i = 1; i <= remaining; i++) {
            days.push({
                num: i,
                isCurrentMonth: false,
                dateStr: null
            });
        }

        return days;
    }, [viewYr, viewMonth]);

    const formatHoursStr = (rawStr) => {
        if (!rawStr || rawStr === '00:00:00') return '0h';
        const parts = rawStr.split(':');
        const h = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        if (m === 0) return `${h}h`;
        return `${h}h ${m}m`;
    };

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    const todayStr = new Date().toISOString().slice(0, 10);

    return (
        <div className="att-calendar">
            <div className="att-calendar__header">
                <div className="att-calendar__title">
                    {monthNames[viewMonth]} {viewYr}
                </div>
                <div className="att-calendar__nav">
                    <button className="att-calendar__nav-btn" onClick={navPrevMonth} title="Previous Month">
                        <ChevronLeft size={18} />
                    </button>
                    <button className="att-calendar__nav-btn" onClick={navNextMonth} title="Next Month">
                        <ChevronRight size={18} />
                    </button>
                </div>
            </div>

            <div className="att-calendar__weekdays">
                {weekDays.map(d => <div key={d} className="att-calendar__weekday">{d}</div>)}
            </div>

            <div className="att-calendar__grid">
                {calendarDays.map((day, idx) => {
                    if (!day.isCurrentMonth) {
                        return (
                            <div key={`out-${idx}`} className="att-calendar__day att-calendar__day--outside">
                                <span className="att-calendar__day-num">{day.num}</span>
                            </div>
                        );
                    }

                    const data = dataMap[day.dateStr];
                    const hours = data?.hours || 0;
                    const level = getLevel(hours);
                    const isToday = day.dateStr === todayStr;

                    return (
                        <div 
                            key={day.dateStr} 
                            className={`att-calendar__day ${isToday ? 'att-calendar__day--today' : ''} ${day.isWeekend ? 'att-calendar__day--weekend' : ''}`}
                        >
                            <span className="att-calendar__day-num">{day.num}</span>
                            
                            <div className="att-calendar__day-data">
                                {hours > 0 ? (
                                    <>
                                        <span className="att-calendar__hours">{formatHoursStr(data.raw)}</span>
                                        {data.isLate && <span className="att-calendar__late">LATE</span>}
                                        <div className={`att-calendar__bar att-calendar__bar--level-${level}`} />
                                    </>
                                ) : (
                                    <>
                                        <span className="att-calendar__hours att-calendar__hours--zero">-</span>
                                        {data?.isLeave ? (
                                            <>
                                                <span className="att-calendar__leave-tag">
                                                    {data.leaveType === 'Leave' ? 'LEAVE' : data.leaveType}
                                                </span>
                                                <div className={`att-calendar__bar att-calendar__bar--leave-${data.leaveType === 'Leave' ? 'yellow' : 'blue'}`} />
                                            </>
                                        ) : (
                                            <div className="att-calendar__bar att-calendar__bar--level-0" />
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="att-calendar__legend">
                <div className="att-calendar__legend-item">
                    <div className="att-calendar__legend-dot att-calendar__legend-dot--empty" /> 0h
                </div>
                <div className="att-calendar__legend-item">
                    <div className="att-calendar__legend-dot att-calendar__legend-dot--low" /> &lt;4h
                </div>
                <div className="att-calendar__legend-item">
                    <div className="att-calendar__legend-dot att-calendar__legend-dot--med" /> &lt;6h
                </div>
                <div className="att-calendar__legend-item">
                    <div className="att-calendar__legend-dot att-calendar__legend-dot--high" /> &lt;8h
                </div>
                <div className="att-calendar__legend-item">
                    <div className="att-calendar__legend-dot att-calendar__legend-dot--full" /> 8h+
                </div>
                <div className="att-calendar__legend-item">
                    <div className="att-calendar__legend-dot" style={{ backgroundColor: '#fbbc05' }} /> On Leave
                </div>
                <div className="att-calendar__legend-item">
                    <div className="att-calendar__legend-dot" style={{ backgroundColor: '#4285f4' }} /> OD / Deput.
                </div>
            </div>
        </div>
    );
}
