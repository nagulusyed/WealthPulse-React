export function Toast({ toast }) {
  return (
    <div className={`toast ${toast.visible ? 'visible' : ''}`}>
      {toast.message}
    </div>
  );
}
