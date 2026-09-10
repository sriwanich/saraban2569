import re

with open('src/components/Dashboard.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add emailNotifications to profileForm
profile_pattern = r"(const \[profileForm, setProfileForm\] = useState\(\{[\s\S]*?department: user\?\.department \|\| '',\n)"
profile_replacement = r"\1    emailNotifications: user?.emailNotifications !== undefined ? user.emailNotifications : true,\n"
content = re.sub(profile_pattern, profile_replacement, content)

# Add the UI Toggle switch
toggle_ui = r"""
              <div className="flex items-center justify-between p-4 bg-[var(--bg-elevated)] border border-[var(--border-light)] rounded-xl mt-4">
                <div>
                  <h4 className="text-sm font-semibold text-[var(--text-primary)]">รับการแจ้งเตือนทางอีเมล</h4>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">ระบบจะส่งอีเมลแจ้งเตือนเมื่อมีการมอบหมายงานหรืออัปเดตสถานะเอกสาร</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer"
                    checked={profileForm.emailNotifications}
                    onChange={(e) => setProfileForm({ ...profileForm, emailNotifications: e.target.checked })}
                  />
                  <div className="w-11 h-6 bg-[var(--border-medium)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--primary-color)]"></div>
                </label>
              </div>
"""

# Find where to put it (after `<div><label ...>ฝ่าย / กลุ่มงาน</label>...</div>`)
# We can just put it right before `</form>` or before the save button.
# Let's find `<div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-light)]">`
button_area = r"(<div className=\"flex justify-end gap-3 pt-4 border-t border-\[var\(--border-light\)\]\">)"
button_replacement = toggle_ui + "\n              " + r"\1"

content = re.sub(button_area, button_replacement, content)

with open('src/components/Dashboard.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Done")
