import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  RefreshCw,
  Search,
  Stethoscope,
} from 'lucide-react';
import { apiRequest, ApiClientError } from '../../services/api';
import { useToast } from '../../hooks/useToast';
import { Button } from '../ui/Button';

export interface DoctorDirectoryOption {
  id: string;
  hospitalId: string;
  hospitalName?: string;
  hospitalCity?: string;
  departmentId: string;
  departmentName: string;
  fullName: string;
  specialization: string;
  qualifications: string;
  experienceYears: number;
  consultationFee: number;
  slotDurationMinutes: number;
  isAvailable: boolean;
}

export interface DoctorTimeSlot {
  slotStartTime: string;
  slotEndTime: string;
  isAvailable: boolean;
  isBooked: boolean;
  isBlocked: boolean;
}

interface DoctorAvailabilityPayload {
  doctorId: string;
  doctorName: string;
  specialization: string;
  departmentName: string;
  date: string;
  isWorkingDay: boolean;
  blockedReasons: string[];
  slotDurationMinutes: number;
  slots: DoctorTimeSlot[];
}

export interface ScheduledAppointmentResult {
  id: string;
  appointmentNumber: string;
  hospitalId: string;
  hospitalName?: string;
  departmentId: string;
  departmentName?: string;
  doctorId: string;
  doctorName?: string;
  doctorSpecialization?: string;
  appointmentDate: string;
  slotStartTime: string;
  slotEndTime: string;
  type: 'OPD' | 'WALK_IN' | 'FOLLOW_UP';
  status: string;
  reasonForVisit: string;
}

export interface AppointmentSchedulerProps {
  initialDoctorId?: string;
  onBookingSuccess?: (appointment: ScheduledAppointmentResult) => void;
  className?: string;
}

function getLocalIsoDate(offsetDays = 0): string {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatQuickDateLabel(isoDate: string): { weekday: string; dayNum: string; month: string } {
  const parsed = new Date(`${isoDate}T00:00:00`);
  return {
    weekday: parsed.toLocaleDateString(undefined, { weekday: 'short' }),
    dayNum: String(parsed.getDate()).padStart(2, '0'),
    month: parsed.toLocaleDateString(undefined, { month: 'short' }),
  };
}

function formatDisplayDate(isoDate: string): string {
  const parsed = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return isoDate;
  return parsed.toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export const AppointmentScheduler: React.FC<AppointmentSchedulerProps> = ({
  initialDoctorId,
  onBookingSuccess,
  className = '',
}) => {
  const { showToast } = useToast();

  const todayIso = useMemo(() => getLocalIsoDate(0), []);
  const quickDates = useMemo(
    () => Array.from({ length: 7 }, (_, idx) => getLocalIsoDate(idx)),
    []
  );

  const [doctors, setDoctors] = useState<DoctorDirectoryOption[]>([]);
  const [loadingDoctors, setLoadingDoctors] = useState(true);
  const [doctorsError, setDoctorsError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('ALL');
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>(initialDoctorId || '');

  const [selectedDate, setSelectedDate] = useState<string>(todayIso);
  const [availability, setAvailability] = useState<DoctorAvailabilityPayload | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<DoctorTimeSlot | null>(null);

  const [visitType, setVisitType] = useState<'OPD' | 'FOLLOW_UP'>('OPD');
  const [reasonForVisit, setReasonForVisit] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [confirmedBooking, setConfirmedBooking] = useState<ScheduledAppointmentResult | null>(null);

  const fetchDoctors = useCallback(async () => {
    setLoadingDoctors(true);
    setDoctorsError(null);
    try {
      const response = await apiRequest<{ success: boolean; data: DoctorDirectoryOption[] }>(
        '/doctors'
      );
      const list = Array.isArray(response?.data) ? response.data : [];
      setDoctors(list);
      setSelectedDoctorId((prev) => {
        if (prev && list.some((doc) => doc.id === prev)) return prev;
        if (initialDoctorId && list.some((doc) => doc.id === initialDoctorId)) {
          return initialDoctorId;
        }
        return list[0]?.id || '';
      });
    } catch (err) {
      setDoctorsError(
        err instanceof ApiClientError
          ? err.message
          : 'Unable to load available physicians right now.'
      );
    } finally {
      setLoadingDoctors(false);
    }
  }, [initialDoctorId]);

  useEffect(() => {
    void fetchDoctors();
  }, [fetchDoctors]);

  const specialties = useMemo(() => {
    const unique = new Set<string>();
    doctors.forEach((d) => {
      if (d.specialization) unique.add(d.specialization);
    });
    return ['ALL', ...Array.from(unique).sort()];
  }, [doctors]);

  const filteredDoctors = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return doctors.filter((doc) => {
      if (selectedSpecialty !== 'ALL' && doc.specialization !== selectedSpecialty) {
        return false;
      }
      if (!q) return true;
      return (
        doc.fullName.toLowerCase().includes(q) ||
        doc.specialization.toLowerCase().includes(q) ||
        doc.departmentName.toLowerCase().includes(q) ||
        (doc.hospitalName && doc.hospitalName.toLowerCase().includes(q))
      );
    });
  }, [doctors, searchTerm, selectedSpecialty]);

  const selectedDoctor = useMemo(
    () => doctors.find((d) => d.id === selectedDoctorId) || null,
    [doctors, selectedDoctorId]
  );

  const fetchAvailability = useCallback(async (doctorId: string, date: string) => {
    if (!doctorId || !date) {
      setAvailability(null);
      return;
    }
    setLoadingSlots(true);
    setSlotsError(null);
    setSelectedSlot(null);
    try {
      const response = await apiRequest<{ success: boolean; data: DoctorAvailabilityPayload }>(
        `/doctors/${encodeURIComponent(doctorId)}/availability?date=${encodeURIComponent(date)}`
      );
      setAvailability(response?.data || null);
    } catch (err) {
      setAvailability(null);
      setSlotsError(
        err instanceof ApiClientError
          ? err.message
          : 'Unable to load time slots for the selected date.'
      );
    } finally {
      setLoadingSlots(false);
    }
  }, []);

  useEffect(() => {
    if (selectedDoctorId && selectedDate) {
      void fetchAvailability(selectedDoctorId, selectedDate);
    }
  }, [selectedDoctorId, selectedDate, fetchAvailability]);

  const availableSlotCount = useMemo(
    () => (availability?.slots || []).filter((s) => s.isAvailable).length,
    [availability]
  );

  const handleBookAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitError(null);

    if (!selectedDoctor) {
      setSubmitError('Please select a doctor before submitting your appointment request.');
      return;
    }
    if (!selectedDate) {
      setSubmitError('Please select an appointment date.');
      return;
    }
    if (!selectedSlot) {
      setSubmitError('Please choose an available time slot.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await apiRequest<{ success: boolean; data: ScheduledAppointmentResult }>(
        '/appointments',
        {
          method: 'POST',
          body: JSON.stringify({
            doctorId: selectedDoctor.id,
            departmentId: selectedDoctor.departmentId,
            hospitalId: selectedDoctor.hospitalId,
            appointmentDate: selectedDate,
            slotStartTime: selectedSlot.slotStartTime,
            slotEndTime: selectedSlot.slotEndTime,
            type: visitType,
            reasonForVisit: reasonForVisit.trim() || 'Outpatient clinical consultation',
          }),
        }
      );

      const booked = response?.data;
      if (booked) {
        setConfirmedBooking(booked);
        setSelectedSlot(null);
        setReasonForVisit('');
        showToast({
          title: 'Appointment Confirmed',
          description: `Booking ${booked.appointmentNumber} confirmed for ${formatDisplayDate(booked.appointmentDate)} at ${booked.slotStartTime}.`,
          variant: 'success',
        });
        onBookingSuccess?.(booked);
        void fetchAvailability(selectedDoctor.id, selectedDate);
      }
    } catch (err) {
      setSubmitError(
        err instanceof ApiClientError
          ? err.message
          : 'Unable to complete booking request. Please try another slot.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (confirmedBooking) {
    return (
      <section
        className={`rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 ${className}`}
        aria-label="Appointment Confirmation"
      >
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                Booking Confirmed
              </p>
              <h2 className="text-lg font-semibold text-[#172B43] dark:text-slate-100 mt-0.5">
                Appointment {confirmedBooking.appointmentNumber}
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                Your appointment slot has been reserved and added to the clinical schedule.
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setConfirmedBooking(null)}
          >
            Book Another Appointment
          </Button>
        </div>

        <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-5 text-sm">
          <div>
            <dt className="text-xs text-slate-500 dark:text-slate-400">Physician</dt>
            <dd className="font-semibold text-[#172B43] dark:text-slate-100 mt-1">
              {confirmedBooking.doctorName || selectedDoctor?.fullName || 'Attending Physician'}
            </dd>
            <dd className="text-xs text-slate-500 dark:text-slate-400">
              {confirmedBooking.doctorSpecialization || selectedDoctor?.specialization}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500 dark:text-slate-400">Hospital & Department</dt>
            <dd className="font-semibold text-[#172B43] dark:text-slate-100 mt-1">
              {confirmedBooking.hospitalName || selectedDoctor?.hospitalName || 'MediCore Hospital'}
            </dd>
            <dd className="text-xs text-slate-500 dark:text-slate-400">
              {confirmedBooking.departmentName || selectedDoctor?.departmentName}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500 dark:text-slate-400">Date & Time Slot</dt>
            <dd className="font-semibold text-[#172B43] dark:text-slate-100 mt-1 tabular-nums">
              {formatDisplayDate(confirmedBooking.appointmentDate)}
            </dd>
            <dd className="text-xs text-slate-600 dark:text-slate-300 tabular-nums">
              {confirmedBooking.slotStartTime} – {confirmedBooking.slotEndTime}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500 dark:text-slate-400">Visit Details</dt>
            <dd className="font-semibold text-[#172B43] dark:text-slate-100 mt-1">
              {confirmedBooking.type === 'FOLLOW_UP' ? 'Follow-up Visit' : 'OPD Consultation'}
            </dd>
            <dd className="text-xs text-slate-500 dark:text-slate-400 truncate">
              {confirmedBooking.reasonForVisit}
            </dd>
          </div>
        </dl>
      </section>
    );
  }

  return (
    <section
      className={`rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden ${className}`}
      aria-label="Appointment Scheduler"
    >
      <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-[#172B43] dark:text-slate-100">
            Book an Appointment
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Select a physician, choose an available consultation slot, and confirm your visit.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void fetchDoctors()}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-[#0F766E] dark:hover:text-teal-400 self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loadingDoctors ? 'animate-spin' : ''}`} />
          Refresh availability
        </button>
      </div>

      <form onSubmit={handleBookAppointment} className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 dark:divide-slate-800">
        {/* Step 1: Select Physician */}
        <div className="lg:col-span-5 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              1. Choose Physician
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
              {filteredDoctors.length} available
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
            <div className="sm:col-span-7 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search doctor, specialty, hospital"
                aria-label="Search doctors"
                className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0F766E]/30 focus:border-[#0F766E]"
              />
            </div>
            <div className="sm:col-span-5">
              <select
                value={selectedSpecialty}
                onChange={(e) => setSelectedSpecialty(e.target.value)}
                aria-label="Filter by specialty"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0F766E]/30 focus:border-[#0F766E]"
              >
                {specialties.map((spec) => (
                  <option key={spec} value={spec}>
                    {spec === 'ALL' ? 'All Specialties' : spec}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {doctorsError && (
            <div className="rounded-lg border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/30 p-3 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{doctorsError}</span>
            </div>
          )}

          <div
            className="space-y-2 max-h-[380px] overflow-y-auto pr-1"
            role="radiogroup"
            aria-label="Available physicians"
          >
            {loadingDoctors ? (
              Array.from({ length: 3 }).map((_, idx) => (
                <div
                  key={idx}
                  className="h-20 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 animate-pulse"
                />
              ))
            ) : filteredDoctors.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-300 dark:border-slate-700 p-6 text-center">
                <Stethoscope className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
                  No physicians match your filter criteria.
                </p>
              </div>
            ) : (
              filteredDoctors.map((doc) => {
                const isSelected = doc.id === selectedDoctorId;
                return (
                  <button
                    key={doc.id}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => {
                      setSelectedDoctorId(doc.id);
                      setSubmitError(null);
                    }}
                    className={`w-full text-left rounded-lg border p-3.5 transition-colors ${
                      isSelected
                        ? 'border-[#0F766E] bg-teal-50/50 dark:bg-teal-950/25 ring-1 ring-[#0F766E]/30'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[#172B43] dark:text-slate-100 truncate">
                          {doc.fullName}
                        </p>
                        <p className="text-xs text-[#0F766E] dark:text-teal-400 font-medium mt-0.5">
                          {doc.specialization} · {doc.departmentName}
                        </p>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 mt-1.5">
                          <Building2 className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">
                            {doc.hospitalName || 'MediCore Partner Hospital'}
                          </span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold text-[#172B43] dark:text-slate-100 tabular-nums">
                          ₹{doc.consultationFee}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                          {doc.experienceYears} yrs exp
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Step 2 & 3: Select Date, Time Slot & Visit Reason */}
        <div className="lg:col-span-7 p-6 space-y-6">
          {/* Date Selection */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                2. Select Date & Time Slot
              </span>
              <div className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <input
                  type="date"
                  min={todayIso}
                  value={selectedDate}
                  onChange={(e) => {
                    if (e.target.value) {
                      setSelectedDate(e.target.value);
                      setSubmitError(null);
                    }
                  }}
                  aria-label="Appointment date"
                  className="px-2.5 py-1.5 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 tabular-nums focus:outline-none focus:ring-2 focus:ring-[#0F766E]/30 focus:border-[#0F766E]"
                />
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1.5">
              {quickDates.map((isoDate) => {
                const { weekday, dayNum, month } = formatQuickDateLabel(isoDate);
                const isActive = isoDate === selectedDate;
                return (
                  <button
                    key={isoDate}
                    type="button"
                    onClick={() => {
                      setSelectedDate(isoDate);
                      setSubmitError(null);
                    }}
                    className={`py-2 px-1 rounded-lg border text-center transition-colors ${
                      isActive
                        ? 'border-[#0F766E] bg-[#0F766E] text-white'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <span className={`block text-[10px] font-medium uppercase ${isActive ? 'text-teal-100' : 'text-slate-400'}`}>
                      {weekday}
                    </span>
                    <span className="block text-sm font-semibold tabular-nums mt-0.5">
                      {dayNum}
                    </span>
                    <span className={`block text-[10px] ${isActive ? 'text-teal-100' : 'text-slate-400'}`}>
                      {month}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Slots Grid */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                {selectedDoctor
                  ? `Slots for ${selectedDoctor.fullName} on ${formatDisplayDate(selectedDate)}`
                  : 'Select a physician to view time slots'}
              </span>
              {availability && !loadingSlots && (
                <span className="text-slate-500 dark:text-slate-400 tabular-nums">
                  {availableSlotCount} open
                </span>
              )}
            </div>

            {slotsError && (
              <div className="rounded-lg border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/30 p-3 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{slotsError}</span>
              </div>
            )}

            {loadingSlots ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                {Array.from({ length: 10 }).map((_, idx) => (
                  <div
                    key={idx}
                    className="h-9 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 animate-pulse"
                  />
                ))}
              </div>
            ) : !selectedDoctor ? (
              <div className="rounded-lg border border-dashed border-slate-300 dark:border-slate-700 p-5 text-center text-xs text-slate-500">
                Choose a physician from the directory on the left to load open slots.
              </div>
            ) : availability && (!availability.isWorkingDay || availability.slots.length === 0) ? (
              <div className="rounded-lg border border-amber-200 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/20 p-4 text-xs text-amber-800 dark:text-amber-300">
                <p className="font-medium">No consultation slots available on this date.</p>
                {availability.blockedReasons.length > 0 && (
                  <p className="mt-1 opacity-90">{availability.blockedReasons.join(' · ')}</p>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                {(availability?.slots || []).map((slot) => {
                  const isChosen = selectedSlot?.slotStartTime === slot.slotStartTime;
                  return (
                    <button
                      key={slot.slotStartTime}
                      type="button"
                      disabled={!slot.isAvailable}
                      onClick={() => {
                        setSelectedSlot(slot);
                        setSubmitError(null);
                      }}
                      className={`py-2 px-2 rounded-md border text-xs font-medium tabular-nums transition-colors ${
                        !slot.isAvailable
                          ? 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-slate-400 dark:text-slate-600 line-through cursor-not-allowed'
                          : isChosen
                          ? 'border-[#0F766E] bg-[#0F766E] text-white'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-200 hover:border-[#0F766E] hover:text-[#0F766E]'
                      }`}
                    >
                      {slot.slotStartTime}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Step 3: Visit Details */}
          <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
            <span className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              3. Consultation Details
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label
                  htmlFor="appointment-visit-type"
                  className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                >
                  Visit Type
                </label>
                <select
                  id="appointment-visit-type"
                  value={visitType}
                  onChange={(e) => setVisitType(e.target.value as 'OPD' | 'FOLLOW_UP')}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0F766E]/30 focus:border-[#0F766E]"
                >
                  <option value="OPD">OPD Consultation</option>
                  <option value="FOLLOW_UP">Follow-up Visit</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label
                  htmlFor="appointment-reason"
                  className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                >
                  Reason for Visit
                </label>
                <input
                  id="appointment-reason"
                  type="text"
                  maxLength={240}
                  value={reasonForVisit}
                  onChange={(e) => setReasonForVisit(e.target.value)}
                  placeholder="Briefly describe symptoms or consultation purpose"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0F766E]/30 focus:border-[#0F766E]"
                />
              </div>
            </div>
          </div>

          {submitError && (
            <div className="rounded-lg border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/30 p-3 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{submitError}</span>
            </div>
          )}

          {/* Footer Booking Bar */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-xs text-slate-600 dark:text-slate-400">
              {selectedDoctor && selectedSlot ? (
                <span className="tabular-nums">
                  <strong className="text-[#172B43] dark:text-slate-100">
                    {selectedDoctor.fullName}
                  </strong>{' '}
                  · {formatDisplayDate(selectedDate)} · {selectedSlot.slotStartTime} –{' '}
                  {selectedSlot.slotEndTime} · ₹{selectedDoctor.consultationFee}
                </span>
              ) : (
                <span>Select a physician and time slot to confirm booking.</span>
              )}
            </div>
            <Button
              type="submit"
              variant="primary"
              loading={submitting}
              disabled={!selectedDoctor || !selectedSlot || submitting}
            >
              Confirm Appointment
            </Button>
          </div>
        </div>
      </form>
    </section>
  );
};
