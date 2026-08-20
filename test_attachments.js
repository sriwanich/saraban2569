fetch('http://localhost:3000/api/documents')
  .then(res => res.json())
  .then(data => {
     let err = false;
     data.forEach(d => {
       if (d.attachments && !Array.isArray(d.attachments)) {
         console.log(d.id, "attachments is not array", typeof d.attachments);
         err = true;
       }
     });
     if (!err) console.log("All attachments are arrays");
  });
