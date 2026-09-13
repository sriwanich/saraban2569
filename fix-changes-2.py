import re

with open('src/components/ChangelogModal.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Make sure item.changes is guarded everywhere
content = content.replace("if (item.changes && item.changes.length > 0) {", "if (Array.isArray(item.changes) && item.changes.length > 0) {")
content = content.replace("{selectedChangelog.changes && selectedChangelog.changes.length > 0 && (", "{Array.isArray(selectedChangelog.changes) && selectedChangelog.changes.length > 0 && (")
content = content.replace("{selectedChangelog.changes?.length || 0}", "{Array.isArray(selectedChangelog.changes) ? selectedChangelog.changes.length : 0}")

with open('src/components/ChangelogModal.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Done")
