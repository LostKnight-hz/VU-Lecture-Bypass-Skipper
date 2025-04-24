// auto_tab_switcher.js

function moveToNextLectureTab() {
  console.log("VULMS Skipper: Attempting to move to next lecture tab...");

  try {
    const nextButton = document.getElementById("lbtnNextLesson");
    if (!nextButton) {
      console.warn("VULMS Skipper: 'Next Lesson' button not found.");
      return;
    }

    // Trigger the site's native tab change logic
    const event = new MouseEvent("click", { bubbles: true, cancelable: true });
    nextButton.dispatchEvent(event);
    console.log("VULMS Skipper: Next tab triggered via SaveLogAndChangeTab.");
  } catch (err) {
    console.error("VULMS Skipper: Error triggering next tab:", err);
  }
}
