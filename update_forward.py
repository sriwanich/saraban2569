import re

with open('server.ts', 'r', encoding='utf-8') as f:
    content = f.read()

forward_pattern = r"(    await addSystemLog\('FORWARD_DOCUMENT', `ส่งต่อหนังสือ ID \$\{docId\} ไปยัง \$\{deptsString\}`, forwardedBy \|\| 'สารบรรณกลาง', ip\);\n)"
forward_replacement = r"\1\n    for (const dept of targetDepartments) {\n      sendNotificationEmail(dept, `[ระบบสารบรรณ] เอกสารใหม่ส่งถึงฝ่าย: ${dept}`, `<div style=\"font-family:sans-serif;color:#333;line-height:1.6;max-width:600px;margin:0 auto;padding:20px;border:1px solid #eee;border-radius:8px;\"><h2 style=\"color:#0056b3;\">✉️ มีเอกสารใหม่ส่งถึงฝ่ายของท่าน</h2><p>เรียน บุคลากรฝ่าย ${dept}</p><p>สารบรรณได้ทำการส่งต่อเอกสารมายังกลุ่มงานของท่าน โดยมีรายละเอียดดังนี้:</p><div style=\"background:#f9f9f9;padding:15px;border-radius:6px;margin:15px 0;\"><p style=\"margin:5px 0;\"><b>เรื่อง/ข้อความสั่งการ:</b> ${forwardNote || '-'}</p><p style=\"margin:5px 0;\"><b>ส่งโดย:</b> ${forwardedBy || 'สารบรรณกลาง'}</p></div><p>กรุณาเข้าสู่ระบบสารบรรณเพื่อลงรับหรือตรวจสอบรายละเอียดเพิ่มเติม</p><br><p style=\"font-size:12px;color:#888;\">นี่คืออีเมลอัตโนมัติจากระบบสารบรรณ กรุณาอย่าตอบกลับ</p></div>`);\n    }\n"

content = re.sub(forward_pattern, forward_replacement, content)

with open('server.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print("Done")
