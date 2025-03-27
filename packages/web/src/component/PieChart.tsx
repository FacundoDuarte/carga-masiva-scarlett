import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { ItemCounts } from 'utils/src/types';

interface RechartsPieChartProps {
  data?: ItemCounts;
  colors?: string[];
  width?: number;
  height?: number;
}

const RechartsPieChart: React.FC<RechartsPieChartProps> = ({ 
  data,
  colors = ['#FFBB28', '#00C49F', '#0088FE', '#FF8042', '#FF4444', '#A020F0'],
  width = 400,
  height = 400
}) => {
  // Use fallback data if none provided
  const chartData = data || {
    pending: 0,
    running: 0,
    succeeded: 0,
    failed: 0,
  };

  // Convert counts to array for the chart, filtering zero values
  const pieData = [
    { name: 'Pending', value: chartData.pending },
    { name: 'Running', value: chartData.running },
    { name: 'Succeeded', value: chartData.succeeded },
    { name: 'Failed', value: chartData.failed },
  ].filter(item => item.value > 0); // Only show states with values > 0

  // If no data, show a message
  if (pieData.length === 0) {
    return <div>No hay datos para mostrar</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={pieData}
          cx="50%"
          cy="50%"
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
        >
          {pieData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(value) => [`${value} items`, 'Cantidad']} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
};

export default RechartsPieChart;