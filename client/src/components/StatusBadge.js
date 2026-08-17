import React from 'react';
import { getOrderStatusInfo } from '../utils/formatting';
import * as Icons from 'lucide-react';

const StatusBadge = ({ status, showIcon = true, className = '' }) => {
  const info = getOrderStatusInfo(status);
  const IconComponent = Icons[info.icon] || Icons.Clock;
  
  return (
    <span className={inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold   }>
      {showIcon && <IconComponent size={12} className={info.textColor} />}
      {info.label}
    </span>
  );
};

export default StatusBadge;
