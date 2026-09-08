import fs from 'fs';
let code = fs.readFileSync('src/components/Dashboard.tsx', 'utf-8');

const positionBlock = `<div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">ตำแหน่ง</label>
                <select
                  value={profileForm.position}
                  onChange={(e) => setProfileForm({ ...profileForm, position: e.target.value })}
                  disabled={currentUser?.role !== 'admin'}
                  className={\`w-full bg-[var(--bg-canvas)] border border-[var(--border-medium)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--primary-color)] outline-none \${currentUser?.role !== 'admin' ? 'opacity-70 bg-[var(--bg-elevated)] cursor-not-allowed' : ''}\`}
                >
                  <option value="">-- เลือกตำแหน่งงาน --</option>
                  {positionsList.map((p: any) => (
                    <option key={p.id} value={p.name}>{p.name}</option>
                  ))}
                  {profileForm.position && !positionsList.some(p => p.name === profileForm.position) && (
                    <option value={profileForm.position}>{profileForm.position}</option>
                  )}
                </select>
                {currentUser?.role !== 'admin' && <p className="text-[10px] text-[var(--text-muted)] mt-1">* เฉพาะผู้ดูแลระบบ (Admin) เท่านั้นที่สามารถแก้ไขข้อมูลตำแหน่งได้</p>}
              </div>`;

const departmentBlock = `<div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">ฝ่าย / กลุ่มงาน</label>
                <select
                  value={profileForm.department}
                  onChange={(e) => setProfileForm({ ...profileForm, department: e.target.value })}
                  disabled={currentUser?.role !== 'admin'}
                  className={\`w-full bg-[var(--bg-canvas)] border border-[var(--border-medium)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--primary-color)] outline-none \${currentUser?.role !== 'admin' ? 'opacity-70 bg-[var(--bg-elevated)] cursor-not-allowed' : ''}\`}
                >
                  <option value="">-- เลือกฝ่าย / กลุ่มงาน --</option>
                  {departmentsList.map((d: any) => (
                    <option key={d.id} value={d.name}>{d.name}</option>
                  ))}
                  {profileForm.department && !departmentsList.some(d => d.name === profileForm.department) && (
                    <option value={profileForm.department}>{profileForm.department}</option>
                  )}
                </select>
                {currentUser?.role !== 'admin' && <p className="text-[10px] text-[var(--text-muted)] mt-1">* เฉพาะผู้ดูแลระบบ (Admin) เท่านั้นที่สามารถแก้ไขข้อมูลฝ่ายงานได้</p>}
              </div>`;


code = code.replace(
  /<div>\s*<label className="block text-xs font-medium text-\[var\(--text-secondary\)\] mb-1">ตำแหน่ง<\/label>\s*<select\s*value=\{profileForm\.position\}\s*onChange=\{\(e\) => setProfileForm\(\{ \.\.\.profileForm, position: e\.target\.value \}\)\}\s*className="w-full bg-\[var\(--bg-canvas\)\] border border-\[var\(--border-medium\)\] rounded-lg px-3 py-2 text-sm text-\[var\(--text-primary\)\] focus:border-\[var\(--primary-color\)\] outline-none"\s*>\s*<option value="">-- เลือกตำแหน่งงาน --<\/option>\s*\{positionsList\.map\(\(p: any\) => \(\s*<option key=\{p\.id\} value=\{p\.name\}>\{p\.name\}<\/option>\s*\)\)\}\s*\{profileForm\.position && !positionsList\.some\(p => p\.name === profileForm\.position\) && \(\s*<option value=\{profileForm\.position\}>\{profileForm\.position\}<\/option>\s*\)\}\s*<\/select>\s*<\/div>/,
  positionBlock
);

code = code.replace(
  /<div>\s*<label className="block text-xs font-medium text-\[var\(--text-secondary\)\] mb-1">ฝ่าย \/ กลุ่มงาน<\/label>\s*<select\s*value=\{profileForm\.department\}\s*onChange=\{\(e\) => setProfileForm\(\{ \.\.\.profileForm, department: e\.target\.value \}\)\}\s*className="w-full bg-\[var\(--bg-canvas\)\] border border-\[var\(--border-medium\)\] rounded-lg px-3 py-2 text-sm text-\[var\(--text-primary\)\] focus:border-\[var\(--primary-color\)\] outline-none"\s*>\s*<option value="">-- เลือกฝ่าย \/ กลุ่มงาน --<\/option>\s*\{departmentsList\.map\(\(d: any\) => \(\s*<option key=\{d\.id\} value=\{d\.name\}>\{d\.name\}<\/option>\s*\)\)\}\s*\{profileForm\.department && !departmentsList\.some\(d => d\.name === profileForm\.department\) && \(\s*<option value=\{profileForm\.department\}>\{profileForm\.department\}<\/option>\s*\)\}\s*<\/select>\s*<\/div>/,
  departmentBlock
);

fs.writeFileSync('src/components/Dashboard.tsx', code);
