📚 VU LMS Lecture Skipper
“Auto-skip VU LMS lectures. Study smart, not longer.”

A lightweight browser extension that automatically marks VU LMS video lectures as watched and skips to the next one — no timers, no waiting.

🎓 Built for working students, part-time learners, and anyone who values their time.

Virtual University is designed for self-paced learning — yet students are forced to sit through long videos just to satisfy a timer. This extension is for those who study on their own time — after work, during breaks, or whenever it suits them — and don’t want to waste hours just letting videos play.

✅ How It Works
Open any VULMS lecture tab
The extension marks the lecture as watched automatically
It automatically switches to the next lecture tab
You don’t even need to interact with it — install once and forget it.
Focus on learning, not watching timers tick.

logo

⚡ Features
✅ Auto-skips VULMS video lectures after simulating a realistic view duration
🌀 Auto-switches to the next lecture tab
🔘 Manual "Mark as Watched" button
💾 Remembers your preferences (auto-skip toggle)
🎨 Clean popup UI with contact info
🔧 Installation
🔹 Option 1: Load as Unpacked Extension (Recommended)
Download and unzip this repository or clone it:
git clone https://github.com/yourusername/vulms-lecture-skipper.git
Open chrome://extensions in Chrome
Enable Developer Mode (top-right corner)

Click Load Unpacked

Select the folder containing the extension files

✅ Done! You'll see the extension icon in your Chrome toolbar.

🔹 Option 2: Install via .crx File
⚠️ Chrome blocks .crx installations from outside the Web Store unless you tweak the registry.

🧩 Steps: Download the .crx file from the Releases section (add your GitHub release link).

Follow the steps below to enable .crx installation.

🧱 Windows Registry Tweak: Press Win + R, type regedit, press Enter.

Navigate to:

Copy Edit HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Google\Chrome (Create this path if it doesn't exist)

Right-click → New > Key → Name it: ExtensionInstallSources

Inside it, create a String Value:

Name: 1

Value: file:///C:/*

Restart Chrome.

You can now drag and drop the .crx file into chrome://extensions.

📸 Screenshots

Auto Skipping Demo Popup UI (Add a GIF here) (Add screenshot of popup.html) 💬 Contact & Credits Made with ❤️ by LostKnight

📧 Email: jattcute41@gmail.com

💬 WhatsApp: wa.me/923058599233

📄 License This project is licensed under the MIT License. See license.txt for full details.