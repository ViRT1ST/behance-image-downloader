BeDownloader
===

Bulk image downloader for Behance URLs (projects, moodboards, profiles, likes, modules).\
Written with Electron, Puppeteer and other JS libraries.

## Features

* Parses provided URLs, finds projects, and then downloads all images from those projects.
* Downloads full-size original images if it available.
* Writes information about project into downloaded images (JPEG metadata).
* Keeps history for all downloaded projects.
* Has ability to skip downloading a project if its URL is found in history.
* Portable app, don't need installation.

## Usage as portable app (currently for Windows users only)

* Download portable app and run it

## Usage as Node.js project (currently for Windows users only)

```
1. Download and install Node.js v20.9.0 or newer.
2. Download repository archive and unpack it.
3. Go to the root of unpacked folder and run 'npm install' in terminal to install all dependencies.
4. Run 'npm run dev' in terminal to start app.
```

## Skipping projects by download history

Can be enabled in "settings\\config.ini" (false by default).

## Issues with downloading adult NSFW projects

Projects with adult content requires user authorization to access them.\
So, in this case, app requires your Behance account token to download these projects.\
Here instructions how to get it and use it with app:

* Login into your Behance account in your browser.
* Open Chrome DevTools (Ctrl+Shift+I).
* Navigate to "Local Storage" and copy token from it (as showed in
    [screenshot](screenshots/token_from_chrome.png)).
* Open "settings\\config.ini" and paste copied string into it (as showed in
    [screenshot](screenshots/token_in_config.png)).

After this you can launch app and download any projects.

## Screenshot

![screenshot](screenshots/launched.png)