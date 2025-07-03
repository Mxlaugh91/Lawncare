// src/components/admin/locations/LocationSummaryCards.tsx
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Users, DollarSign, Scissors } from 'lucide-react';
import { TimeEntry } from '@/types';

interface LocationSummaryCardsProps {
  timeEntries: TimeEntry[];
  loading: boolean;
  onCardClick: (type: 'timeEntries' | 'employees' | 'edgeCutting' | 'notes') => void;
}

export const LocationSummaryCards: React.FC<LocationSummaryCardsProps> = ({
  timeEntries,
  loading,
  onCardClick,
}) => {
  const getTotalHours = () => {
    return timeEntries.reduce((total, entry) => total + entry.hours, 0);
  };

  const getUniqueEmployees = () => {
    const employeeMap = new Map<string, { name: string; totalHours: number; registrations: number }>();
    timeEntries.forEach(entry => {
      if (entry.employeeName) {
        const existing = employeeMap.get(entry.employeeName);
        if (existing) {
          existing.totalHours += entry.hours;
          existing.registrations += 1;
        } else {
          employeeMap.set(entry.employeeName, {
            name: entry.employeeName,
            totalHours: entry.hours,
            registrations: 1
          });
        }
      }
    });
    return Array.from(employeeMap.values());
  };

  const getEdgeCuttingEntriesCount = () => {
    return timeEntries.filter(entry => entry.edgeCuttingDone).length;
  };

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Time Usage Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Clock className="mr-2 h-5 w-5 text-blue-600" />
            Oppsummert tidsbruk
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="animate-pulse space-y-3">
              <div className="h-4 bg-gray-200 rounded w-3/4" />
              <div className="h-4 bg-gray-200 rounded w-1/2" />
              <div className="h-4 bg-gray-200 rounded w-2/3" />
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div
                  className="text-center p-3 bg-blue-50 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors"
                  onClick={() => onCardClick('timeEntries')}
                >
                  <div className="text-2xl font-bold text-blue-700">
                    {getTotalHours()}
                  </div>
                  <div className="text-sm text-blue-600">Timer totalt</div>
                </div>
                <div
                  className="text-center p-3 bg-green-50 rounded-lg cursor-pointer hover:bg-green-100 transition-colors"
                  onClick={() => onCardClick('timeEntries')}
                >
                  <div className="text-2xl font-bold text-green-700">
                    {timeEntries.length}
                  </div>
                  <div className="text-sm text-green-600">Registreringer</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div
                  className="text-center p-3 bg-amber-50 rounded-lg cursor-pointer hover:bg-amber-100 transition-colors"
                  onClick={() => onCardClick('edgeCutting')}
                >
                  <div className="text-2xl font-bold text-amber-700">
                    {getEdgeCuttingEntriesCount()}
                  </div>
                  <div className="text-sm text-amber-600 flex items-center justify-center">
                    <Scissors className="mr-1 h-3 w-3" />
                    Kantklipp utført
                  </div>
                </div>
                <div
                  className="text-center p-3 bg-purple-50 rounded-lg cursor-pointer hover:bg-purple-100 transition-colors"
                  onClick={() => onCardClick('employees')}
                >
                  <div className="text-2xl font-bold text-purple-700">
                    {getUniqueEmployees().length}
                  </div>
                  <div className="text-sm text-purple-600">Unike ansatte</div>
                </div>
              </div>

              {getUniqueEmployees().length > 0 && (
                <div>
                  <h4 className="font-medium mb-2 flex items-center">
                    <Users className="mr-2 h-4 w-4" />
                    Ansatte som har jobbet her:
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {getUniqueEmployees().slice(0, 5).map((employee, index) => (
                      <Badge key={index} variant="outline">
                        {employee.name}
                      </Badge>
                    ))}
                    {getUniqueEmployees().length > 5 && (
                      <Badge
                        variant="outline"
                        className="cursor-pointer hover:bg-muted"
                        onClick={() => onCardClick('employees')}
                      >
                        +{getUniqueEmployees().length - 5} flere
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cost Estimate */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <DollarSign className="mr-2 h-5 w-5 text-green-600" />
            Kostnadsoverslag
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="text-center">
                <div className="text-lg font-semibold text-gray-600 mb-2">
                  Funksjon ikke implementert
                </div>
                <p className="text-sm text-gray-500">
                  For å beregne kostnader kan du legge til timelønn i ansattprofiler.
                </p>
              </div>
            </div>

            <div className="text-sm text-gray-600">
              <h4 className="font-medium mb-2">Implementeringsforslag:</h4>
              <ul className="list-disc list-inside space-y-1">
                <li>Legg til timelønn-felt i brukerprofilene</li>
                <li>Beregn totalkostnad: timer × timelønn</li>
                <li>Vis kostnad per ansatt og totalkostnad</li>
                <li>Sammenlign kostnader over tid</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};