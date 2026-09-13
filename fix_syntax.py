import re
with open('src/components/Dashboard.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

# Fix `, emailNotifications: profileForm.emailNotifications });` which looks broken in a couple places
c = c.replace(", emailNotifications: profileForm.emailNotifications });", ",\n    emailNotifications: profileForm.emailNotifications\n  });")
# Specifically looking at lines 112-117 in the grep output:
c = c.replace("avatar: user?.avatar || ''\n    , emailNotifications: profileForm.emailNotifications });", "avatar: user?.avatar || '',\n    emailNotifications: user?.emailNotifications !== undefined ? user.emailNotifications : profileForm.emailNotifications\n  });")
c = c.replace("avatar: currentUser?.avatar || ''\n                         , emailNotifications: profileForm.emailNotifications });", "avatar: currentUser?.avatar || '',\n                         emailNotifications: currentUser?.emailNotifications !== undefined ? currentUser.emailNotifications : profileForm.emailNotifications\n                       });")

with open('src/components/Dashboard.tsx', 'w', encoding='utf-8') as f:
    f.write(c)
print("Done")
