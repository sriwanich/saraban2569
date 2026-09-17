const fs = require('fs');

// 1. Remove AnalyticsView from Overview.tsx
let overviewContent = fs.readFileSync('src/components/views/Overview.tsx', 'utf8');

// Find the analytics card in Overview.tsx and remove it
overviewContent = overviewContent.replace(
  /          \{\/\* Analytics Card \*\/\}\s*<div\s*className="bg-\[var\(--bg-surface\)\] rounded-3xl p-6 md:p-8 shadow-sm border border-\[var\(--border-light\)\] relative overflow-hidden group cursor-pointer hover:shadow-md transition-all">[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*\)\s*\}/,
  `        </div>
      </div>
    </div>
  </div>
)
}`
);

fs.writeFileSync('src/components/views/Overview.tsx', overviewContent, 'utf8');

// 2. Remove AnalyticsView from Dashboard.tsx
let dashboardContent = fs.readFileSync('src/components/Dashboard.tsx', 'utf8');

// Remove import
dashboardContent = dashboardContent.replace(/import AnalyticsView from '\.\/views\/AnalyticsView';\n/, '');

// Remove from SIDEBAR_ITEMS
dashboardContent = dashboardContent.replace(
  /\s*\{\n\s*id: 'analytics',\n\s*label: 'ภาพรวมระบบ',\n\s*icon: <BarChart3 className="w-5 h-5" \/>\n\s*\},/,
  ''
);

// Remove the condition for rendering 'analytics'
dashboardContent = dashboardContent.replace(
  /\s*\{currentView === 'analytics' && <AnalyticsView \/>\}/,
  ''
);

fs.writeFileSync('src/components/Dashboard.tsx', dashboardContent, 'utf8');

// 3. Delete the AnalyticsView.tsx file
if (fs.existsSync('src/components/views/AnalyticsView.tsx')) {
  fs.unlinkSync('src/components/views/AnalyticsView.tsx');
}
