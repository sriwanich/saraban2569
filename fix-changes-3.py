import re

with open('src/components/ChangelogModal.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("selectedChangelog.changes.map((cat, idx) => {", "(Array.isArray(selectedChangelog.changes) ? selectedChangelog.changes : []).map((cat, idx) => {")

with open('src/components/ChangelogModal.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Done")
