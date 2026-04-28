// ── Category Constants (migrated from app.js CATEGORIES) ──

export const CATEGORIES = {
  expense: [
    { id: 'food', name: 'Food & Dining', emoji: '🍽️', color: '#f87171' },
    { id: 'transport', name: 'Transport', emoji: '🚗', color: '#60a5fa' },
    { id: 'shopping', name: 'Shopping', emoji: '🛍️', color: '#f472b6' },
    { id: 'bills', name: 'Bills & Utilities', emoji: '💡', color: '#fbbf24' },
    { id: 'health', name: 'Health', emoji: '🏥', color: '#34d399' },
    { id: 'entertainment', name: 'Entertainment', emoji: '🎬', color: '#a78bfa' },
    { id: 'education', name: 'Education', emoji: '📚', color: '#22d3ee' },
    { id: 'rent', name: 'Rent & Housing', emoji: '🏠', color: '#fb923c' },
    { id: 'other_exp', name: 'Other', emoji: '📦', color: '#94a3b8' },
  ],
  income: [
    { id: 'salary', name: 'Salary', emoji: '💰', color: '#34d399' },
    { id: 'freelance', name: 'Freelance', emoji: '💻', color: '#60a5fa' },
    { id: 'investment', name: 'Investment', emoji: '📈', color: '#fbbf24' },
    { id: 'gift', name: 'Gift', emoji: '🎁', color: '#f472b6' },
    { id: 'other_inc', name: 'Other', emoji: '✨', color: '#a78bfa' },
  ],
};

export const DEFAULT_BUDGETS = {
  food: 8000,
  transport: 3000,
  shopping: 5000,
  bills: 4000,
  health: 2000,
  entertainment: 3000,
  education: 2000,
  rent: 15000,
  other_exp: 2000,
};

export const SECURITY_QUESTIONS = [
  'What was the name of your first pet?',
  'In what city were you born?',
  "What is your mother's maiden name?",
  'What high school did you attend?',
  'What was the make of your first car?',
];

export const AVATAR_COLORS = [
  '#f87171', '#60a5fa', '#34d399', '#fbbf24',
  '#a78bfa', '#f472b6', '#22d3ee', '#fb923c',
];

/**
 * Look up a category object by type and id.
 * Returns a fallback if not found.
 */
export function getCategory(type, catId) {
  const list = CATEGORIES[type] || [];
  return list.find((c) => c.id === catId) || { name: 'Other', emoji: '📦', color: '#94a3b8', id: 'other' };
}
