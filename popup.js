// popup.js

// Start of fetchActiveTab function
const fetchActiveTab = async () => {
  // Ensure we handle potential errors if query fails
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    return tabs[0];
  } catch (error) {
    console.error("Error querying active tab:", error);
    return null;
  }
};
// End of fetchActiveTab function

// Start of displayTemporaryMessage function
const displayTemporaryMessage = (element, message, duration = 2500) => {
  if (!element || typeof element.textContent === 'undefined') return; // Add safety check
  if (!element._originalText) {
    element._originalText = element.textContent;
  }
  element.textContent = message;
  element.disabled = true; // Ensure button state is managed if applicable
  clearTimeout(element._timeout);
  element._timeout = setTimeout(() => {
    // Check if element still exists before restoring
    if (document.body.contains(element)) {
        element.textContent = element._originalText;
        element.disabled = false;
    }
  }, duration);
};
// End of displayTemporaryMessage function

// Start of updateVersionInfo function
const updateVersionInfo = () => {
  try {
    const versionElement = document.getElementById("version-string");
    if (versionElement) {
      const manifest = chrome.runtime.getManifest();
      versionElement.textContent = `v${manifest.version}`;
    }
  } catch (error) {
    console.error("Error updating version info:", error);
  }
};
// End of updateVersionInfo function

// Start of loadStudentInfo function
const loadStudentInfo = () => {
  chrome.storage.local.get(['studentInfo'], (result) => {
    const info = result.studentInfo;
    const container = document.getElementById('student-info');
    if (info && container) { // Add check for container existence
      container.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px;">
          <img src="${info.imgUrl}" alt="Student Photo" style="width:55px;height:55px;border-radius:50%;object-fit:cover;">
          <div style="display: flex; flex-direction: column; align-items: flex-start;">
            <div style="font-weight: 600; font-size: 15px;">${info.name || 'Name not found'}</div>
            <div style="font-size: 12px; color: gray;">${info.id || 'ID not found'}</div>
            <div style="font-size: 12px; color: gray;">${info.program || 'Program not found'}</div>
          </div>
        </div>
      `;
    } else if (container) {
         container.textContent = "Student info not found. Please log in to VULMS.";
    }
  });
};
// End of loadStudentInfo function

// *** CORRECTED FUNCTION: Checks current tab and updates the instruction text ***
// Start of updateRefreshInstructionBasedOnTab function
const updateRefreshInstructionBasedOnTab = async () => {
  const instructionElement = document.getElementById('refresh-instruction-text');
  if (!instructionElement) {
      console.warn("VULMS Skipper Popup: Instruction text element not found.");
      return; // Exit if the element isn't ready or doesn't exist
  }

  const activeTab = await fetchActiveTab(); // Use the helper function

  // --- *** FIX: Corrected URL path part to match the actual URL *** ---
  const progressPageUrlPart = "/progresstimeline/progresstimeline.aspx"; // Matches the log output
  // --- *** END FIX *** ---

  const defaultInstruction = "Please manually visit your Progress Page to refresh attendance subjects.";
  const onPageInstruction = "You are currently on the Progress Page. Attendance info updates automatically when this page loads.";

  let currentUrl = activeTab?.url || ""; // Get URL safely

  // Add logging to see what URL is being compared
  console.log(`[VULMS Skipper] Popup: Checking active tab URL: '${currentUrl}' against part: '${progressPageUrlPart}'`);

  // Keep the case-insensitive check for robustness, comparing against the CORRECTED path part
  if (currentUrl.toLowerCase().startsWith("https://vulms.vu.edu.pk") && currentUrl.toLowerCase().includes(progressPageUrlPart.toLowerCase())) {
    instructionElement.textContent = onPageInstruction;
    console.log("[VULMS Skipper] Popup: User IS on Progress Page (Detected).");
  } else {
    instructionElement.textContent = defaultInstruction;
    console.log("[VULMS Skipper] Popup: User is NOT on Progress Page (Detected).");
  }
};
// End of updateRefreshInstructionBasedOnTab function

// ======================================================
// ****** ATTENDANCE SUMMARY LOADING - UPDATED *********
// ======================================================
const loadAttendanceSummary = async () => {
    const updateAttendanceUI = (subjects) => {
      const countElement = document.getElementById('attendance-count');
      const attendanceList = document.getElementById('attendance-list'); // Get list for modal

      if (countElement) {
        countElement.textContent = subjects.length > 0 ? subjects.length : "0"; // Show '0' if empty
      }

      // Update the list in the attendance *modal*
      if (attendanceList) {
        attendanceList.innerHTML = ""; // Clear previous list items
        if (subjects.length === 0) {
            const li = document.createElement('li');
            // ** Improved message for clarity **
            li.textContent = "No subjects found or data needs refresh.";
            li.style.fontStyle = "italic";
            li.style.color = "#666"; // Lighter text for info message
            attendanceList.appendChild(li);
        } else {
            subjects.forEach(sub => {
              const li = document.createElement('li');
              li.textContent = sub.name;
              li.style.marginBottom = "10px"; // Keep styling consistent
              attendanceList.appendChild(li);
            });
        }
      }
    };

    // --- *** FIX: Use the generic key 'attendanceSubjects' directly *** ---
    const storageKey = 'attendanceSubjects'; // The key used by fetch_attendance_subjects.js
    console.log(`[VULMS Skipper] Popup: Attempting to load subjects using key: ${storageKey}`);

    chrome.storage.local.get([storageKey], (data) => {
        const subjects = data[storageKey] || [];
        console.log(`[VULMS Skipper] Popup: Loaded ${subjects.length} attendance subjects using key ${storageKey}.`);
        updateAttendanceUI(subjects);

        // ** Optional: Clear old student-specific keys if they exist (run once or periodically) **
        // This part is useful if you previously saved data using student-specific keys and want to clean up.
        /*
        chrome.storage.local.get(['studentInfo'], (result) => {
          const studentID_popup = result.studentInfo?.id;
          if (studentID_popup && studentID_popup !== "Unknown") {
              const oldKey = `attendanceSubjects_${studentID_popup}`;
              chrome.storage.local.remove(oldKey, () => {
                if (chrome.runtime.lastError) {
                   console.warn(`[VULMS Skipper] Popup: Error removing old key ${oldKey}:`, chrome.runtime.lastError.message);
                } else {
                   console.log(`[VULMS Skipper] Popup: Removed potentially old key ${oldKey}`);
                }
              });
          }
        });
        */
    });
    // --- *** END FIX *** ---


    // --- Refresh button and modal logic (remains the same) ---
    const refreshButton = document.getElementById('refresh-attendance');
    const refreshModal = document.getElementById('refresh-modal'); // Target the correct modal

    if (refreshButton && refreshModal) {
      refreshButton.addEventListener('click', async (e) => {
        e.stopPropagation(); // Prevent the summary card's click listener
        console.log("[VULMS Skipper] Popup: Refresh button clicked.");
        // Update the instruction text based on the *current* tab *before* showing the modal
        await updateRefreshInstructionBasedOnTab();
        refreshModal.style.display = "block";
      });
    } else {
        console.warn("VULMS Skipper: Refresh button or modal not found.");
    }

    // --- Logic for showing/hiding the *Attendance List* modal ---
    const summaryCard = document.getElementById('attendance-summary');
    const attendanceModal = document.getElementById('attendance-modal'); // The modal showing the list
    const closeAttendanceModal = document.getElementById('close-attendance-modal');

    if (summaryCard && attendanceModal && closeAttendanceModal) {
      summaryCard.addEventListener('click', (e) => {
        // Only open the list modal if the refresh icon itself wasn't clicked
        if (e.target.id !== "refresh-attendance" && !e.target.closest("#refresh-attendance")) {
           console.log("[VULMS Skipper] Popup: Attendance summary card clicked.");
           attendanceModal.style.display = "block";
        }
      });

      closeAttendanceModal.addEventListener('click', () => {
        console.log("[VULMS Skipper] Popup: Closing attendance list modal.");
        attendanceModal.style.display = "none";
      });
    } else {
        console.warn("VULMS Skipper: Attendance summary card, modal, or close button not found.");
    }
  }; // <-- End of loadAttendanceSummary function
// ======================================================
// ******* END OF ATTENDANCE SUMMARY LOADING ***********
// ======================================================

document.addEventListener("DOMContentLoaded", () => {
  console.log("[VULMS Skipper] Popup: DOMContentLoaded");
  loadStudentInfo();
  updateVersionInfo();
  loadAttendanceSummary(); // This loads data AND sets up button listeners using the corrected key logic

  // Set the initial state of the refresh instruction text when popup loads
  updateRefreshInstructionBasedOnTab(); // Call the CORRECTED function

  // --- Modal Closing Logic ---
  const closeRefreshModalBtn = document.getElementById("close-refresh-modal");
  const refreshModal = document.getElementById('refresh-modal');
  if (closeRefreshModalBtn && refreshModal) {
    closeRefreshModalBtn.addEventListener('click', () => {
       console.log("[VULMS Skipper] Popup: Closing refresh instruction modal via button.");
       refreshModal.style.display = 'none';
    });
  }

  // --- Contact Modal Logic ---
  const creditLink = document.getElementById('credit-link');
  const contactModal = document.getElementById('contact-modal');
  const closeModalBtn = document.getElementById('close-modal');
  const emailLink = document.getElementById('email-link');

  if (creditLink && contactModal && closeModalBtn) {
      creditLink.addEventListener('click', (e) => {
          e.preventDefault(); // Prevent default link behavior if it's an <a> tag
          contactModal.style.display = 'block';
      });
      closeModalBtn.addEventListener('click', () => { contactModal.style.display = 'none'; });
  }
   if (emailLink) {
        emailLink.addEventListener('click', (e) => {
            e.preventDefault();
            // Use chrome.tabs.create for opening links from popup for better practice
            chrome.tabs.create({ url: 'https://mail.google.com/mail/?view=cm&to=lostknight786@gmail.com' });
        });
    }

    // --- Manual Watch Button Logic ---
    const markWatchedButton = document.getElementById('mark-watched-button');
    if (markWatchedButton) {
        markWatchedButton.addEventListener('click', async () => {
            console.log("[VULMS Skipper] Popup: Manual 'Mark Watched' clicked.");
            const activeTab = await fetchActiveTab();
            if (!activeTab || !activeTab.id) {
                displayTemporaryMessage(markWatchedButton, "Error: No active tab found.");
                console.error("VULMS Skipper: Could not get active tab ID for manual skip.");
                return;
            }
            // Check if the tab is a VULMS course page before sending
            if (!activeTab.url || !activeTab.url.includes("vulms.vu.edu.pk/Courses/")) {
                displayTemporaryMessage(markWatchedButton, "Not on a course page.");
                console.log("[VULMS Skipper] Popup: Manual skip attempted on non-course page:", activeTab.url);
                return;
            }

            displayTemporaryMessage(markWatchedButton, "Marking..."); // Give immediate feedback
            chrome.runtime.sendMessage({ action: "requestAutoSkip" }, (response) => {
                 if (chrome.runtime.lastError) {
                    console.error("VULMS Skipper CS: Error sending manual skip message:", chrome.runtime.lastError.message);
                     displayTemporaryMessage(markWatchedButton, "Error sending request");
                } else {
                    console.log("[VULMS Skipper] Popup: Manual skip request sent, background response:", response);
                     if (response && response.status === 'executed' && response.result) {
                         switch (response.result.status) {
                             case 'success': case 'success_update_failed': displayTemporaryMessage(markWatchedButton, "Lecture Marked!"); break;
                             case 'skipped': displayTemporaryMessage(markWatchedButton, "Not a video tab."); break;
                             case 'stay': displayTemporaryMessage(markWatchedButton, "Error: Check Console"); break; // Simplified message
                             case 'retry': displayTemporaryMessage(markWatchedButton, "Page not ready, retry?"); break;
                             default: displayTemporaryMessage(markWatchedButton, "Marking Failed"); break;
                         }
                     } else if (response && response.status === 'ignored') { displayTemporaryMessage(markWatchedButton, "Already processing...");
                     } else if (response && response.status === 'error') { displayTemporaryMessage(markWatchedButton, `Error: ${response.message || 'Unknown'}`);
                     } else { displayTemporaryMessage(markWatchedButton, "Processing..."); } // Default while waiting
                }
            });
        });
    } else {
        console.warn("[VULMS Skipper] Popup: Mark Watched button not found.");
    }

    // --- Auto Skip Toggle Logic ---
    const autoSkipToggle = document.getElementById('auto-skip-toggle');
    if (autoSkipToggle) {
        // Get initial state
        chrome.storage.local.get(['isAutoSkipEnabled'], (result) => {
            // Default to true if the value hasn't been set yet (first install)
            autoSkipToggle.checked = result.isAutoSkipEnabled !== false;
             console.log(`[VULMS Skipper] Popup: Auto-skip toggle loaded state: ${autoSkipToggle.checked}`);
        });
        // Listen for changes
        autoSkipToggle.addEventListener('change', () => {
            const isEnabled = autoSkipToggle.checked;
            chrome.storage.local.set({ isAutoSkipEnabled: isEnabled }, () => {
                console.log(`[VULMS Skipper] Popup: Auto-skip set to ${isEnabled}`);
                // Optional: Provide visual feedback or reload parts of the page if necessary
            });
        });
    } else {
        console.warn("[VULMS Skipper] Popup: Auto Skip toggle button not found.");
    }

    // Add back the window click listener for closing modals (click outside)
    window.addEventListener('click', (event) => {
        const attendanceModal = document.getElementById('attendance-modal');
        const refreshModal = document.getElementById('refresh-modal');
        const contactModal = document.getElementById('contact-modal');

        // Close modals if the click is outside their content area
        if (attendanceModal && event.target === attendanceModal) {
            attendanceModal.style.display = 'none';
        }
        if (refreshModal && event.target === refreshModal) {
            refreshModal.style.display = 'none';
        }
         if (contactModal && event.target === contactModal) {
             contactModal.style.display = 'none';
         }
    });

}); // End of DOMContentLoaded
