import re

with open('src/components/ChangelogModal.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix `item.images && item.images.length > 0`
# Make it `Array.isArray(item.images) && item.images.length > 0`
content = content.replace("item.images && item.images.length > 0", "Array.isArray(item.images) && item.images.length > 0")

# Fix `item.images.length` to `item.images?.length` just in case
content = content.replace("{item.images.length}", "{item.images?.length}")

# Fix `selectedChangelog.changes && selectedChangelog.changes.length > 0`
content = content.replace("selectedChangelog.changes && selectedChangelog.changes.length > 0", "Array.isArray(selectedChangelog.changes) && selectedChangelog.changes.length > 0")

with open('src/components/ChangelogModal.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Done")
