import re

with open('src/components/Dashboard.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix the broken setProfileForm syntax in Dashboard.tsx
content = content.replace(", emailNotifications: profileForm.emailNotifications});", ", emailNotifications: profileForm.emailNotifications });")
# specifically this weird part:
content = content.replace("avatar: user?.avatar || ''\n    , emailNotifications: profileForm.emailNotifications});", "avatar: user?.avatar || '',\n    emailNotifications: user?.emailNotifications !== undefined ? user.emailNotifications : profileForm.emailNotifications\n  });")
content = content.replace("avatar: currentUser?.avatar || ''\n                         , emailNotifications: profileForm.emailNotifications});", "avatar: currentUser?.avatar || '',\n                         emailNotifications: currentUser?.emailNotifications !== undefined ? currentUser.emailNotifications : profileForm.emailNotifications\n                       });")
content = content.replace("onChange={(e) => setProfileForm({ ...profileForm, firstName: e.target.value , emailNotifications: profileForm.emailNotifications})}", "onChange={(e) => setProfileForm({ ...profileForm, firstName: e.target.value })}")

with open('src/components/Dashboard.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Done")
