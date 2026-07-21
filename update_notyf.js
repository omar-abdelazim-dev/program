import fs from 'fs';
import path from 'path';

const filesToUpdate = [
  'C:/Users/ahmad/Desktop/program-week2/client/src/components/AdminPayoutsTab.jsx',
  'C:/Users/ahmad/Desktop/program-week2/client/src/components/AdminPortal.jsx',
  'C:/Users/ahmad/Desktop/program-week2/client/src/components/CurriculumBuilderTab.jsx',
  'C:/Users/ahmad/Desktop/program-week2/client/src/components/DashboardTab.jsx',
  'C:/Users/ahmad/Desktop/program-week2/client/src/components/InstructorEngagementTab.jsx',
  'C:/Users/ahmad/Desktop/program-week2/client/src/components/InstructorFinancialsTab.jsx',
  'C:/Users/ahmad/Desktop/program-week2/client/src/components/InstructorReviewsTab.jsx'
];

filesToUpdate.forEach(filePath => {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Remove the old import and initialization
  content = content.replace(/import { Notyf } from 'notyf';\n?/, '');
  content = content.replace(/import 'notyf\/notyf\.min\.css';\n?/, '');
  
  // Match block defining const notyf = new Notyf({...});
  content = content.replace(/const notyf = new Notyf\(\{[\s\S]*?\}\);\n?/, '');

  // Add the new global import at the top (after the first import usually, or just top)
  if (!content.includes("import notyf from '../utils/notyf';")) {
    content = content.replace(/import React/, "import notyf from '../utils/notyf';\nimport React");
    // If there's no import React, try finding the first import
    if (!content.includes("import notyf from '../utils/notyf';")) {
      content = "import notyf from '../utils/notyf';\n" + content;
    }
  }

  fs.writeFileSync(filePath, content);
  console.log('Updated ' + path.basename(filePath));
});
