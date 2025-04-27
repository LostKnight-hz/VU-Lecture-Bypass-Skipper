// content_script_merged.js (Final Clean Version - Info Fetch Only)

// ======== Execution ========
(function() {
    console.log("[VULMS Skipper Merged CS]: Script injected.");
  
    // Info fetch logic (student name, ID, program)
    try {
      const nameElement = document.querySelector("#m_name span");
      const imgElement = document.querySelector(".m-topbar__userpic img");
      const programElement = document.querySelector(".m-card-user__email");
  
      if (nameElement && imgElement) {
        const nameAndId = nameElement.innerText.trim().split("\n");
        const name = nameAndId[0] || "Unknown";
        const idMatch = nameAndId[1] ? nameAndId[1].match(/\((.*?)\)/) : null;
        const id = idMatch ? idMatch[1] : "Unknown";
        const program = programElement?.innerText.trim() || "Program Unknown";
        const imgUrl = imgElement.src.includes("/Profile/GridImageTemplate.aspx") ? "https://vulms.vu.edu.pk" + imgElement.src : imgElement.src;
  
        chrome.storage.local.set({
          studentInfo: {
            name,
            id,
            program,
            imgUrl
          }
        }, () => {
          console.log("VULMS Skipper: Student info saved:", { name, id, program });
        });
      }
    } catch (err) {
      console.warn("VULMS Skipper: Failed to fetch student info.", err);
    }
  
  })();
  