import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Icons } from './Icons';
import { getMonthlyActivity } from '../services/calendarService';
import { auth } from '../services/firebase';

interface CalendarModalProps {
    currentDate: string;
    onSelectDate: (date: string) => void;
    onClose: () => void;
}

export const CalendarModal: React.FC<CalendarModalProps> = ({ currentDate, onSelectDate, onClose }) => {
    const [viewDate, setViewDate] = useState(new Date(currentDate));
    const [activeDates, setActiveDates] = useState<Set<string>>(new Set());
    
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth(); // 0-11

    useEffect(() => {
        if (!auth.currentUser) return;
        
        const fetchActivity = async () => {
            const dates = await getMonthlyActivity(auth.currentUser!.uid, year, month);
            setActiveDates(new Set(dates));
        };
        
        fetchActivity();
    }, [year, month]);

    const changeMonth = (offset: number) => {
        const newDate = new Date(viewDate);
        newDate.setMonth(newDate.getMonth() + offset);
        setViewDate(newDate);
    };

    // Calendar Logic
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 = Sun, 1 = Mon...
    // Adjust for Monday start (French style) -> 0 = Mon, 6 = Sun
    const startDay = (firstDayOfMonth + 6) % 7; 

    const days = [];
    for (let i = 0; i < startDay; i++) {
        days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
        days.push(i);
    }

    const MONTHS = [
        "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
        "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
    ];

    const formatDate = (day: number) => {
        const d = new Date(year, month, day);
        return d.toISOString().split('T')[0];
    };

    return (
        <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4"
            onClick={onClose}
        >
            <motion.div 
                initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
                className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="bg-primary p-6 text-white flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-black">{MONTHS[month]}</h2>
                        <p className="text-primary-100 font-medium">{year}</p>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                            <Icons.ChevronLeft size={24} />
                        </button>
                        <button onClick={() => changeMonth(1)} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                            <Icons.ChevronRight size={24} />
                        </button>
                    </div>
                </div>

                {/* Grid */}
                <div className="p-6">
                    {/* Week Days */}
                    <div className="grid grid-cols-7 mb-4">
                        {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => (
                            <div key={i} className="text-center text-xs font-bold text-gray-400">
                                {d}
                            </div>
                        ))}
                    </div>

                    {/* Days */}
                    <div className="grid grid-cols-7 gap-y-4 gap-x-2">
                        {days.map((day, i) => {
                            if (day === null) return <div key={i} />;
                            
                            const dateStr = formatDate(day);
                            const isActive = activeDates.has(dateStr);
                            const isSelected = dateStr === currentDate;
                            const isToday = dateStr === new Date().toISOString().split('T')[0];

                            return (
                                <div key={i} className="flex flex-col items-center justify-center relative">
                                    <button 
                                        onClick={() => { onSelectDate(dateStr); onClose(); }}
                                        className={`
                                            w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold transition-all relative
                                            ${isSelected ? 'bg-primary text-white shadow-lg shadow-primary/30 scale-110 z-10' : 'text-gray-700 hover:bg-gray-100'}
                                            ${!isSelected && isToday ? 'border-2 border-primary text-primary' : ''}
                                        `}
                                    >
                                        {day}
                                        {isActive && !isSelected && (
                                            <div className="absolute bottom-1.5 w-1 h-1 bg-emerald-500 rounded-full"></div>
                                        )}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
                
                <div className="p-4 border-t border-gray-100 flex justify-center">
                    <button onClick={() => { onSelectDate(new Date().toISOString().split('T')[0]); onClose(); }} className="text-sm font-bold text-primary hover:underline">
                        Revenir à aujourd'hui
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
};

