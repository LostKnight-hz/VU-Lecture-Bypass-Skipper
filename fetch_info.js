// fetch_info.js
console.log("VULMS Skipper: Fetch Info Script Loaded");

function extractStudentInfo() {
    try {
        const nameElement = document.querySelector("#m_name .m-nav__link-text");
        const imgElement = document.querySelector(".m-topbar__userpic img");
        const programElement = document.querySelector(".m-card-user__email");

        if (!nameElement || !imgElement || !programElement) {
            //console.warn("VULMS Skipper: Some student info elements not found.");
            return;
        }

        const fullText = nameElement.innerText.trim();
        const [studentName, idWithParentheses] = fullText.split("\n");
        const studentId = idWithParentheses?.replace(/[()]/g, "").trim() || "";

        const imgSrc = imgElement.getAttribute("src");
        const imgFullUrl = imgSrc.startsWith("/") ? window.location.origin + imgSrc : imgSrc;

        const programName = programElement.innerText.trim();

        const studentInfo = {
            name: studentName.trim(),
            id: studentId,
            imgUrl: imgFullUrl,
            program: programName
        };

        chrome.storage.local.set({ studentInfo }, () => {
            console.log("VULMS Skipper: Student info saved:", studentInfo);
        });
    } catch (error) {
        console.error("VULMS Skipper: Error extracting student info:", error);
    }
}

// Run extraction on page load
extractStudentInfo();
