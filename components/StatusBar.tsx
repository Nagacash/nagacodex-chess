
import React from 'react';

interface StatusBarProps {
  message: string;
}

const StatusBar: React.FC<StatusBarProps> = ({ message }) => {
  return (
    <div className="p-3 bg-slate-700 rounded-lg shadow-md text-center">
      <p className="text-lg font-semibold text-slate-100">{message}</p>
    </div>
  );
};

export default StatusBar;
    