import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { storage } from '../../services/storage';
import './GettingStartedCard.css';

const STEPS = [
  {
    id: 'expense',
    emoji: '💸',
    label: 'Add your first expense',
    sub: 'Tap to log a transaction manually',
    action: 'add_expense',
  },
  {
    id: 'income',
    emoji: '💰',
    label: 'Add a monthly income',
    sub: 'So WealthPulse can calculate savings',
    action: 'add_income',
  },
  {
    id: 'sms',
    emoji: '📲',
    label: 'Enable SMS auto-detection',
    sub: 'Automatically capture bank transactions',
    action: 'go_settings',
  },
  {
    id: 'budget',
    emoji: '🎯',
    label: 'Set your first budget',
    sub: 'Get alerts before you overspend',
    action: 'go_budgets',
  },
];

function getCompletedSteps(transactions, smsEnabled, budgets) {
  const hasExpense = transactions.some((t) => t.type === 'expense');
  const hasIncome = transactions.some((t) => t.type === 'income');
  const hasBudget = Object.values(budgets).some((v) => v > 0);
  return {
    expense: hasExpense,
    income: hasIncome,
    sms: smsEnabled,
    budget: hasBudget,
  };
}

export function GettingStartedCard({ transactions, smsEnabled, budgets, onAddExpense, onAddIncome }) {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(storage.isChecklistDismissed());

  const completed = getCompletedSteps(transactions, smsEnabled, budgets);
  const doneCount = Object.values(completed).filter(Boolean).length;
  const allDone = doneCount === STEPS.length;

  if (dismissed) return null;

  const handleDismiss = () => {
    storage.dismissChecklist();
    setDismissed(true);
  };

  if (allDone) {
    return (
      <div className="gs-card gs-done animate-in">
        <div className="gs-done-content">
          <div className="gs-done-icon">🎉</div>
          <div className="gs-done-text">
            <h3 className="gs-done-title">You're all set!</h3>
            <p className="gs-done-sub">You've completed the setup. Start tracking your wealth like a pro.</p>
          </div>
          <button className="btn btn-primary gs-done-btn" onClick={handleDismiss}>Got it!</button>
        </div>
      </div>
    );
  }

  const handleStepClick = (step) => {
    if (completed[step.id]) return;
    if (step.action === 'add_expense') onAddExpense?.();
    else if (step.action === 'add_income') onAddIncome?.();
    else if (step.action === 'go_settings') navigate('/settings');
    else if (step.action === 'go_budgets') navigate('/budgets');
  };

  return (
    <div className="gs-card animate-in">
      <div className="gs-header">
        <div className="gs-title-row">
          <span className="gs-title">Getting Started</span>
          <span className="gs-progress">{doneCount}/{STEPS.length} done</span>
        </div>
        <div className="gs-bar-bg">
          <div className="gs-bar-fill" style={{ width: `${(doneCount / STEPS.length) * 100}%` }} />
        </div>
      </div>

      <div className="gs-steps">
        {STEPS.map((step) => {
          const done = completed[step.id];
          return (
            <div
              key={step.id}
              className={`gs-step ${done ? 'done' : 'pending'}`}
              onClick={() => handleStepClick(step)}
            >
              <div className={`gs-check ${done ? 'checked' : ''}`}>
                {done && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </div>
              <span className="gs-emoji">{step.emoji}</span>
              <div className="gs-step-text">
                <span className="gs-step-label">{step.label}</span>
                {!done && <span className="gs-step-sub">{step.sub}</span>}
              </div>
              {!done && (
                <svg className="gs-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              )}
            </div>
          );
        })}
      </div>

      <button className="gs-dismiss" onClick={handleDismiss}>Dismiss</button>
    </div>
  );
}
