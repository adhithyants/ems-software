import { useQuery } from '@tanstack/react-query';
import { projectsAPI, teamsAPI, authAPI, notificationsAPI, tasksAPI, leavesAPI, workspaceAPI, attendanceAPI } from '../api/api';

/**
 * Shared hook to fetch and cache all projects in the organization.
 */
export function useAllProjects() {
    return useQuery({
        queryKey: ['projects'],
        queryFn: async () => {
            const res = await projectsAPI.list();
            return res.data;
        },
    });
}

/**
 * Shared hook to fetch details of a specific project.
 */
export function useProject(id) {
    return useQuery({
        queryKey: ['projects', id],
        queryFn: async () => {
            const res = await projectsAPI.getById(id);
            return res.data;
        },
        enabled: !!id,
    });
}

/**
 * Shared hook to fetch and cache all teams in the organization.
 */
export function useAllTeams() {
    return useQuery({
        queryKey: ['teams'],
        queryFn: async () => {
            const res = await teamsAPI.list();
            return res.data;
        },
    });
}

/**
 * Shared hook to fetch and cache all users for organization-wide selection.
 */
export function useAllUsers() {
    return useQuery({
        queryKey: ['users', 'all'],
        queryFn: async () => {
            const res = await teamsAPI.getAllUsers();
            return res.data;
        },
    });
}

/**
 * Shared hook for management level user lists.
 */
export function useManagedUsers() {
    return useQuery({
        queryKey: ['users', 'managed'],
        queryFn: async () => {
            const res = await teamsAPI.getManagedUsers();
            return res.data;
        },
    });
}

/**
 * Shared hook for real-time notification counts and list.
 * Note: Uses a shorter staleTime (1 minute) for better responsiveness.
 */
export function useNotifications() {
    return useQuery({
        queryKey: ['notifications'],
        queryFn: async () => {
            const res = await notificationsAPI.list();
            return res.data;
        },
        staleTime: 60 * 1000, // 1 minute
    });
}

/**
 * Shared hook to fetch and cache all tasks assigned to the user or organization.
 */
export function useTasks(projectId = null) {
    return useQuery({
        queryKey: ['tasks', { projectId }],
        queryFn: async () => {
            const res = projectId 
                ? await tasksAPI.listByProject(projectId)
                : await tasksAPI.list();
            return res.data;
        },
    });
}

/**
 * Shared hook for organization holiday and leave calendar events.
 */
export function useCalendarEvents() {
    return useQuery({
        queryKey: ['calendar', 'global'],
        queryFn: async () => {
            const res = await leavesAPI.getCalendarEvents();
            return res.data;
        },
    });
}

/**
 * Shared hook for project-specific workspace events.
 */
export function useWorkspaceEvents() {
    return useQuery({
        queryKey: ['events', 'workspace'],
        queryFn: async () => {
            const res = await workspaceAPI.getAllEvents();
            return res.data;
        },
    });
}

/**
 * Shared hook for pending leave requests (SU/PM view).
 */
export function usePendingLeaves(options = {}) {
    return useQuery({
        queryKey: ['leaves', 'pending'],
        queryFn: async () => {
            const res = await leavesAPI.getPending();
            return res.data;
        },
        ...options,
    });
}

/**
 * Shared hook for SU admin dashboard metrics.
 */
export function useSuMetrics(params = {}, options = {}) {
    return useQuery({
        queryKey: ['metrics', 'su', params],
        queryFn: async () => {
            const res = await attendanceAPI.adminDashboardMetrics(params);
            return res.data;
        },
        ...options,
    });
}

/**
 * Shared hook for the active user's attendance and break status.
 */
export function useAttendanceStatus() {
    return useQuery({
        queryKey: ['attendance', 'status'],
        queryFn: async () => {
            const res = await attendanceAPI.status();
            return res.data;
        },
        staleTime: 30 * 1000, // 30 seconds - attendance is sensitive
    });
}

/**
 * Shared hook for fetching timesheet records.
 */
export function useTimesheet(params) {
    return useQuery({
        queryKey: ['attendance', 'timesheet', params],
        queryFn: async () => {
            const res = await attendanceAPI.getTimesheet(params);
            return res.data;
        },
        enabled: !!params,
    });
}
