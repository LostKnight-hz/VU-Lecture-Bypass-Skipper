// Set default value for auto-skip on installation
chrome.runtime.onInstalled.addListener(details => {
  if (details.reason === "install") {
    chrome.storage.local.set({ isAutoSkipEnabled: true }, () => {
      console.log("VULMS Skipper BG: Default auto-skip setting (enabled) saved.");
    });
  }
});

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
              }, 1000);

              innerResolve({ status: 'success', message: 'Marked and moved to next' });
            } catch (updateError) {
              console.error("VULMS Skipper Injected: Error in UpdateTabStatus after success:", updateError);
              innerResolve({ status: 'success_update_failed', message: 'Marked, but failed to update tab status visually.' });
            }
          },
          (error) => {
            console.error("VULMS Skipper Injected: PageMethods.SaveStudentVideoLog failed:", error);
            const errorMessage = error && error.get_message ? error.get_message() : 'Unknown PageMethods error';
            innerReject(`API Error: ${errorMessage}`);
          }
        );
      });

      resolve(pageMethodsResult);
    } catch (error) {
      console.error("VULMS Skipper Injected: Error within auto-skip function:", error);
      reject(`Execution Error: ${error.message}`);
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
      return true;
    }

    if (isAttemptingSkip[tabId]) {
      console.log(`VULMS Skipper BG: Skip attempt already in progress for tab ${tabId}. Ignoring request.`);
      sendResponse({ status: "ignored", message: "Already processing." });
      return true;
    }

    console.log(`VULMS Skipper BG: Received requestAutoSkip from tab ${tabId}.`);
    isAttemptingSkip[tabId] = true;

    (async () => {
      try {
        const injectionResults = await chrome.scripting.executeScript({
          target: { tabId: tabId, allFrames: false },
          func: performAutoSkipLogic_Injectable,
          world: "MAIN"
        });

        if (injectionResults && injectionResults[0]) {
          const result = injectionResults[0].result;
          console.log(`VULMS Skipper BG: Injection result for tab ${tabId}:`, result);

          if (result && (result.status === 'retry' || result.status === 'error')) {
            console.warn(`VULMS Skipper BG: Auto-skip attempt for tab ${tabId} needs retry or failed in page: ${result.message}`);
          }

          sendResponse({ status: "executed", result: result });
        } else {
          console.warn(`VULMS Skipper BG: executeScript for tab ${tabId} returned no results.`);
          sendResponse({ status: "error", message: "executeScript returned no result." });
        }
      } catch (error) {
        console.error(`VULMS Skipper BG: Error executing script in tab ${tabId}:`, error);
        sendResponse({ status: "error", message: `Script execution failed: ${error.message}` });
      } finally {
        setTimeout(() => {
          delete isAttemptingSkip[tabId];
        }, 500);
      }
    })();

    return true;
  }
});
