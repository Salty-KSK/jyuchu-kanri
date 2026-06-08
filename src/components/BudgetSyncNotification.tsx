import { useEffect, useCallback } from "react";

interface ToastNotification {
  id: string; type: "success" | "error" | "warning"; title: string; message: string;
}

interface BudgetSyncNotificationProps {
  notifications: ToastNotification[];
  onDismiss: (id: string) => void;
}

export default function BudgetSyncNotification({ notifications, onDismiss }: BudgetSyncNotificationProps) {
  return (
    <div className="toast-container">
      {notifications.map(n => (
        <Toast key={n.id} notification={n} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function Toast({ notification, onDismiss }: { notification: ToastNotification; onDismiss: (id: string) => void }) {
  const handleDismiss = useCallback(() => { onDismiss(notification.id); }, [notification.id, onDismiss]);

  useEffect(() => {
    const timer = setTimeout(handleDismiss, 5000);
    return () => clearTimeout(timer);
  }, [handleDismiss]);

  const iconName = notification.type === "success" ? "check_circle" : notification.type === "error" ? "error" : "warning";

  return (
    <div className={`toast ${notification.type}`}>
      <span className="material-symbols-outlined toast-icon">{iconName}</span>
      <div className="toast-body">
        <div className="toast-title">{notification.title}</div>
        <div className="toast-message">{notification.message}</div>
      </div>
      <button className="toast-close" onClick={handleDismiss}>
        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
      </button>
    </div>
  );
}
