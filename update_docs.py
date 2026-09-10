import re

with open('server.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Update POST /api/documents
post_pattern = r"(      await addSystemLog\('CREATE_DOCUMENT', `ลงทะเบียนหนังสือใหม่ \(\$\{type\}\): \$\{doc\.docNumber \|\| doc\.receiveNumber \|\| docId\} - \$\{doc\.title\}`.*, ip\);\n\n      return res\.json\(\{ success: true, id: docId \}\);)"
post_replacement = r"      if (doc.assignee) {\n        sendNotificationEmail(doc.assignee, `[ระบบสารบรรณ] มอบหมายเอกสารใหม่: ${doc.title}`, `<div style=\"font-family:sans-serif;color:#333;line-height:1.6;max-width:600px;margin:0 auto;padding:20px;border:1px solid #eee;border-radius:8px;\"><h2 style=\"color:#0056b3;\">📌 ท่านได้รับมอบหมายเอกสารใหม่</h2><p>เรียน ผู้รับผิดชอบ</p><p>ระบบสารบรรณได้ทำการมอบหมายเอกสารใหม่ให้ท่านดำเนินการ โดยมีรายละเอียดดังนี้:</p><div style=\"background:#f9f9f9;padding:15px;border-radius:6px;margin:15px 0;\"><p style=\"margin:5px 0;\"><b>เลขที่เอกสาร:</b> ${doc.docNumber || '-'}</p><p style=\"margin:5px 0;\"><b>เรื่อง:</b> ${doc.title || '-'}</p><p style=\"margin:5px 0;\"><b>หมวดหมู่/ประเภท:</b> ${type}</p><p style=\"margin:5px 0;\"><b>ผู้มอบหมาย:</b> ${doc.department || '-'}</p></div><p>กรุณาเข้าสู่ระบบเพื่อตรวจสอบและดำเนินการต่อไป</p><br><p style=\"font-size:12px;color:#888;\">นี่คืออีเมลอัตโนมัติจากระบบสารบรรณ กรุณาอย่าตอบกลับ</p></div>`);\n      }\n\1"

content = re.sub(post_pattern, post_replacement, content)

# Update PUT /api/documents/:id
put_pattern = r"(      await addSystemLog\('UPDATE_DOCUMENT', `แก้ไขข้อมูลหนังสือ \(\$\{type\}\): \$\{id\} - \$\{doc\.title\}`.*, ip\);\n\n      return res\.json\(\{ success: true \}\);)"
put_replacement = r"      if (doc.assignee && status !== 'ลงทะเบียน') {\n        sendNotificationEmail(doc.assignee, `[ระบบสารบรรณ] อัปเดตสถานะเอกสาร: ${doc.title}`, `<div style=\"font-family:sans-serif;color:#333;line-height:1.6;max-width:600px;margin:0 auto;padding:20px;border:1px solid #eee;border-radius:8px;\"><h2 style=\"color:#0056b3;\">📝 มีการอัปเดตสถานะเอกสาร</h2><p>เรียน ผู้รับผิดชอบ</p><p>เอกสารที่ท่านรับผิดชอบมีการเปลี่ยนแปลงสถานะในระบบสารบรรณ โดยมีรายละเอียดดังนี้:</p><div style=\"background:#f9f9f9;padding:15px;border-radius:6px;margin:15px 0;\"><p style=\"margin:5px 0;\"><b>เลขที่เอกสาร:</b> ${doc.docNumber || '-'}</p><p style=\"margin:5px 0;\"><b>เรื่อง:</b> ${doc.title || '-'}</p><p style=\"margin:5px 0;\"><b>สถานะล่าสุด:</b> <span style=\"color:#d97706;font-weight:bold;\">${status}</span></p></div><p>กรุณาเข้าสู่ระบบเพื่อตรวจสอบรายละเอียดเพิ่มเติม</p><br><p style=\"font-size:12px;color:#888;\">นี่คืออีเมลอัตโนมัติจากระบบสารบรรณ กรุณาอย่าตอบกลับ</p></div>`);\n      }\n\1"

content = re.sub(put_pattern, put_replacement, content)


with open('server.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print("Done")
