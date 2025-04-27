// background.js

// Set default value for auto-skip on installation
chrome.runtime.onInstalled.addListener(details => {
  if (details.reason === "install") {
    chrome.storage.local.set({ isAutoSkipEnabled: true }, () => {
      console.log("VULMS Skipper BG: Default auto-skip setting (enabled) saved.");
    });
  }

  // --- REMOVE THIS ---
  // Fetch attendance subjects on installation
  // fetchAttendanceSubjects(); // <- REMOVE or COMMENT OUT
  // -----------------

});

// Fetch attendance subjects on startup
chrome.runtime.onStartup.addListener(() => {
  // --- REMOVE THIS ---
  // fetchAttendanceSubjects(); // <- REMOVE or COMMENT OUT
  // -----------------
});

// --- REMOVE THIS ---
// Import the fetchAttendanceSubjects function
// importScripts("fetch_attendance_subjects.js"); // <- REMOVE or COMMENT OUT
// -----------------


// --- This is the core logic function that will be injected into the page ---
function performAutoSkipLogic_Injectable() {
  // NOTE: This function's code runs in the PAGE's context (MAIN world)
  return new Promise(async (resolve, reject) => {
    console.log("VULMS Skipper Injected: Attempting auto-skip...");
    try {
      // Essential Checks
      if (typeof $ === 'undefined' || typeof PageMethods === 'undefined' || typeof UpdateTabStatus === 'undefined') {
        console.warn("VULMS Skipper Injected: Required page components not ready yet.");
        return resolve({ status: 'retry', message: 'Page components not ready' });
      }

      const activeTabIdInput = $("#hfActiveTab");
      if (!activeTabIdInput || !activeTabIdInput.length || !activeTabIdInput.val()) {
        console.warn("VULMS Skipper Injected: Could not find active tab ID.");
        return resolve({ status: 'retry', message: 'Active tab ID not found' });
      }

      const activeTabId = activeTabIdInput.val().replace("tabHeader", "");
      console.log(`VULMS Skipper Injected: Found activeTabId = ${activeTabId}`);

      const isVideoInput = $("#hfIsVideo" + activeTabId);
      if (!isVideoInput.length) {
        console.warn(`VULMS Skipper Injected: Could not find video status element (#hfIsVideo${activeTabId}).`);
        return resolve({ status: 'retry', message: 'Video status element not found' });
      }

      const isVideo = isVideoInput.val();
      console.log(`VULMS Skipper Injected: Found #hfIsVideo${activeTabId} value = "${isVideo}"`);

      if (!isVideo || isVideo === "0") {
        console.log("VULMS Skipper Injected: Not a video lecture tab (based on isVideo value), skipping.");
        return resolve({ status: 'skipped', message: 'Not a video tab' });
      }

      console.log(`VULMS Skipper Injected: Identified video tab ${activeTabId}. Proceeding.`);

      const nextTab = document.querySelector(`li[data-contentid="tab${activeTabId}"]`)?.nextElementSibling;
      const nextTabId = nextTab?.dataset?.contentid?.replace?.("tab", "") || "-1";
      const randomDuration = (min, max) => Math.floor(Math.random() * (max - min + 1) + min);
      const studentId = $("#hfStudentID").val();
      const courseCode = $("#hfCourseCode").val();
      const enrollmentSemester = $("#hfEnrollmentSemester").val();
      const lessonTitleElement = document.getElementById("MainContent_lblLessonTitle");
      const lessonTitle = lessonTitleElement ? lessonTitleElement.title.split(":")[0].replace("Lesson", "").trim() : "UnknownLesson";
      const contentId = $("#hfContentID" + activeTabId).val();
      const videoId = $("#hfVideoID" + activeTabId).val();

      let duration = 0;
      let durationCheckAttempts = 0;
      const MAX_DURATION_CHECKS = 5;

      while (duration <= 0 && durationCheckAttempts < MAX_DURATION_CHECKS) {
        durationCheckAttempts++;
        if ($("#hfIsAvailableOnYoutube" + activeTabId).val() === "True") {
          if (typeof CurrentPlayer !== 'undefined' && CurrentPlayer && typeof CurrentPlayer.getDuration === 'function') {
            duration = CurrentPlayer.getDuration();
          }
        } else {
          if (typeof CurrentLVPlayer !== 'undefined' && CurrentLVPlayer && CurrentLVPlayer.duration) {
            duration = CurrentLVPlayer.duration;
          }
        }

        if (duration > 0 && isFinite(duration)) {
          console.log(`VULMS Skipper Injected: Got duration ${duration} on attempt ${durationCheckAttempts}`);
          break;
        } else {
          console.warn(`VULMS Skipper Injected: Duration not ready or invalid on attempt ${durationCheckAttempts}. Value: ${duration}`);
          duration = 0;
          if (durationCheckAttempts < MAX_DURATION_CHECKS) {
            await new Promise(res => setTimeout(res, 200));
          }
        }
      }

      if (duration <= 0 || !isFinite(duration)) {
        console.warn(`VULMS Skipper Injected: Could not get valid duration after ${MAX_DURATION_CHECKS} checks. Using default 600s.`);
        duration = 600;
      }

      duration = Math.max(1, duration);
      const watchedDuration = duration <= 2 ? 1 : Math.max(1, randomDuration(duration / 3, duration / 2));

      console.log(`VULMS Skipper Injected: Calling SaveStudentVideoLog. Watched: ${watchedDuration.toFixed(2)}s, Total: ${duration.toFixed(2)}s`);

      const pageMethodsResult = await new Promise((innerResolve, innerReject) => {
        PageMethods.SaveStudentVideoLog(
          studentId, courseCode, enrollmentSemester, lessonTitle,
          contentId, watchedDuration, duration, videoId, isVideo, window.location.href,
          (result) => {
            try {
              console.log("VULMS Skipper Injected: SaveStudentVideoLog successful. Updating tab status.");
              UpdateTabStatus(result, activeTabId, nextTabId);

              // ✅ Move to next lecture
              setTimeout(() => {
                const nextButton = document.getElementById("lbtnNextLesson");
                if (nextButton) {
                  nextButton.click();
                  console.log("VULMS Skipper: Auto-clicked Next Lecture button.");
                } else {
                  console.warn("VULMS Skipper: Next button not found.");
                }
              }, 1000); // Add a small delay before clicking next

              innerResolve({ status: 'success', message: 'Marked and moved to next' });
            } catch (updateError) {
              console.error("VULMS Skipper Injected: Error in UpdateTabStatus after success:", updateError);
              innerResolve({ status: 'success_update_failed', message: 'Marked, but failed to update tab status visually.' });
            }
          },
          (error) => {
            console.error("VULMS Skipper Injected: PageMethods.SaveStudentVideoLog failed:", error);
            const errorMessage = error && error.get_message ? error.get_message() : 'Unknown PageMethods error';
            // Resolve instead of rejecting to send error details back to background
            innerResolve({ status: 'api_error', message: `API Error: ${errorMessage}` });
          }
        );
      });

      resolve(pageMethodsResult);
    } catch (error) {
      console.error("VULMS Skipper Injected: Error within auto-skip function:", error);
      // Resolve instead of rejecting to send error details back to background
       resolve({ status: 'execution_error', message: `Execution Error: ${error.message}` }); // Send specific error status
    }
  }); // ✅ Closing new Promise
}


// --- Message Listener in Background Script ---
let isAttemptingSkip = {}; // Use an object to track attempts per tabId

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "requestAutoSkip") {
    const tabId = sender.tab?.id;
    if (!tabId) {
      console.error("VULMS Skipper BG: Received message without sender tab ID.");
      sendResponse({ status: "error", message: "No sender tab ID." });
      return true; // Indicate async response
    }

    // Prevent concurrent skips on the same tab
    if (isAttemptingSkip[tabId]) {
      console.log(`VULMS Skipper BG: Skip attempt already in progress for tab ${tabId}. Ignoring request.`);
      sendResponse({ status: "ignored", message: "Already processing." });
      return true; // Indicate async response
    }

    console.log(`VULMS Skipper BG: Received requestAutoSkip from tab ${tabId}.`);
    isAttemptingSkip[tabId] = true; // Mark as attempting

    (async () => {
      let responseSent = false; // Flag to ensure sendResponse is called only once
      try {
        const injectionResults = await chrome.scripting.executeScript({
          target: { tabId: tabId, allFrames: false }, // Target specific tab
          func: performAutoSkipLogic_Injectable,
          world: "MAIN" // Execute in the page's context
        });

        // Process results
        if (injectionResults && injectionResults[0] && injectionResults[0].result) {
          const result = injectionResults[0].result;
          console.log(`VULMS Skipper BG: Injection result for tab ${tabId}:`, result);

           // Handle different statuses from the injected script
           if (result.status === 'retry' || result.status === 'skipped' || result.status === 'api_error' || result.status === 'execution_error') {
             console.warn(`VULMS Skipper BG: Auto-skip for tab ${tabId} reported status: ${result.status} - ${result.message}`);
           } else if (result.status === 'success' || result.status === 'success_update_failed') {
             console.log(`VULMS Skipper BG: Auto-skip successful (or partially) for tab ${tabId}.`);
           }

          sendResponse({ status: "executed", result: result });
          responseSent = true;
        } else {
           // Handle cases where executeScript might not return expected results
           const err_msg = `executeScript for tab ${tabId} returned unexpected data or no result.`;
           console.warn(`VULMS Skipper BG: ${err_msg}`, injectionResults);
           if (!responseSent) sendResponse({ status: "error", message: err_msg });
           responseSent = true;
        }
      } catch (error) {
        // Catch errors during the executeScript call itself
        console.error(`VULMS Skipper BG: Error executing script in tab ${tabId}:`, error);
        if (!responseSent) sendResponse({ status: "error", message: `Script execution failed: ${error.message}` });
        responseSent = true;
      } finally {
        // Ensure the lock is released, even if errors occurred
        // Use a small delay to prevent race conditions if the page reloads quickly
        setTimeout(() => {
            delete isAttemptingSkip[tabId];
            console.log(`VULMS Skipper BG: Released skip lock for tab ${tabId}.`);
        }, 500); // 500ms delay

        // Ensure sendResponse is called if it hasn't been already (e.g., unexpected error paths)
        if (!responseSent) {
            console.warn(`VULMS Skipper BG: sendResponse may not have been called for tab ${tabId}, sending generic error.`);
            sendResponse({ status: "error", message: "An unknown error occurred during execution." });
        }
      }
    })();

    return true; // Crucial: Indicates you will send a response asynchronously.
  }
  // Add other message listeners here if needed
  // return false; // Optional: Only return true for messages you handle asynchronously
});
