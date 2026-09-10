import re

with open('server.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Update POST /api/users
post_pattern = r"('INSERT INTO users \(username, password, email, firstName, lastName, position, department, role, avatar\) VALUES \(\?, \?, \?, \?, \?, \?, \?, \?, \?\)',\s*\[username, hashedPassword, email \|\| null, firstName, lastName, position, department \|\| 'ฝ่ายบริหารงานทั่วไป', role \|\| 'user', avatar \|\| null\])"
post_replacement = r"'INSERT INTO users (username, password, email, firstName, lastName, position, department, role, avatar, emailNotifications) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',\n        [username, hashedPassword, email || null, firstName, lastName, position, department || 'ฝ่ายบริหารงานทั่วไป', role || 'user', avatar || null, req.body.emailNotifications !== undefined ? (req.body.emailNotifications ? 1 : 0) : 1]"

content = re.sub(post_pattern, post_replacement, content)

# Update PUT /api/users/:id
put_pattern1 = r"'UPDATE users SET firstName=\?, lastName=\?, email=\?, position=\?, department=\?, role=\?, password=\?, avatar=\? WHERE id=\?',\s*\[data\.firstName, data\.lastName, data\.email \|\| null, data\.position, data\.department, data\.role, newHashedPassword, data\.avatar \|\| null, id\]"
put_replacement1 = r"'UPDATE users SET firstName=?, lastName=?, email=?, position=?, department=?, role=?, password=?, avatar=?, emailNotifications=? WHERE id=?',\n        [data.firstName, data.lastName, data.email || null, data.position, data.department, data.role, newHashedPassword, data.avatar || null, data.emailNotifications !== undefined ? (data.emailNotifications ? 1 : 0) : 1, id]"

put_pattern2 = r"'UPDATE users SET firstName=\?, lastName=\?, email=\?, position=\?, department=\?, role=\?, avatar=\? WHERE id=\?',\s*\[data\.firstName, data\.lastName, data\.email \|\| null, data\.position, data\.department, data\.role, data\.avatar \|\| null, id\]"
put_replacement2 = r"'UPDATE users SET firstName=?, lastName=?, email=?, position=?, department=?, role=?, avatar=?, emailNotifications=? WHERE id=?',\n        [data.firstName, data.lastName, data.email || null, data.position, data.department, data.role, data.avatar || null, data.emailNotifications !== undefined ? (data.emailNotifications ? 1 : 0) : 1, id]"


content = re.sub(put_pattern1, put_replacement1, content)
content = re.sub(put_pattern2, put_replacement2, content)

with open('server.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print("Done")
