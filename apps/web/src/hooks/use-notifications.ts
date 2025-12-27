import { useCallback, useEffect, useState } from "react";

type NotificationPermissionState = "default" | "granted" | "denied";

export function useNotifications() {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] =
    useState<NotificationPermissionState>("default");

  useEffect(() => {
    if ("Notification" in window) {
      setIsSupported(true);
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (!isSupported) return false;

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result === "granted";
    } catch {
      return false;
    }
  }, [isSupported]);

  const showNotification = useCallback(
    (title: string, options?: NotificationOptions) => {
      if (!isSupported || permission !== "granted") return null;

      try {
        const notification = new Notification(title, {
          icon: "/favicon.ico",
          ...options,
        });

        notification.onclick = () => {
          window.focus();
          notification.close();
        };

        return notification;
      } catch {
        return null;
      }
    },
    [isSupported, permission],
  );

  const showReleaseNotification = useCallback(
    (repoName: string, tagName: string) => {
      return showNotification(`New Release: ${repoName}`, {
        body: `Version ${tagName} is now available`,
        tag: `release-${repoName}-${tagName}`,
      });
    },
    [showNotification],
  );

  return {
    isSupported,
    permission,
    isEnabled: permission === "granted",
    requestPermission,
    showNotification,
    showReleaseNotification,
  };
}
