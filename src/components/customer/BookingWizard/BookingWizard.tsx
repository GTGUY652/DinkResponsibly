import React, { useState, useEffect, useCallback } from 'react';
import { ArrowRight, ArrowLeft, AlertCircle } from 'lucide-react';
import { StepIndicator } from './StepIndicator';
import { Step1CourtSelect } from './Step1CourtSelect';
import { Step2DateSelect } from './Step2DateSelect';
import { Step3SlotSelect, type DiscreteSlotItem } from './Step3SlotSelect';
import { Step4GuestDetails, type GuestDetailsState } from './Step4GuestDetails';
import { Step5PaymentReceipt, type PaymentSubmissionData } from './Step5PaymentReceipt';
import { BookingSuccessView } from './BookingSuccessView';
import { fetchBookedSlots, createBooking, generateBookingCode, fetchCourts } from '../../../services/bookingService';
import type { CourtRecord } from '../../../services/bookingService';
import { compressImage } from '../../../utils/imageCompression';
import { uploadPaymentReceipt } from '../../../services/bookingService';
import { supabase } from '../../../services/supabase';
import './BookingWizard.css';

export const BookingWizard: React.FC = () => {
  const today = new Date();

  // Wizard Navigation
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [maxStepAllowed, setMaxStepAllowed] = useState<number>(1);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [confirmedBookingCode, setConfirmedBookingCode] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Step 1: Court Selection
  const [courtsList, setCourtsList] = useState<CourtRecord[]>([]);
  const [selectedCourt, setSelectedCourt] = useState<string>('Court A');

  // Step 2: Date Selection
  const [currentYear, setCurrentYear] = useState<number>(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<number>(today.getDate());

  // Step 3: Slots Selection
  const [bookedHours, setBookedHours] = useState<number[]>([]);
  const [selectedHours, setSelectedHours] = useState<number[]>([]);
  const [loadingSlots, setLoadingSlots] = useState<boolean>(false);

  // Step 4: Guest Details
  const [guestDetails, setGuestDetails] = useState<GuestDetailsState>({
    name: '',
    email: '',
    phone: '',
    agreedToTerms: false,
  });

  // Step 5: Payment & Receipt
  const [paymentData, setPaymentData] = useState<PaymentSubmissionData>({
    referenceLast4: '',
    receiptFile: null,
    previewUrl: null,
  });

  // Load Courts
  const loadCourts = useCallback(async () => {
    const data = await fetchCourts();
    if (data && data.length > 0) {
      setCourtsList(data);
    }
  }, []);

  useEffect(() => {
    void loadCourts();
    const subscription = supabase
      .channel('realtime_wizard_courts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'courts' }, () => {
        void loadCourts();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [loadCourts]);

  const activeCourtRecord = courtsList.find((c) => c.id === selectedCourt || c.name === selectedCourt);
  const isCourtOperational = activeCourtRecord ? activeCourtRecord.is_active : true;
  const displayCourtName = activeCourtRecord?.name || selectedCourt;

  // Formatted date string
  const formattedDateStr = `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}-${selectedDay.toString().padStart(2, '0')}`;
  const monthShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const displayDateStr = `${monthShort[currentMonth]} ${selectedDay}, ${currentYear}`;

  const selectedDateObj = new Date(currentYear, currentMonth, selectedDay);
  const isWeekend = selectedDateObj.getDay() === 0 || selectedDateObj.getDay() === 6;

  // Load Booked Slots from Supabase
  const loadAvailability = useCallback(async () => {
    setLoadingSlots(true);
    const idToUse = activeCourtRecord?.id || selectedCourt;
    const bookedRanges = await fetchBookedSlots(idToUse, formattedDateStr);
    const occupied: number[] = [];
    bookedRanges.forEach((range) => {
      for (let h = range.start_hour; h < range.end_hour; h++) {
        occupied.push(h);
      }
    });
    setBookedHours(occupied);
    setLoadingSlots(false);
  }, [selectedCourt, formattedDateStr, activeCourtRecord?.id]);

  useEffect(() => {
    void loadAvailability();
    // Clear slots selection when court or date changes
    setSelectedHours([]);
  }, [selectedCourt, formattedDateStr, loadAvailability]);

  // Construct discrete 1-hour slots (6:00 AM to 11:00 PM)
  const formatHourString = (hour: number): string => {
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const h12 = hour % 12 === 0 ? 12 : hour % 12;
    return `${h12}:00 ${ampm}`;
  };

  const rawHours = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22];

  const discreteSlots: DiscreteSlotItem[] = rawHours.map((hour) => {
    let rate: number;
    if (activeCourtRecord) {
      if (isWeekend) {
        rate = activeCourtRecord.weekend_rate ?? 500;
      } else {
        rate = hour < 17 ? activeCourtRecord.weekday_day_rate : activeCourtRecord.weekday_night_rate;
      }
    } else {
      rate = isWeekend ? 500 : hour < 17 ? 400 : 500;
    }

    const startStr = formatHourString(hour);
    const endStr = formatHourString(hour + 1);

    return {
      startHour: hour,
      endHour: hour + 1,
      label: `${startStr} – ${endStr}`,
      rate,
      isBooked: !isCourtOperational || bookedHours.includes(hour),
      session: hour < 13 ? 'AM' : 'PM',
    };
  });

  // Slot toggle with contiguous validation
  const handleToggleSlot = (hour: number) => {
    setErrorMessage(null);
    if (selectedHours.includes(hour)) {
      // Removing a slot
      const sorted = [...selectedHours].sort((a, b) => a - b);
      if (sorted.length === 1) {
        setSelectedHours([]);
      } else if (hour === sorted[0]) {
        setSelectedHours(sorted.filter((h) => h !== hour));
      } else if (hour === sorted[sorted.length - 1]) {
        setSelectedHours(sorted.filter((h) => h !== hour));
      } else {
        // Middle slot clicked, reset to just clicked hour
        setSelectedHours([hour]);
      }
    } else {
      // Adding a slot
      if (selectedHours.length === 0) {
        setSelectedHours([hour]);
      } else {
        const sorted = [...selectedHours].sort((a, b) => a - b);
        const min = sorted[0];
        const max = sorted[sorted.length - 1];

        if (hour === min - 1 || hour === max + 1) {
          // Contiguous adjacent slot
          setSelectedHours([...selectedHours, hour]);
        } else {
          // Non-adjacent, reset to the clicked slot
          setSelectedHours([hour]);
        }
      }
    }
  };

  // Calculations for summary
  const sortedSelected = [...selectedHours].sort((a, b) => a - b);
  const minHour = sortedSelected.length > 0 ? sortedSelected[0] : null;
  const maxHour = sortedSelected.length > 0 ? sortedSelected[sortedSelected.length - 1] : null;
  const durationHours = selectedHours.length;

  const selectedSlotObjs = discreteSlots.filter((s) => selectedHours.includes(s.startHour));
  const totalPrice = selectedSlotObjs.reduce((sum, s) => sum + s.rate, 0);

  const timeRangeText =
    minHour !== null && maxHour !== null
      ? `${formatHourString(minHour)} to ${formatHourString(maxHour + 1)}`
      : '';

  // Validation per step
  const canProceed = (): boolean => {
    if (currentStep === 1) {
      return Boolean(selectedCourt) && isCourtOperational;
    }
    if (currentStep === 2) {
      return Boolean(selectedDay);
    }
    if (currentStep === 3) {
      return selectedHours.length > 0;
    }
    // For step 4, we always let them click Next so we can show specific error messages!
    if (currentStep === 4) {
      return true; 
    }
    return true;
  };

  const handleNextStep = () => {
    setErrorMessage(null);
    if (!canProceed()) {
      if (currentStep === 1 && !isCourtOperational) {
        setErrorMessage('The selected court is under maintenance. Please select an operational court.');
      } else if (currentStep === 3 && selectedHours.length === 0) {
        setErrorMessage('Please pick at least one 1-hour time slot to proceed.');
      }
      return;
    }

    // Step 4 explicit validation On Click
    if (currentStep === 4) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (guestDetails.name.trim().length === 0) {
        setErrorMessage('Please enter your full name.');
        return;
      } else if (!emailRegex.test(guestDetails.email.trim())) {
        setErrorMessage('Please enter a valid email address (e.g., name@gmail.com).');
        return;
      } else if (guestDetails.phone.trim().length < 7) {
        setErrorMessage('Please enter a valid contact number.');
        return;
      } else if (!guestDetails.agreedToTerms) {
        setErrorMessage('You must acknowledge and agree to the No-Refund Policy.');
        return;
      }
    }

    const nextStep = currentStep + 1;
    setCurrentStep(nextStep);
    setMaxStepAllowed((prev) => Math.max(prev, nextStep));
  };

  const handlePrevStep = () => {
    setErrorMessage(null);
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleStepClick = (stepNumber: number) => {
    if (stepNumber <= maxStepAllowed) {
      setErrorMessage(null);
      setCurrentStep(stepNumber);
    }
  };

  // Final Submission
  const handleSubmitBooking = async () => {
    if (minHour === null || maxHour === null || !isCourtOperational) return;
    if (paymentData.referenceLast4.length < 4 || !paymentData.receiptFile) {
      setErrorMessage('Please provide the 4-digit payment reference and upload your receipt.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      // 1. Client-side canvas compression
      const compressedFile = await compressImage(paymentData.receiptFile);

      // 2. Upload to Supabase Storage
      const receiptUrl = await uploadPaymentReceipt(compressedFile);

      // 3. Generate booking code and create DB record
      const bookingCode = generateBookingCode();
      const targetCourtId = activeCourtRecord?.id || selectedCourt;

      await createBooking({
        booking_code: bookingCode,
        court_id: targetCourtId,
        booking_date: formattedDateStr,
        start_hour: minHour,
        end_hour: maxHour + 1,
        duration_hours: durationHours,
        total_price: totalPrice,
        guest_name: guestDetails.name.trim(),
        guest_email: guestDetails.email.trim(),
        guest_phone: guestDetails.phone.trim(),
        payment_reference_last4: paymentData.referenceLast4,
        receipt_url: receiptUrl,
        status: 'PENDING_VERIFICATION',
      });

      setConfirmedBookingCode(bookingCode);
      setIsSuccess(true);
      await loadAvailability();
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMessage(error.message || 'Failed to submit reservation. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBookAnother = () => {
    setIsSuccess(false);
    setConfirmedBookingCode('');
    setCurrentStep(1);
    setMaxStepAllowed(1);
    setSelectedHours([]);
    setPaymentData({ referenceLast4: '', receiptFile: null, previewUrl: null });
    setGuestDetails({ name: '', email: '', phone: '', agreedToTerms: false });
  };

  return (
    <div className="booking-wizard-wrapper">
      {/* Wizard Header Progress Tracker */}
      {!isSuccess && (
        <StepIndicator
          currentStep={currentStep}
          maxStepAllowed={maxStepAllowed}
          onStepClick={handleStepClick}
        />
      )}

      {/* Main Content Area */}
      <div className="wizard-card-body">
        {errorMessage && (
          <div className="wizard-global-error-banner" role="alert">
            <AlertCircle size={18} />
            <span>{errorMessage}</span>
          </div>
        )}

        {isSuccess ? (
          <BookingSuccessView
            bookingCode={confirmedBookingCode}
            courtName={displayCourtName}
            displayDate={displayDateStr}
            timeRangeText={timeRangeText}
            durationHours={durationHours}
            totalPrice={totalPrice}
            guestName={guestDetails.name}
            referenceLast4={paymentData.referenceLast4}
            onBookAnother={handleBookAnother}
          />
        ) : (
          <>
            {currentStep === 1 && (
              <Step1CourtSelect
                courtsList={courtsList}
                selectedCourt={selectedCourt}
                onSelectCourt={(c) => {
                  setSelectedCourt(c);
                  setErrorMessage(null);
                }}
              />
            )}

            {currentStep === 2 && (
              <Step2DateSelect
                currentYear={currentYear}
                currentMonth={currentMonth}
                selectedDay={selectedDay}
                onChangeMonth={(yr, mo) => {
                  setCurrentYear(yr);
                  setCurrentMonth(mo);
                  setSelectedDay(1);
                }}
                onSelectDay={(day) => {
                  setSelectedDay(day);
                  setErrorMessage(null);
                }}
              />
            )}

            {currentStep === 3 && (
              <Step3SlotSelect
                slots={discreteSlots}
                selectedHours={selectedHours}
                onToggleSlot={handleToggleSlot}
                onResetSelection={() => setSelectedHours([])}
                loading={loadingSlots}
              />
            )}

            {currentStep === 4 && (
              <Step4GuestDetails
                guestDetails={guestDetails}
                onChangeGuestDetails={(fields) =>
                  setGuestDetails((prev) => ({ ...prev, ...fields }))
                }
                courtName={displayCourtName}
                displayDate={displayDateStr}
                timeRangeText={timeRangeText}
                durationHours={durationHours}
                totalPrice={totalPrice}
              />
            )}

            {currentStep === 5 && (
              <Step5PaymentReceipt
                totalPrice={totalPrice}
                courtName={displayCourtName}
                displayDate={displayDateStr}
                timeRangeText={timeRangeText}
                durationHours={durationHours}
                paymentData={paymentData}
                onChangePaymentData={(data) =>
                  setPaymentData((prev) => ({ ...prev, ...data }))
                }
                onSubmitBooking={handleSubmitBooking}
                isSubmitting={isSubmitting}
                onBack={handlePrevStep}
              />
            )}
          </>
        )}
      </div>

      {/* Sticky Bottom Navigation Bar for Steps 1 through 4 */}
      {!isSuccess && currentStep < 5 && (
        <div className={`wizard-bottom-nav ${currentStep === 1 ? 'is-first-step' : ''}`}>
          <div className="nav-left">
            {currentStep > 1 ? (
              <button
                type="button"
                onClick={handlePrevStep}
                className="nav-btn-back"
              >
                <ArrowLeft size={16} /> Back
              </button>
            ) : (
              <span className="step-count-indicator">Step 1 of 5</span>
            )}
          </div>

          <div className="nav-center-recap">
            <span className="recap-pill">
              {displayCourtName} • {displayDateStr}
              {durationHours > 0 ? ` • ${durationHours}h (₱${totalPrice})` : ''}
            </span>
          </div>

          <div className="nav-right">
            <button
              type="button"
              onClick={handleNextStep}
              disabled={!canProceed()}
              className="nav-btn-next"
            >
              {currentStep === 1 && 'Next: Select Date'}
              {currentStep === 2 && 'Next: Choose Slots'}
              {currentStep === 3 && 'Next: Guest Details'}
              {currentStep === 4 && 'Next: Payment'}
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
