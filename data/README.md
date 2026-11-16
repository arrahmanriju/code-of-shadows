# Portfolio content and links

Edit `projects.ts` for project titles, descriptions, technologies, details, repository links, and demo URLs. Set `githubUrl` or `liveUrl` to `null` when no verified URL exists; the corresponding action will be hidden. Both project panels and the printable résumé use this data.

The four supplied repositories were checked against the public GitHub API and repository pages. Descriptions and detail bullets for those projects come from their READMEs. SEU Question Bank's technology list was updated to match its current README.

Verified demo URLs are listed in the Dhaka Tesla Pool and SEU Question Bank READMEs and returned HTTP 200 during verification. Free hosting availability can change.

No public repository match was verified for Mental Health Prediction or Tiredness and Alertness Dataset. Their code and demo actions remain hidden.

Edit `profile.ts` for the contact email and social profiles. LinkedIn returned HTTP 999; Codeforces and LeetCode returned HTTP 403 to automated checks. The exact user-supplied profile URLs are preserved.

To enable résumé downloads, put the real PDF at `public/resume.pdf` and rebuild/redeploy. The homepage checks for that file on the server. Until it exists, both download controls are disabled with a clear unavailable message. `/resume` remains the existing printable profile; it is not offered as a PDF download.
