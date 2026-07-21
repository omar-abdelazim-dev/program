import fs from 'fs';
import path from 'path';

// 1. Update index.css with Notyf global overrides
const indexCssPath = 'C:/Users/ahmad/Desktop/program-week2/client/src/index.css';
let indexCss = fs.readFileSync(indexCssPath, 'utf8');

const notyfOverrides = `

/* Notyf Global Overrides */
.notyf__toast--success {
  background: rgba(16, 185, 129, 0.9) !important;
  backdrop-filter: blur(12px) !important;
  -webkit-backdrop-filter: blur(12px) !important;
  border: 1px solid rgba(255, 255, 255, 0.1) !important;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3) !important;
  border-radius: 12px !important;
  color: white !important;
}

.notyf__toast--error {
  background: rgba(239, 68, 68, 0.9) !important;
  backdrop-filter: blur(12px) !important;
  -webkit-backdrop-filter: blur(12px) !important;
  border: 1px solid rgba(255, 255, 255, 0.1) !important;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3) !important;
  border-radius: 12px !important;
  color: white !important;
}

.notyf__icon--success, .notyf__icon--error {
  background: transparent !important;
}
`;

if (!indexCss.includes('notyf__toast--success')) {
  fs.writeFileSync(indexCssPath, indexCss + notyfOverrides);
  console.log('Updated index.css');
}

// 2. Simplify Notyf in components
const componentsDir = 'C:/Users/ahmad/Desktop/program-week2/client/src/components';
const filesToUpdate = [
  'CurriculumBuilderTab.jsx',
  'DashboardTab.jsx',
  'InstructorEngagementTab.jsx',
  'InstructorFinancialsTab.jsx'
];

const simpleNotyf = `const notyf = new Notyf({
  position: { x: 'right', y: 'top' },
  duration: 3000,
});`;

const financialNotyf = `const notyf = new Notyf({
  duration: 3000,
  position: { x: 'right', y: 'bottom' }
});`;

filesToUpdate.forEach(file => {
  const filePath = path.join(componentsDir, file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    // Replace complex Notyf init with simple one using regex
    content = content.replace(/const notyf = new Notyf\(\{[\s\S]*?\}\);/, file === 'InstructorFinancialsTab.jsx' ? financialNotyf : simpleNotyf);
    fs.writeFileSync(filePath, content);
    console.log('Updated', file);
  }
});

// 3. Fix financialController.js requestPayout casting
const finCtrlPath = 'C:/Users/ahmad/Desktop/program-week2/server/controllers/financialController.js';
if (fs.existsSync(finCtrlPath)) {
  let finContent = fs.readFileSync(finCtrlPath, 'utf8');
  if (finContent.includes('const availableBalance = await getAvailableBalance(req.user._id);')) {
    finContent = finContent.replace(
      'const availableBalance = await getAvailableBalance(req.user._id);',
      'const instructorId = new mongoose.Types.ObjectId(req.user._id);\n    const availableBalance = await getAvailableBalance(instructorId);'
    );
    finContent = finContent.replace(
      'instructor: req.user._id,',
      'instructor: instructorId,'
    );
    fs.writeFileSync(finCtrlPath, finContent);
    console.log('Updated financialController.js');
  }
}
