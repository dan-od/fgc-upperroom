export const ADMIN_PERMISSIONS_BY_ROLE = {
  super_admin: ['*'],
  editor: [
    'content:blog:read',
    'content:blog:write',
    'content:event:read',
    'content:event:write',
    'content:media:read',
    'content:media:write',
    'content:testimonies:read',
    'content:testimonies:write',
    'content:visitors:read',
    'content:attendance:read',
    'content:attendance:write'
  ],
  reviewer: [
    'audit:read',
    'content:blog:read',
    'content:blog:approve',
    'content:event:read',
    'content:event:approve',
    'content:media:read',
    'content:media:approve',
    'content:testimonies:read',
    'content:visitors:read',
    'content:attendance:read'
  ]
}

export const roleHasPermission = (role, permission) => {
  const normalizedRole = String(role || '').toLowerCase()
  const permissions = ADMIN_PERMISSIONS_BY_ROLE[normalizedRole] || []
  return permissions.includes('*') || permissions.includes(permission)
}
