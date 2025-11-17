<h1 style="color:red; text-align:center;">FOREST VIEW - The Red Moon</h1>

This is a small web project that renders a night forest scene with a red full moon, a howling wolf silhouette, moving clouds, rain and lightning using an HTML5 canvas.

Files:

index.html — main page
styles.css — simple fullscreen styles
script.js — canvas drawing and animations
How to run

Open index.html directly in a modern browser (Chrome/Edge/Firefox). Some browsers restrict local file resources, but this project is pure client-side so it should work by opening the file.
Or run a simple local HTTP server (recommended):

PowerShell (Windows):

cd 'c:\xampp\htdocs\forest view'
python -m http.server 8000
Then open "http://localhost/forest view" in your browser.

Notes and next steps

The visuals are generated procedurally — no external assets are required.
You can tweak values in script.js (cloud count, rain intensity, lightning frequency) to change the mood.
Possible improvements: add ambient sound (thunder/wind/howl), refine wolf silhouette, add more parallax layers.
