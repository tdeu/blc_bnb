import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface CountdownTimerProps {
  targetDate: Date;
  className?: string;
}

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  isPast: boolean;
}

const calculateTimeRemaining = (targetDate: Date): TimeRemaining => {
  const now = new Date();
  const difference = targetDate.getTime() - now.getTime();
  const isPast = difference < 0;
  const absoluteDifference = Math.abs(difference);

  const days = Math.floor(absoluteDifference / (1000 * 60 * 60 * 24));
  const hours = Math.floor((absoluteDifference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((absoluteDifference % (1000 * 60 * 60)) / (1000 * 60));

  return { days, hours, minutes, isPast };
};

const CountdownTimer: React.FC<CountdownTimerProps> = ({ targetDate, className = '' }) => {
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining>(
    calculateTimeRemaining(targetDate)
  );

  useEffect(() => {
    // Update immediately
    setTimeRemaining(calculateTimeRemaining(targetDate));

    // Then update every minute
    const interval = setInterval(() => {
      setTimeRemaining(calculateTimeRemaining(targetDate));
    }, 60000); // Update every 60 seconds

    return () => clearInterval(interval);
  }, [targetDate]);

  const formatTimeString = () => {
    const { days, hours, minutes, isPast } = timeRemaining;

    const parts: string[] = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0 || parts.length === 0) parts.push(`${minutes}m`);

    const timeString = parts.join(' ');

    if (isPast) {
      return `Expired ${timeString} ago`;
    } else {
      return `Expires in ${timeString}`;
    }
  };

  return (
    <div className={`flex items-center space-x-1 ${className}`}>
      <Clock className={`h-4 w-4 ${timeRemaining.isPast ? 'text-red-500' : 'text-blue-500'}`} />
      <span className={`text-sm font-medium ${timeRemaining.isPast ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'}`}>
        {formatTimeString()}
      </span>
    </div>
  );
};

export default CountdownTimer;
