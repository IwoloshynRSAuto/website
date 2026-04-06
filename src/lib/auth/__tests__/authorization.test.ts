/**
 * Unit tests for authorization module
 */

import { authorize, authorizeOwnResource, getCapabilities, isAdmin, isManagerOrAbove } from '../authorization'
import type { User } from '../authorization'

describe('Authorization', () => {
  describe('authorize', () => {
    it('should allow ADMIN to read users', () => {
      const user: User = { id: '1', role: 'ADMIN' }
      expect(authorize(user, 'read', 'user')).toBe(true)
    })

    it('should allow ADMIN to create users', () => {
      const user: User = { id: '1', role: 'ADMIN' }
      expect(authorize(user, 'create', 'user')).toBe(true)
    })

    it('should allow ADMIN to manage roles', () => {
      const user: User = { id: '1', role: 'ADMIN' }
      expect(authorize(user, 'manage_roles', 'user')).toBe(true)
    })

    it('should allow PROJECT_MANAGER to approve timesheets', () => {
      const user: User = { id: '1', role: 'PROJECT_MANAGER' }
      expect(authorize(user, 'approve', 'timesheet_submission')).toBe(true)
    })

    it('should not allow TECHNICIAN to approve timesheets', () => {
      const user: User = { id: '1', role: 'TECHNICIAN' }
      expect(authorize(user, 'approve', 'timesheet_submission')).toBe(false)
    })

    it('should allow TECHNICIAN to submit own timesheets', () => {
      const user: User = { id: '1', role: 'TECHNICIAN' }
      expect(authorize(user, 'submit', 'timesheet')).toBe(true)
    })

    it('should allow SALES to create quotes', () => {
      const user: User = { id: '1', role: 'SALES' }
      expect(authorize(user, 'create', 'quote')).toBe(true)
    })

    it('should not allow SALES to manage users', () => {
      const user: User = { id: '1', role: 'SALES' }
      expect(authorize(user, 'manage_roles', 'user')).toBe(false)
    })

    it('should return false for null user', () => {
      expect(authorize(null, 'read', 'user')).toBe(false)
    })

    it('should map legacy USER role to TECHNICIAN', () => {
      const user: User = { id: '1', role: 'USER' }
      expect(authorize(user, 'submit', 'timesheet')).toBe(true)
      expect(authorize(user, 'approve', 'timesheet_submission')).toBe(false)
    })

    it('should map legacy MANAGER role to PROJECT_MANAGER', () => {
      const user: User = { id: '1', role: 'MANAGER' }
      expect(authorize(user, 'approve', 'timesheet_submission')).toBe(true)
      expect(authorize(user, 'manage_roles', 'user')).toBe(false)
    })
  })

  describe('authorizeOwnResource', () => {
    it('should allow user to read own resource', () => {
      const user: User = { id: '1', role: 'TECHNICIAN' }
      expect(authorizeOwnResource(user, 'read', 'timesheet', '1')).toBe(true)
    })

    it('should allow user to update own resource', () => {
      const user: User = { id: '1', role: 'TECHNICIAN' }
      expect(authorizeOwnResource(user, 'update', 'timesheet', '1')).toBe(true)
    })

    it('should not allow user to read other user resource without permission', () => {
      const user: User = { id: '1', role: 'TECHNICIAN' }
      expect(authorizeOwnResource(user, 'read', 'timesheet', '2')).toBe(false)
    })

    it('should allow ADMIN to read any resource', () => {
      const user: User = { id: '1', role: 'ADMIN' }
      expect(authorizeOwnResource(user, 'read', 'timesheet', '2')).toBe(true)
    })

    it('should allow PROJECT_MANAGER to approve any timesheet', () => {
      const user: User = { id: '1', role: 'PROJECT_MANAGER' }
      expect(authorizeOwnResource(user, 'approve', 'timesheet_submission', '2')).toBe(true)
    })
  })

  describe('getCapabilities', () => {
    it('should return all capabilities for ADMIN', () => {
      const user: User = { id: '1', role: 'ADMIN' }
      const capabilities = getCapabilities(user, 'user')
      expect(capabilities).toContain('read')
      expect(capabilities).toContain('create')
      expect(capabilities).toContain('update')
      expect(capabilities).toContain('delete')
      expect(capabilities).toContain('manage_roles')
    })

    it('should return limited capabilities for TECHNICIAN', () => {
      const user: User = { id: '1', role: 'TECHNICIAN' }
      const capabilities = getCapabilities(user, 'user')
      expect(capabilities).toContain('read')
      expect(capabilities).not.toContain('create')
      expect(capabilities).not.toContain('manage_roles')
    })

    it('should return empty array for null user', () => {
      expect(getCapabilities(null, 'user')).toEqual([])
    })
  })

  describe('isAdmin', () => {
    it('should return true for ADMIN', () => {
      const user: User = { id: '1', role: 'ADMIN' }
      expect(isAdmin(user)).toBe(true)
    })

    it('should return false for other roles', () => {
      const user: User = { id: '1', role: 'TECHNICIAN' }
      expect(isAdmin(user)).toBe(false)
    })

    it('should return false for null user', () => {
      expect(isAdmin(null)).toBe(false)
    })
  })

  describe('isManagerOrAbove', () => {
    it('should return true for ADMIN', () => {
      const user: User = { id: '1', role: 'ADMIN' }
      expect(isManagerOrAbove(user)).toBe(true)
    })

    it('should return true for PROJECT_MANAGER', () => {
      const user: User = { id: '1', role: 'PROJECT_MANAGER' }
      expect(isManagerOrAbove(user)).toBe(true)
    })

    it('should return true for SALES', () => {
      const user: User = { id: '1', role: 'SALES' }
      expect(isManagerOrAbove(user)).toBe(true)
    })

    it('should return false for TECHNICIAN', () => {
      const user: User = { id: '1', role: 'TECHNICIAN' }
      expect(isManagerOrAbove(user)).toBe(false)
    })
  })
})

