
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface RaciTask {
  task: string;
  roles: Record<string, string>;
}

interface RaciMatrixProps {
  tasks: RaciTask[];
  roles: string[];
  title?: string;
  colorScheme?: 'default' | 'financial' | 'retention' | 'performance' | 'operational';
}

export const RaciMatrix = ({ 
  tasks, 
  roles, 
  title = 'RACI Matrix', 
  colorScheme = 'default' 
}: RaciMatrixProps) => {
  const getRaciColor = (value: string) => {
    const letter = value?.toString().toUpperCase().trim();
    
    switch (letter) {
      case 'R': return 'bg-green-100 text-green-800';
      case 'A': return 'bg-blue-100 text-blue-800';
      case 'C': return 'bg-amber-100 text-amber-800';
      case 'I': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-50 text-gray-500';
    }
  };

  const getColorClassByScheme = () => {
    switch (colorScheme) {
      case 'financial': return 'bg-green-50 border-green-100';
      case 'retention': return 'bg-blue-50 border-blue-100';
      case 'performance': return 'bg-purple-50 border-purple-100';
      case 'operational': return 'bg-amber-50 border-amber-100';
      default: return 'bg-gray-50 border-gray-100';
    }
  };

  const getRaciTitle = (letter: string) => {
    switch (letter?.toString().toUpperCase().trim()) {
      case 'R': return 'Responsible';
      case 'A': return 'Accountable';
      case 'C': return 'Consulted';
      case 'I': return 'Informed';
      default: return letter;
    }
  };

  return (
    <Card className={`my-4 ${getColorClassByScheme()}`}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tasks / Activities
                </th>
                {roles.map(role => (
                  <th 
                    key={role} 
                    scope="col" 
                    className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    {role}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {tasks.map((task, taskIndex) => (
                <tr key={taskIndex} className={taskIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {task.task}
                  </td>
                  {roles.map(role => {
                    const value = task.roles[role] || '';
                    return (
                      <td 
                        key={`${taskIndex}-${role}`} 
                        className="px-6 py-4 whitespace-nowrap text-center"
                      >
                        <span 
                          className={`px-2 py-1 text-xs font-medium rounded-full ${getRaciColor(value)}`}
                          title={getRaciTitle(value)}
                        >
                          {value}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="mt-6 flex flex-wrap gap-3">
          <div className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
            R - Responsible
          </div>
          <div className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
            A - Accountable
          </div>
          <div className="px-2 py-1 text-xs font-medium rounded-full bg-amber-100 text-amber-800">
            C - Consulted
          </div>
          <div className="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800">
            I - Informed
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
