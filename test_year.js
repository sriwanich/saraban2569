import fs from 'fs';
fetch('http://localhost:3000/api/documents')
  .then(res => res.json())
  .then(data => {
     data.forEach(d => {
       if (typeof d.year !== 'string' && d.year != null) {
         console.log(d.id, typeof d.year, d.year);
       }
     });
     console.log("Done");
  });
