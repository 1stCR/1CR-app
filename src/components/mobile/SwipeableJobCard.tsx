import React, { useState } from 'react';
import { Phone, MapPin, Clock } from 'lucide-react';
import { navigateToAddress } from '../../utils/navigation';

interface Job {
  id: string;
  customer_name: string;
  appliance_type: string;
  issue_description: string;
  scheduled_time: string;
  address: string;
  phone: string;
}

interface SwipeableJobCardProps {
  job: Job;
  onClick?: () => void;
}

export function SwipeableJobCard({ job, onClick }: SwipeableJobCardProps) {
  const [startX, setStartX] = useState(0);
  const [currentX, setCurrentX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    setStartX(e.touches[0].clientX);
    setIsSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isSwiping) return;
    const x = e.touches[0].clientX;
    const diff = x - startX;
    // Limit swipe to -200px (left) or 200px (right)
    setCurrentX(Math.max(-200, Math.min(200, diff)));
  };

  const handleTouchEnd = () => {
    setIsSwiping(false);

    // If swiped far enough, trigger action
    if (currentX < -100) {
      // Swiped left - show call action
      handleCall();
    } else if (currentX > 100) {
      // Swiped right - show navigate action
      handleNavigate();
    }

    // Reset position
    setCurrentX(0);
  };

  const handleCall = () => {
    // Vibrate on tap (if supported)
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
    const cleanNumber = job.phone.replace(/\D/g, '');
    window.location.href = `tel:${cleanNumber}`;
  };

  const handleNavigate = () => {
    // Vibrate on tap (if supported)
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
    navigateToAddress(job.address);
  };

  return (
    <div className="relative overflow-hidden mb-3">
      {/* Background actions */}
      <div className="absolute inset-0 flex">
        <div className="flex-1 bg-green-500 flex items-center justify-start pl-6">
          <MapPin className="text-white" size={24} />
        </div>
        <div className="flex-1 bg-blue-500 flex items-center justify-end pr-6">
          <Phone className="text-white" size={24} />
        </div>
      </div>

      {/* Card content */}
      <div
        className="relative bg-white rounded-lg shadow p-4 touch-pan-y cursor-pointer"
        style={{
          transform: `translateX(${currentX}px)`,
          transition: isSwiping ? 'none' : 'transform 0.3s ease'
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={() => {
          if (!isSwiping && onClick) {
            onClick();
          }
        }}
      >
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-semibold text-lg">{job.customer_name}</h3>
          <span className="text-sm text-gray-500 flex items-center">
            <Clock size={16} className="mr-1" />
            {new Date(job.scheduled_time).toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit'
            })}
          </span>
        </div>

        <p className="text-gray-700 mb-1">{job.appliance_type}</p>
        <p className="text-gray-600 text-sm mb-2 line-clamp-2">{job.issue_description}</p>

        <div className="flex gap-2 mt-3">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleCall();
            }}
            className="flex-1 bg-blue-100 text-blue-700 py-2 rounded-lg flex items-center justify-center min-h-[44px] active:bg-blue-200"
          >
            <Phone size={18} className="mr-2" />
            Call
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleNavigate();
            }}
            className="flex-1 bg-green-100 text-green-700 py-2 rounded-lg flex items-center justify-center min-h-[44px] active:bg-green-200"
          >
            <MapPin size={18} className="mr-2" />
            Navigate
          </button>
        </div>
      </div>
    </div>
  );
}
