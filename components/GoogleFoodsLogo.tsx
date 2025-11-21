import React from 'react';

export const GoogleFoodsLogo: React.FC<{ className?: string, large?: boolean }> = ({ className = "", large = false }) => {
  const textSize = large ? "text-5xl md:text-7xl" : "text-2xl md:text-3xl";
  
  return (
    <div className={`font-google font-bold tracking-tight flex items-center justify-center ${textSize} ${className}`}>
      <span className="text-[#4285F4]">G</span>
      <span className="text-[#DB4437]">o</span>
      <span className="text-[#F4B400]">o</span>
      <span className="text-[#4285F4]">g</span>
      <span className="text-[#0F9D58]">l</span>
      <span className="text-[#DB4437] mr-2 md:mr-4">e</span>
      <span className="text-[#5f6368]">Foods</span>
    </div>
  );
};
