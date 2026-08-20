import React from 'react';
import { Check, Shield, Calendar, Clock, User, QrCode } from 'lucide-react';
import './StepIndicator.css';

export interface StepItem {
  number: number;
  label: string;
  shortLabel: string;
  icon: React.ReactNode;
}

interface StepIndicatorProps {
  currentStep: number;
  maxStepAllowed: number;
  onStepClick: (stepNumber: number) => void;
}

export const StepIndicator: React.FC<StepIndicatorProps> = ({
  currentStep,
  maxStepAllowed,
  onStepClick,
}) => {
  const steps: StepItem[] = [
    { number: 1, label: 'Choose Court', shortLabel: 'Court', icon: <Shield size={16} /> },
    { number: 2, label: 'Select Date', shortLabel: 'Date', icon: <Calendar size={16} /> },
    { number: 3, label: 'Pick Time Slots', shortLabel: 'Slots', icon: <Clock size={16} /> },
    { number: 4, label: 'Guest & Terms', shortLabel: 'Details', icon: <User size={16} /> },
    { number: 5, label: 'Payment & Receipt', shortLabel: 'Payment', icon: <QrCode size={16} /> },
  ];

  return (
    <nav className="wizard-step-indicator" aria-label="Booking Progress">
      <ol className="step-indicator-list">
        {steps.map((step) => {
          const isCompleted = step.number < currentStep;
          const isCurrent = step.number === currentStep;
          const isClickable = step.number <= maxStepAllowed && step.number !== currentStep;

          return (
            <li
              key={step.number}
              className={`step-indicator-item ${isCurrent ? 'active' : ''} ${isCompleted ? 'completed' : ''} ${isClickable ? 'clickable' : ''}`}
            >
              <button
                type="button"
                className="step-node-btn"
                onClick={() => isClickable && onStepClick(step.number)}
                disabled={!isClickable}
                aria-current={isCurrent ? 'step' : undefined}
              >
                <span className="step-badge">
                  {isCompleted ? <Check size={14} className="check-icon" /> : step.icon}
                </span>
                <span className="step-info">
                  <span className="step-number-tag">Step {step.number}</span>
                  <span className="step-full-label">{step.label}</span>
                  <span className="step-mobile-label">{step.shortLabel}</span>
                </span>
              </button>
              {step.number < steps.length && <div className="step-connector-line" />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};
