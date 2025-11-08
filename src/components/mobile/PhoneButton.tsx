import { Phone } from 'lucide-react';

interface PhoneButtonProps {
  phoneNumber: string;
  label?: string;
  className?: string;
}

export function PhoneButton({ phoneNumber, label = 'Call', className = '' }: PhoneButtonProps) {
  const handleCall = () => {
    // Vibrate on tap (if supported)
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }

    // Format phone number for tel: link
    const cleanNumber = phoneNumber.replace(/\D/g, '');
    window.location.href = `tel:${cleanNumber}`;
  };

  return (
    <button
      onClick={handleCall}
      className={`flex items-center gap-2 bg-blue-600 text-white py-3 px-4 rounded-lg min-h-[44px] active:bg-blue-700 ${className}`}
    >
      <Phone size={20} />
      {label}
    </button>
  );
}
