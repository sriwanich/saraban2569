const fs = require('fs');
let content = fs.readFileSync('src/components/views/disaster/UrgentIncidentReportView.tsx', 'utf8');

// Replace fetchReports with onSnapshot
const newFetch = `
  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, 'urgent_incidents'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UrgentIncident));
      setReports(data);
      setLoading(false);
    }, (err) => {
      console.error('Error fetching urgent reports:', err);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);
`;

content = content.replace(
  /  useEffect\(\(\) => \{\n    fetchReports\(\);\n  \}, \[\]\);\n\n  const fetchReports = async \(\) => \{\n    setLoading\(true\);\n    try \{\n      const q = query\(collection\(db, 'urgent_incidents'\), orderBy\('createdAt', 'desc'\)\);\n      const snapshot = await getDocs\(q\);\n      const data = snapshot\.docs\.map\(doc => \(\{ id: doc\.id, \.\.\.doc\.data\(\) \} as UrgentIncident\)\);\n      setReports\(data\);\n    \} catch \(err\) \{\n      console\.error\('Error fetching urgent reports:', err\);\n    \}\n    setLoading\(false\);\n  \};/,
  newFetch
);

// Remove fetchReports() from handleSave
content = content.replace(/      fetchReports\(\);\n/g, '');

// Also ensure onSnapshot is imported
if (!content.includes('onSnapshot')) {
  content = content.replace(/getDocs, /, 'getDocs, onSnapshot, ');
}

fs.writeFileSync('src/components/views/disaster/UrgentIncidentReportView.tsx', content, 'utf8');
