import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { DropdownSelect } from '../../../components/common'
import { PasswordStrengthBar } from './UserList'

export default function CreateUserForm({ formData, setFormData, darkMode, ui, generatePassword }) {
  const [showPassword, setShowPassword] = useState(false)
  const { inputStyle, subtleSurface, textSecondary, panelBorder } = ui
  const set = (field, val) => setFormData(p => ({ ...p, [field]: val }))

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
      <label style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: textSecondary }}>Full Name</span>
        <input type="text" placeholder="e.g. Favour Okafor" value={formData.name} onChange={(e) => set('name', e.target.value)} style={inputStyle} required />
      </label>
      <label style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: textSecondary }}>Email Address</span>
        <input type="email" placeholder="name@upperroom.local" value={formData.email} onChange={(e) => set('email', e.target.value)} style={inputStyle} required />
      </label>
      <label style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: textSecondary }}>Role</span>
        <DropdownSelect value={formData.role} onChange={(e) => set('role', e.target.value)} style={inputStyle}>
          <option value="editor">Editor — content creation</option>
          <option value="reviewer">Reviewer — content approval</option>
          <option value="super_admin">Super Admin — full access</option>
        </DropdownSelect>
      </label>
      <label style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: textSecondary }}>Initial Password</span>
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            <button type="button" onClick={() => setShowPassword(v => !v)} style={{ background: 'transparent', border: 'none', color: textSecondary, cursor: 'pointer', padding: '0.2rem' }}>
              {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
            <button type="button" onClick={() => generatePassword(setFormData)} title="Generate strong password" style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem', fontWeight: 600, background: subtleSurface, color: '#5a4494', border: `1px solid ${panelBorder}`, borderRadius: '0.35rem', cursor: 'pointer' }}>
              Generate
            </button>
          </div>
        </div>
        <input type={showPassword ? 'text' : 'password'} placeholder="Min 10 chars, upper, lower, number" value={formData.password} onChange={(e) => set('password', e.target.value)} style={inputStyle} required />
        <PasswordStrengthBar password={formData.password} textSecondary={textSecondary} />
      </label>
    </div>
  )
}
