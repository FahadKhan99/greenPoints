import React from "react";

interface ImpactCardProps {
  icon: React.ElementType;
  value: string | number;
  title: string;
}

const ImpactCard = ({ icon: Icon, value, title }: ImpactCardProps) => {
  return (
    <div className="rounded-xl flex flex-col bg-gray-50 border border-gray-100 transition-all duration-300 ease-in-out hover:shadow-md shadow-sm p-6">
      <Icon className="text-green-500 w-10 h-10 mb-4" />
      <p className="text-3xl font-bold mb-2 text-gray-800">{value}</p>
      <p className="text-sm text-gray-600">{title}</p>
    </div>
  );
};

export default ImpactCard;
