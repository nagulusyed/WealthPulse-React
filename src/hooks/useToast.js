import { useState, useCallback } from 'react';

/**
 * Custom hook for showing toast notifications.
 */
export function useToast() {
  const [toast, setToast] = useState({ visible: false, message: '', type: 'info' });

  const showToast = useCallback((message, type = 'info') => {
    setToast({ visible: true, message, type });
    setTimeout(() => setToast({ visible: false, message: '', type: 'info' }), 3000);
  }, []);

  return { toast, showToast };
}
