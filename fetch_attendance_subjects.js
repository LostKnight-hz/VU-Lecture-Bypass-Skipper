// fetch_attendance_subjects.js

function parseAndStoreAttendance() {
  console.log("VULMS Skipper: Attempting to parse attendance by finding panes with attendance, then getting name from corresponding link...");

  try {
      const doc = document;
      const attendanceSubjects = [];

      // 1. Select all tab content panes
      const tabPanes = doc.querySelectorAll(".tab-content .tab-pane");

      if (!tabPanes || tabPanes.length === 0) {
          console.warn("VULMS Skipper: No '.tab-content .tab-pane' elements found. Cannot find subjects.");
          chrome.storage.local.set({ attendanceSubjects: [] }, () => {
              console.log("VULMS Skipper: Saved empty attendance list as no tab panes were found.");
          });
          return;
      }

      console.log(`VULMS Skipper: Found ${tabPanes.length} potential content panes.`);

      tabPanes.forEach((pane, index) => {
          // 2. Check if this pane contains an attendance block
          // Use a more specific selector based on your HTML if possible, otherwise keep the generic one
          const hasAttendanceDiv = pane.querySelector("[id*='divAttendance']"); // Or maybe ".m-widget24 h4:contains('Overall Attendance')" ? Generic is safer for now.

          if (hasAttendanceDiv) {
              console.log(`VULMS Skipper: [Pane ${index+1}] Found an attendance div.`);

              // 3. Find an element within this pane containing the course code in its ID
              // The hidden input seems reliable based on your HTML snippet
              const hiddenInput = pane.querySelector("input[type='hidden'][id^='hfAttendanceData']");
              let courseCode = null;

              if (hiddenInput && hiddenInput.id) {
                  // 4. Extract course code (part after 'hfAttendanceData')
                  courseCode = hiddenInput.id.replace(/^hfAttendanceData/, ''); // e.g., "cs205"
                  console.log(`VULMS Skipper: [Pane ${index+1}] Extracted Course Code '${courseCode}' from hidden input '${hiddenInput.id}'.`);
              } else {
                   console.warn(`VULMS Skipper: [Pane ${index+1}] Could not find hidden input 'hfAttendanceData...' to extract course code.`);
                   // As a fallback, try the canvas ID if the hidden input fails
                   const canvasElement = pane.querySelector("canvas[id^='pieChartAttendance']");
                   if (canvasElement && canvasElement.id) {
                       courseCode = canvasElement.id.replace(/^pieChartAttendance/, '');
                       console.log(`VULMS Skipper: [Pane ${index+1}] Extracted Course Code '${courseCode}' from canvas '${canvasElement.id}'.`);
                   } else {
                        console.warn(`VULMS Skipper: [Pane ${index+1}] Also could not find canvas 'pieChartAttendance...' to extract course code. Cannot link to tab header.`);
                   }
              }

              if (courseCode) {
                  // 5. Construct the expected tab link ID
                  const linkId = 'tabHeader' + courseCode; // e.g., "tabHeadercs205"

                  // 6. Find the corresponding tab link element
                  const linkElement = doc.getElementById(linkId);

                  if (linkElement) {
                      // 7. Get the subject name from the link's text
                      const subjectName = linkElement.textContent.trim();
                      console.log(`VULMS Skipper: [Pane ${index+1}] SUCCESS: Found corresponding link '#${linkId}' with name '${subjectName}'. Adding to list.`);
                      // 8. Add to list
                      attendanceSubjects.push({
                          name: subjectName
                      });
                  } else {
                      console.warn(`VULMS Skipper: [Pane ${index+1}] Found course code '${courseCode}', but FAILED to find corresponding tab link with ID '#${linkId}'.`);
                  }
              }
          } else {
               // console.log(`VULMS Skipper: [Pane ${index+1}] No attendance div found.`);
          }
      }); // End forEach loop

      if (attendanceSubjects.length === 0) {
          console.warn("VULMS Skipper: Finished parsing. No subjects with attendance were successfully linked to their tab headers.");
      } else {
          console.log("VULMS Skipper: Finished parsing. Attendance Subjects Found:", attendanceSubjects);
      }

      chrome.storage.local.set({ attendanceSubjects }, () => {
          console.log(`VULMS Skipper: ${attendanceSubjects.length} attendance subjects saved to storage.`);
      });

  } catch (error) {
      console.error("VULMS Skipper: Error parsing attendance subjects:", error);
  }
}

// --- Execution ---
if (window.location.pathname.toLowerCase().includes('/progresstimeline/progresstimeline.aspx')) {
  console.log("VULMS Skipper: Detected Progress Timeline page. Running attendance parser.");
  parseAndStoreAttendance();
}