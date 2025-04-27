// attendance_summary.js

document.addEventListener('DOMContentLoaded', () => {
    chrome.storage.local.get(['attendanceSubjects'], (result) => {
      const subjects = result.attendanceSubjects || [];
      const list = document.getElementById('subject-list');
  
      if (subjects.length === 0) {
        list.innerHTML = "<li>No subjects with attendance found.</li>";
      } else {
        subjects.forEach(sub => {
          const li = document.createElement('li');
          li.textContent = sub.name;
          li.style.marginBottom = "10px";
          li.style.fontSize = "14px";
          list.appendChild(li);
        });
      }
    });
  });
  