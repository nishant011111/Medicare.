import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  Clock,
  RefreshCw,
  XCircle,
} from 'lucide-react';
import { ApplicationShell } from '../layouts/ApplicationShell';
import {
  AppointmentScheduler,
  ScheduledAppointmentResult,
} from '../components/appointments/AppointmentScheduler';
import { apiRequest, ApiClientError } from '../services/api';
import { useToast } from '../hooks/useToast';

interface AppointmentListItem {
  id: string;
  appointmentNumber: string;
  hospitalId: string;
  hospitalName?: string;
  departmentName?: string;
  doctorId: string;
  doctorName?: string;
  doctorSpecialization?: string;
  patientName?: string;
  appointmentDate: string;
  slotStartTime: string;
  slotEndTime: string;
  type: 'OPD' | 'WALK_IN' | 'FOLLOW_UP';
  status: string;
  reasonForVisit: string;
}

const STATUS_FILTERS = ['ALL', 'CONFIRMED', 'CHECKED_IN', 'COMPLETED', 'CANCELLED'] as const;

function renderStatusIndicator(status: string) {
  switch (status) {
    case 'CONFIRMED':
    case 'BOOKED':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-teal-700 dark:text-teal-400">
          <Clock className="w-3.5 h-3.5" />
          Confirmed
        </span>
      );
    case 'CHECKED_IN':
    case 'IN_PROGRESS':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-700 dark:text-blue-400">
          <CalendarClock className="w-3.5 h-3.5" />
          Checked In
        </span>
      );
    case 'COMPLETED':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Completed
        </span>
      );
    case 'CANCELLED':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
          <XCircle className="w-3.5 h-3.5" />
          Cancelled
        </span>
      );
    default:
      return <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{status}</span>;
  }
}

export const AppointmentsPage: React.FC = () => {
  const { showToast } = useToast();
  const [appointments, setAppointments] = useState<AppointmentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>('ALL');
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const loadAppointments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiRequest<{ success: boolean; data: AppointmentListItem[] }>(
        '/appointments'
      );
      const list = Array.isArray(response?.data) ? response.data : [];
      list.sort((a, b) =>
        `${b.appointmentDate} ${b.slotStartTime}`.localeCompare(
          `${a.appointmentDate} ${a.slotStartTime}`
        )
      );
      setAppointments(list);
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? err.message
          : 'Unable to load appointments right now.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAppointments();
  }, [loadAppointments]);

  const handleBookingSuccess = (_booked: ScheduledAppointmentResult) => {
    void loadAppointments();
  };

  const handleCancel = async (appointmentId: string, appointmentNumber: string) => {
    if (cancellingId) return;
    setCancellingId(appointmentId);
    try {
      await apiRequest(`/appointments/${encodeURIComponent(appointmentId)}/cancel`, {
        method: 'PATCH',
        body: JSON.stringify({ reason: 'Cancelled via MediCore Web Portal' }),
      });
      showToast({
        title: 'Appointment Cancelled',
        description: `Appointment ${appointmentNumber} has been cancelled.`,
        variant: 'info',
      });
      void loadAppointments();
    } catch (err) {
      showToast({
        title: 'Cancellation Failed',
        description:
          err instanceof ApiClientError ? err.message : 'Unable to cancel this appointment.',
        variant: 'error',
      });
    } finally {
      setCancellingId(null);
    }
  };

  const filteredAppointments = useMemo(() => {
    if (statusFilter === 'ALL') return appointments;
    return appointments.filter((a) => a.status === statusFilter);
  }, [appointments, statusFilter]);

  return (
    <ApplicationShell
      pageTitle="Appointments"
      pageSubtitle="Schedule outpatient consultations, view real-time physician availability, and manage bookings."
      breadcrumbs={[
        { label: 'MediCore', path: '/dashboard' },
        { label: 'Appointments' },
      ]}
    >
      <div className="space-y-6">
        <AppointmentScheduler onBookingSuccess={handleBookingSuccess} />

        {/* Appointments Schedule Table */}
        <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-[#172B43] dark:text-slate-100">
                Scheduled Appointments
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
                {filteredAppointments.length} record{filteredAppointments.length === 1 ? '' : 's'} shown
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 p-0.5 bg-slate-50 dark:bg-slate-950">
                {STATUS_FILTERS.map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => setStatusFilter(filter)}
                    className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors ${
                      statusFilter === filter
                        ? 'bg-white dark:bg-slate-800 text-[#172B43] dark:text-slate-100 shadow-xs'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    {filter === 'ALL'
                      ? 'All'
                      : filter
                          .toLowerCase()
                          .replace('_', ' ')
                          .replace(/\b\w/g, (c) => c.toUpperCase())}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => void loadAppointments()}
                className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-[#0F766E]"
                aria-label="Reload appointments"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {error && (
            <div className="m-6 rounded-lg border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/30 p-3 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 3 }).map((_, idx) => (
                <div
                  key={idx}
                  className="h-12 rounded-lg bg-slate-100 dark:bg-slate-800/50 animate-pulse"
                />
              ))}
            </div>
          ) : filteredAppointments.length === 0 ? (
            <div className="p-10 text-center">
              <CalendarClock className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                No appointments found
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Use the scheduler above to book your next clinical consultation.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <th className="py-3 px-6">Ref #</th>
                    <th className="py-3 px-4">Physician</th>
                    <th className="py-3 px-4">Hospital & Dept</th>
                    <th className="py-3 px-4">Date & Time</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-6 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                  {filteredAppointments.map((apt) => {
                    const canCancel = apt.status === 'CONFIRMED' || apt.status === 'BOOKED';
                    return (
                      <tr
                        key={apt.id}
                        className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors"
                      >
                        <td className="py-3.5 px-6 font-mono font-semibold text-[#172B43] dark:text-slate-100 tabular-nums whitespace-nowrap">
                          {apt.appointmentNumber}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-[#172B43] dark:text-slate-100">
                            {apt.doctorName || 'Attending Doctor'}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            {apt.doctorSpecialization || 'Outpatient'}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="text-slate-700 dark:text-slate-200">
                            {apt.hospitalName || 'MediCore Hospital'}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            {apt.departmentName || 'General'}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 tabular-nums whitespace-nowrap">
                          <div className="font-medium text-[#172B43] dark:text-slate-100">
                            {apt.appointmentDate}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            {apt.slotStartTime} – {apt.slotEndTime}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {renderStatusIndicator(apt.status)}
                        </td>
                        <td className="py-3.5 px-6 text-right whitespace-nowrap">
                          {canCancel ? (
                            <button
                              type="button"
                              disabled={cancellingId === apt.id}
                              onClick={() => void handleCancel(apt.id, apt.appointmentNumber)}
                              className="text-xs font-medium text-rose-600 dark:text-rose-400 hover:underline disabled:opacity-50"
                            >
                              {cancellingId === apt.id ? 'Cancelling...' : 'Cancel'}
                            </button>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </ApplicationShell>
  );
};
