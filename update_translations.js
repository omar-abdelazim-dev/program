const fs = require('fs');

const arPath = './client/src/locales/ar.json';
const enPath = './client/src/locales/en.json';

const arData = JSON.parse(fs.readFileSync(arPath, 'utf8'));
const enData = JSON.parse(fs.readFileSync(enPath, 'utf8'));

const collegesAr = {
  "engineering": "كلية الهندسة",
  "computer_science": "كلية علوم الحاسب وتقنية المعلومات",
  "business": "كلية إدارة الأعمال",
  "medicine": "كلية الطب",
  "pharmacy": "كلية الصيدلة",
  "dentistry": "كلية طب الأسنان",
  "applied_medical": "كلية العلوم الطبية التطبيقية",
  "science": "كلية العلوم",
  "arts": "كلية الآداب والعلوم الإنسانية",
  "education": "كلية التربية",
  "law": "كلية الحقوق",
  "architecture": "كلية العمارة والتصميم"
};

const collegesEn = {
  "engineering": "College of Engineering",
  "computer_science": "College of Computer Science and Information Technology",
  "business": "College of Business Administration",
  "medicine": "College of Medicine",
  "pharmacy": "College of Pharmacy",
  "dentistry": "College of Dentistry",
  "applied_medical": "College of Applied Medical Sciences",
  "science": "College of Science",
  "arts": "College of Arts and Humanities",
  "education": "College of Education",
  "law": "College of Law",
  "architecture": "College of Architecture and Design"
};

if (!arData.colleges) arData.colleges = {};
if (!enData.colleges) enData.colleges = {};

Object.assign(arData.colleges, collegesAr);
Object.assign(enData.colleges, collegesEn);

fs.writeFileSync(arPath, JSON.stringify(arData, null, 2));
fs.writeFileSync(enPath, JSON.stringify(enData, null, 2));
