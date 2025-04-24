const fetchActiveTab = async () => {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs[0];
};

const displayTemporaryMessage = (element, message, duration = 2500) => {
  if (!element._originalText) {
    element._originalText = element.textContent;
  }
  element.textContent = message;
  element.disabled = true;
  clearTimeout(element._timeout);
  element._timeout = setTimeout(() => {
    element.textContent = element._originalText;
    element.disabled = false;
  }, duration);
};

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

const handleMarkLectureWatched = async (button) => {
  const activeTab = await fetchActiveTab();
  if (!activeTab || !activeTab.url.includes("vulms.vu.edu.pk") || !activeTab.url.includes("LessonViewer.aspx")) {
    return displayTemporaryMessage(button, "Error: Not on a VULMS Lesson page.");
  }
  displayTemporaryMessage(button, "Marking as watched...");
  try {
    const injectionResults = await chrome.scripting.executeScript({
      target: { tabId: activeTab.id },
      world: "MAIN",
      func: () => {
        return new Promise((resolve, reject) => {
          try {
            if (typeof $ === 'undefined' || typeof PageMethods === 'undefined' || typeof UpdateTabStatus === 'undefined') {
              return reject("Required page scripts not found.");
            }
            const activeTabIdInput = $("#hfActiveTab");
            if (!activeTabIdInput.length) return reject("No active tab ID.");
            const activeTabId = activeTabIdInput.val().replace("tabHeader", "");
            const isVideoInput = $("#hfIsVideo" + activeTabId);
            if (!isVideoInput.length) return reject("Not a video tab.");
            const isVideo = isVideoInput.val();
            if (!isVideo || isVideo === "0") return resolve("Not a video lecture.");
            const nextTabId = document.querySelector(`li[data-contentid="tab${activeTabId}"]`)?.nextElementSibling?.dataset?.contentid?.replace?.("tab", "") || "-1";
            const studentId = $("#hfStudentID").val();
            const courseCode = $("#hfCourseCode").val();
            const enrollmentSemester = $("#hfEnrollmentSemester").val();
            const lessonTitle = document.getElementById("MainContent_lblLessonTitle")?.title.split(":")[0].replace("Lesson", "").trim() || "UnknownLesson";
            const contentId = $("#hfContentID" + activeTabId).val();
            const videoId = $("#hfVideoID" + activeTabId).val();
            let duration = 600;
            if ($("#hfIsAvailableOnYoutube" + activeTabId).val() === "True" && typeof CurrentPlayer !== 'undefined' && CurrentPlayer.getDuration) {
              duration = CurrentPlayer.getDuration() || 600;
            } else if (typeof CurrentLVPlayer !== 'undefined' && CurrentLVPlayer.duration) {
              duration = CurrentLVPlayer.duration || 600;
            }
            duration = Math.max(1, duration);
            const watchedDuration = duration <= 2 ? 1 : Math.max(1, Math.floor(Math.random() * (duration/2 - duration/3 + 1) + duration/3));
            PageMethods.SaveStudentVideoLog(
              studentId, courseCode, enrollmentSemester, lessonTitle,
              contentId, watchedDuration, duration, videoId, isVideo, window.location.href,
              (result) => { try { UpdateTabStatus(result, activeTabId, nextTabId); resolve("Lecture marked!"); } catch { reject("Failed to update tab status."); }},
              (error) => reject(`API Error: ${error?.get_message?.() || "Unknown error"}`)
            );
          } catch (error) {
            reject(`Execution Error: ${error.message}`);
          }
        });
      }
    });

    if (injectionResults?.[0]?.result) {
      displayTemporaryMessage(button, injectionResults[0].result);
    } else {
      displayTemporaryMessage(button, "Script failed.");
    }
  } catch (error) {
    console.error("Manual mark failed:", error);
    displayTemporaryMessage(button, `Error: ${error.message}`);
  }
};

const setupAutoSkipToggle = () => {
  const toggle = document.getElementById('auto-skip-toggle');
  if (!toggle) return;
  chrome.storage.local.get(['isAutoSkipEnabled'], (result) => {
    toggle.checked = result.isAutoSkipEnabled !== false;
  });
  toggle.addEventListener('change', (event) => {
    chrome.storage.local.set({ isAutoSkipEnabled: event.target.checked });
  });
};

document.addEventListener("DOMContentLoaded", () => {
  updateVersionInfo();
  setupAutoSkipToggle();

  const markButton = document.getElementById("mark-watched-button");
  if (markButton) {
    markButton.addEventListener("click", (e) => handleMarkLectureWatched(e.target));
  }

  const creditLink = document.getElementById("credit-link");
  const modal = document.getElementById("contact-modal");
  const closeModalBtn = document.getElementById("close-modal");

  if (creditLink && modal && closeModalBtn) {
    creditLink.addEventListener("click", () => {
      modal.style.display = "block";
    });

    closeModalBtn.addEventListener("click", () => {
      modal.style.display = "none";
    });

    window.addEventListener("click", (event) => {
      if (event.target === modal) {
        modal.style.display = "none";
      }
    });
  }

  // Gmail compose instead of mailto
  const emailLink = document.getElementById("email-link");
  if (emailLink) {
    emailLink.addEventListener("click", (e) => {
      e.preventDefault();
      chrome.tabs.create({
        url: "https://mail.google.com/mail/?view=cm&fs=1&to=jattcute41@gmail.com"
      });
    });
  }
});
