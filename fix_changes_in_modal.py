import re

with open('src/components/ChangelogModal.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Safe totalChanges
pattern_total = r"const totalChanges = \(item\.changes \|\| \[\]\)\.reduce\(\(acc, cat\) => acc \+ \(cat\.items\?\.length \|\| 0\), 0\);"
replacement_total = r"const totalChanges = Array.isArray(item.changes) ? item.changes.reduce((acc, cat) => acc + (cat?.items?.length || 0), 0) : 0;"
content = content.replace(pattern_total, replacement_total)

# Safe selectedChangelog.changes length
pattern_total2 = r"รวมทั้งหมด \{\(selectedChangelog\.changes \|\| \[\]\)\.reduce\(\(sum, c\) => sum \+ \(c\.items\?\.length \|\| 0\), 0\)\} รายการ"
replacement_total2 = r"รวมทั้งหมด {Array.isArray(selectedChangelog.changes) ? selectedChangelog.changes.reduce((sum, c) => sum + (c?.items?.length || 0), 0) : 0} รายการ"
content = content.replace(pattern_total2, replacement_total2)

# Safe matchChanges in search
pattern_match = r"const matchChanges = \(item\.changes \|\| \[\]\)\.some\(c => \n        c\.categoryLabel\.toLowerCase\(\)\.includes\(q\) \|\| \n        c\.items\.some\(i => i\.toLowerCase\(\)\.includes\(q\)\)\n      \);"
replacement_match = r"const matchChanges = Array.isArray(item.changes) ? item.changes.some(c => \n        (c?.categoryLabel || '').toLowerCase().includes(q) || \n        Array.isArray(c?.items) && c.items.some(i => (i || '').toLowerCase().includes(q))\n      ) : False;"
content = content.replace(pattern_match, replacement_match)

with open('src/components/ChangelogModal.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Done")
