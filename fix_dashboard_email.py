import re

with open('src/components/Dashboard.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace any SetProfileForm where it misses emailNotifications
pattern = r"setProfileForm\(\{([^}]+)\}\)"
def replacer(match):
    inner = match.group(1)
    if 'firstName:' in inner and 'emailNotifications:' not in inner:
        return f"setProfileForm({{{inner}, emailNotifications: profileForm.emailNotifications}})"
    return match.group(0)

content = re.sub(pattern, replacer, content)

with open('src/components/Dashboard.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Done")
