import React from 'react'
import { Toast } from '@shopify/polaris'
import { useState, useCallback } from 'react'

interface NotificationMessage {
  id: string
  message: string
  type: 'success' | 'error' | 'info' | 'warning'
  duration?: number
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<NotificationMessage[]>([])

  const showNotification = useCallback((
    message: string,
    type: 'success' | 'error' | 'info' | 'warning' = 'info',
    duration = 5000
  ) => {
    const id = Date.now().toString()
    const newNotification: NotificationMessage = {
      id,
      message,
      type,
      duration
    }

    setNotifications(prev => [...prev, newNotification])

    if (duration > 0) {
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== id))
      }, duration)
    }

    return id
  }, [])

  const hideNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }, [])

  const clearAllNotifications = useCallback(() => {
    setNotifications([])
  }, [])

  const NotificationComponent = useCallback(() => {
    if (notifications.length === 0) return null

    return React.createElement(
      'div',
      {
        style: {
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }
      },
      notifications.map(notification =>
        React.createElement(
          Toast,
          {
            key: notification.id,
            content: notification.message,
            onDismiss: () => hideNotification(notification.id),
            error: notification.type === 'error'
          }
        )
      )
    )
  }, [notifications, hideNotification])

  return {
    showNotification,
    hideNotification,
    clearAllNotifications,
    NotificationComponent
  }
}

// Simple notification functions for non-hook usage
let notificationQueue: NotificationMessage[] = []
let notificationListeners: ((notifications: NotificationMessage[]) => void)[] = []

function notifyListeners() {
  notificationListeners.forEach(listener => listener([...notificationQueue]))
}

export function showNotification(
  message: string,
  type: 'success' | 'error' | 'info' | 'warning' = 'info',
  duration = 5000
): string {
  const id = Date.now().toString()
  const notification: NotificationMessage = {
    id,
    message,
    type,
    duration
  }

  notificationQueue.push(notification)
  notifyListeners()

  if (duration > 0) {
    setTimeout(() => {
      hideNotification(id)
    }, duration)
  }

  return id
}

export function hideNotification(id: string) {
  notificationQueue = notificationQueue.filter(n => n.id !== id)
  notifyListeners()
}

export function subscribeToNotifications(listener: (notifications: NotificationMessage[]) => void) {
  notificationListeners.push(listener)
  listener([...notificationQueue])

  return () => {
    notificationListeners = notificationListeners.filter(l => l !== listener)
  }
}