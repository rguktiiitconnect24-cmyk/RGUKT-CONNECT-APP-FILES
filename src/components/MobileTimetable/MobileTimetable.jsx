import { Calendar, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { mapSubjectName } from '../../utils/formatUtils';
import './MobileTimetable.css';

const MobileTimetable = ({ schedule, selectedDay, timeSlots, breaks = [] }) => {
    const convertTo12Hour = (time24) => {
        if (!time24) return '';
        const [hours, minutes] = time24.split(':');
        const h = parseInt(hours, 10);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const h12 = h % 12 || 12;
        return `${h12.toString().padStart(2, '0')}:${minutes} ${ampm}`;
    };
    // Make sure we have a valid expanded day, defaulting to selectedDay or Monday if not found
    const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const initialDay = daysOfWeek.includes(selectedDay) ? selectedDay : 'Monday';
    const [expandedDay, setExpandedDay] = useState(initialDay);

    // Dynamic color mapping based on subject string hash to keep colors consistent
    const getSubjectColorClass = (subject) => {
        if (!subject || subject === 'Free' || subject === '-') return '';
        const mappedName = mapSubjectName(subject);
        let hash = 0;
        for (let i = 0; i < mappedName.length; i++) {
            hash = mappedName.charCodeAt(i) + ((hash << 5) - hash);
        }
        // Use mod 6 to distribute among the 6 gradient styles
        const index = Math.abs(hash % 6);
        return `subject-color-${index}`;
    };

    const toggleDay = (day) => {
        setExpandedDay(day === expandedDay ? null : day);
    };

    return (
        <div className="mobile-timetable-container">
            <div className="mobile-timetable-header">
                <h2 className="mobile-timetable-title">Weekly Time Table</h2>
                <div className="mobile-timetable-divider"></div>
            </div>
            
            {daysOfWeek.map(day => {
                const daySchedule = schedule[day] || [];
                // Only count non-free periods for the summary
                const activePeriods = daySchedule.filter(s => s && s !== 'Free' && s !== '-').length;
                const isExpanded = expandedDay === day;

                return (
                    <div key={day} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {/* Accordion Header */}
                        <div 
                            className={`mobile-day-accordion ${isExpanded ? 'expanded' : ''}`}
                            onClick={() => toggleDay(day)}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Calendar size={18} style={{ color: isExpanded ? '#818cf8' : '#94a3b8' }} />
                                <h3 className="mobile-day-title">{day.substring(0, 3).toUpperCase()} <span className="mobile-day-periods">({activePeriods} Periods)</span></h3>
                            </div>
                            <div style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)', color: isExpanded ? '#818cf8' : '#64748b' }}>
                                <ChevronDown size={20} strokeWidth={2.5} />
                            </div>
                        </div>

                        {/* Expanded Period Cards - Always rendered for smooth CSS transition */}
                        <div className={`mobile-day-content-wrapper ${isExpanded ? 'open' : ''}`}>
                            <div className="mobile-day-expanded">
                                {(() => {
                                    const blocks = [];
                                    for (let i = 0; i < 7; i++) {
                                        if (daySchedule[i] === '\u200B') continue;
                                        let colSpan = 1;
                                        while (i + colSpan < 7 && daySchedule[i + colSpan] === '\u200B') colSpan++;
                                        blocks.push({ idx: i, colSpan, subject: daySchedule[i] });
                                    }
                                    
                                    const renderedElements = [];
                                    
                                    blocks.forEach(block => {
                                        const startIdx = block.idx;
                                        const endIdx = block.idx + block.colSpan - 1;
                                        const startPeriodNum = startIdx + 1;
                                        const endPeriodNum = endIdx + 1;
                                        
                                        const startTimeStr = timeSlots[startIdx].split(' - ')[0];
                                        const endTimeStr = timeSlots[endIdx].split(' - ')[1];
                                        const combinedTimeSlot = `${startTimeStr} - ${endTimeStr}`;
                                        
                                        const periodLabel = block.colSpan > 1 ? `P${startPeriodNum}-P${endPeriodNum}` : `P${startPeriodNum}`;
                                        
                                        const subject = block.subject;
                                        const isFree = !subject || subject === 'Free' || subject === '-';
                                        const mappedSubject = mapSubjectName(subject);
                                        const colorClass = getSubjectColorClass(subject);
                                        
                                        const periodCard = (
                                            <div key={`p${startPeriodNum}`} className={`mobile-period-card ${isFree ? 'mobile-free-period' : colorClass}`}>
                                                <div className="mobile-period-header">
                                                    <span className="mobile-period-badge">{periodLabel}</span>
                                                    <span className="mobile-period-time">{combinedTimeSlot}</span>
                                                </div>
                                                {!isFree && (
                                                    <h4 className="mobile-period-subject-full">{mappedSubject}</h4>
                                                )}
                                                {isFree && <span>Free Period</span>}
                                            </div>
                                        );
                                        
                                        renderedElements.push(periodCard);
                                        
                                        // Render Lunch Break explicitly after Period 4 (index 3)
                                        // If a merged block crosses index 3, lunch will render after the block ends.
                                        if (endIdx === 3) {
                                            const lunchBreak = breaks.find(b => b.label && b.label.toLowerCase().includes('lunch'));
                                            const lunchLabel = lunchBreak ? `${convertTo12Hour(lunchBreak.start)} - ${convertTo12Hour(lunchBreak.end)}` : '12:40 - 01:40 PM';
                                            
                                            renderedElements.push(
                                                <div key="lunch-break" className="mobile-lunch-card">
                                                    <span className="mobile-lunch-time">{lunchLabel}</span>
                                                    <h4 className="mobile-lunch-title">{lunchBreak ? lunchBreak.label : 'Lunch Break'}</h4>
                                                </div>
                                            );
                                        }
                                    });
                                    
                                    return renderedElements;
                                })()}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default MobileTimetable;
