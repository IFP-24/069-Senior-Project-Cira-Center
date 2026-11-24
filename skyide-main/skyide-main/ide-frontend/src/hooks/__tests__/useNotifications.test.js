// Tests for useNotifications hook
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { useNotifications } from "@hooks/useNotifications"

describe("useNotifications", () => {
    beforeEach(() => {
        vi.clearAllTimers()
        vi.useFakeTimers()
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    it("starts with empty notifications array", () => {
        const { result } = renderHook(() => useNotifications())

        expect(result.current.notifications).toEqual([])
    })

    it("adds notification with object format", () => {
        const { result } = renderHook(() => useNotifications())

        act(() => {
            result.current.addNotification({
                type: "success",
                title: "Success",
                message: "Operation completed",
                autoClose: 3000
            })
        })

        expect(result.current.notifications).toHaveLength(1)
        expect(result.current.notifications[0]).toMatchObject({
            type: "success",
            title: "Success",
            message: "Operation completed",
            duration: 3000
        })
    })

    it("adds notification with parameter format", () => {
        const { result } = renderHook(() => useNotifications())

        act(() => {
            result.current.addNotification("Test message", "info", 5000)
        })

        expect(result.current.notifications).toHaveLength(1)
        expect(result.current.notifications[0]).toMatchObject({
            message: "Test message",
            type: "info",
            duration: 5000
        })
    })

    it("auto-removes notification after duration", () => {
        const { result } = renderHook(() => useNotifications())

        act(() => {
            result.current.addNotification("Auto remove", "info", 1000)
        })

        expect(result.current.notifications).toHaveLength(1)

        act(() => {
            vi.advanceTimersByTime(1000)
        })

        expect(result.current.notifications).toHaveLength(0)
    })

    it("removes notification manually", () => {
        const { result } = renderHook(() => useNotifications())

        let notificationId
        act(() => {
            notificationId = result.current.addNotification("Manual remove", "info", 0)
        })

        expect(result.current.notifications).toHaveLength(1)

        act(() => {
            result.current.removeNotification(notificationId)
        })

        expect(result.current.notifications).toHaveLength(0)
    })

    it("clears all notifications", () => {
        const { result } = renderHook(() => useNotifications())

        act(() => {
            result.current.addNotification("First", "info", 0)
            result.current.addNotification("Second", "success", 0)
            result.current.addNotification("Third", "error", 0)
        })

        expect(result.current.notifications).toHaveLength(3)

        act(() => {
            result.current.clearAllNotifications()
        })

        expect(result.current.notifications).toHaveLength(0)
    })

    it("handles notification without duration (no auto-remove)", () => {
        const { result } = renderHook(() => useNotifications())

        act(() => {
            result.current.addNotification({
                message: "Persistent notification",
                duration: 0
            })
        })

        expect(result.current.notifications).toHaveLength(1)

        act(() => {
            vi.advanceTimersByTime(10000)
        })

        // Should still be there since duration is 0
        expect(result.current.notifications).toHaveLength(1)
    })

    it("generates unique IDs for notifications", () => {
        const { result } = renderHook(() => useNotifications())

        let id1, id2
        act(() => {
            id1 = result.current.addNotification("First")
            id2 = result.current.addNotification("Second")
        })

        expect(id1).not.toBe(id2)
        expect(result.current.notifications[0].id).toBe(id1)
        expect(result.current.notifications[1].id).toBe(id2)
    })

    it("keeps error notifications persistent by default", () => {
        const { result } = renderHook(() => useNotifications())

        act(() => {
            result.current.addNotification("Sticky error", "error")
        })

        expect(result.current.notifications).toHaveLength(1)
        expect(result.current.notifications[0]).toMatchObject({
            message: "Sticky error",
            type: "error",
            duration: 0
        })

        act(() => {
            vi.advanceTimersByTime(10000)
        })

        expect(result.current.notifications).toHaveLength(1)
    })
})
