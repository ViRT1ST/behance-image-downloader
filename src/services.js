const fs = require('fs');
const fetch = require('node-fetch');
const { transliterate } = require('transliteration');

let appConfig = {
  inMoodboardTimeout: 10000,
  betweenProjectsDelay: 1000,
  betweenDownloadsDelay: 1000,
  page: null,
  outputDir: null,
  userUrls: [],
  projects: []
};

function addUserConfigToAppConfig(userConfig) {
  appConfig = { ...appConfig, ...userConfig };
}

async function disableImagesLoading() {
  const { page } = appConfig;

  await page.setRequestInterception(true);

  page.on('request', (interceptedRequest) => {
    if (interceptedRequest.resourceType() === 'image') {
      interceptedRequest.abort();
    } else {
      interceptedRequest.continue();
    }
  });
}

async function enableImagesLoading() {
  const { page } = appConfig;

  await page.setRequestInterception(false);
}

async function autoScroll() {
  const { inMoodboardTimeout, page } = appConfig;

  await page.evaluate(async (inMoodboardTimeout) => {
    await new Promise((resolve) => {
      const scrollStepTime = 500;
      const scrollStepHeight = 500;

      const scrollCheckTime = 1000;
      const maxScrollMatches = inMoodboardTimeout / scrollCheckTime;
      let currentScrollMatches = 0;
      let lastScrollPosition = 0;

      const scroller = setInterval(() => {
        lastScrollPosition = window.pageYOffset;
        window.scrollBy(0, scrollStepHeight);
      }, scrollStepTime);

      const checker = setInterval(() => {
        currentScrollMatches = window.pageYOffset === lastScrollPosition
          ? currentScrollMatches += 1
          : 0;

        if (currentScrollMatches === maxScrollMatches) {
          clearInterval(scroller);
          clearInterval(checker);
          resolve();
        }
      }, scrollCheckTime);
    });
  }, inMoodboardTimeout);
}

async function getMoodboardLinks(url) {
  const { page } = appConfig;

  await page.goto(url);
  await page.waitForSelector('.Collection-wrapper-LHa');

  console.log('Scrolling moodboard to page end: begin ...');
  await autoScroll(page);
  console.log('Scrolling moodboard to page end: ended.');

  return page.evaluate(() => {
    console.log('Parsing links from moodboard: begin ...');

    const selector = '.js-project-cover-title-link';
    const items = Array.from(document.querySelectorAll(selector));
    const urls = items.map((item) => item.getAttribute('href'));

    console.log('Parsing links from moodboard: ended.');
    return urls;
  });
}

async function generateProjectsList() {
  const { userUrls } = appConfig;

  let projects = [];

  for (const url of userUrls) {
    if (url.includes('behance.net/collection/')) {
      const moodboardProjects = await getMoodboardLinks(url);
      projects = [...projects, ...moodboardProjects];
    } else {
      projects.push(url);
    }
  }

  appConfig.projects = projects;
  console.log(appConfig.projects);
}

function transliterateString(string) {
  return transliterate(string);
}

function replaceNonEnglishBySymbol(string, symbol) {
  return string.replace(/[^a-zA-Z0-9]/g, symbol);
}

function convertToKebabCase(string) {
  return replaceNonEnglishBySymbol(transliterateString(string), '-')
    .toLowerCase().replace(/--/g, '-');
}

async function parseProjectData(url) {
  const { page } = appConfig;

  await page.goto(url);
  await page.waitForSelector('.project-content-wrap');

  return page.evaluate(() => {
    function getMetaProperty(propertyName) {
      return document.head.querySelector(`meta[property="${propertyName}"]`)
        .getAttribute('content');
    }

    const title = getMetaProperty('og:title');
    const owners = getMetaProperty('og:owners');
    const url = getMetaProperty('og:url');
    const id = url.split('/')[4];

    const imgList = Array.from(document.querySelectorAll('img'));
    const srcList = imgList.map((item) => item.getAttribute('src'));
    const projectImages = srcList.filter((item) => item.includes('project_modules'));

    return { title, owners, url, id, projectImages };
  });
}

function correctProjectData(data) {
  const { title, owners, url, id, projectImages } = data;

  const normalizedTitle = convertToKebabCase(title);
  const normalizedOwners = convertToKebabCase(owners);

  const replacements = [
    'project_modules/2800/',
    'project_modules/2800_opt_1/',
    'project_modules/1400/',
    'project_modules/1400_opt_1/',
    'project_modules/disp/',
    'project_modules/max_1200/',
    'project_modules/fs/'
  ];

  const images = projectImages.map((url) => {
    for (const replacement of replacements) {
      url = url.replace(replacement, 'project_modules/source/');
    }
    return url;
  });

  return { id, url, title, owners, normalizedTitle, normalizedOwners, images };
}

async function getProjectData(url) {
  const data = await parseProjectData(url);
  const correctedData = await correctProjectData(data);
  return correctedData;
}

async function downloadFile(url, path) {
  const res = await fetch(url);
  const fileStream = fs.createWriteStream(path);
  await new Promise((resolve, reject) => {
    res.body.pipe(fileStream);
    res.body.on('error', () => {
      reject();
    });
    fileStream.on('finish', () => {
      resolve();
    });
  });
}

function addZeroForNumberLessTen(number) {
  console.log(number);
  return number < 10 ? `0${number}` : number.toString();
}

async function downloadProjects() {
  const {
    betweenProjectsDelay,
    betweenDownloadsDelay,
    page,
    outputDir,
    projects
  } = appConfig;

  for (const project of projects) {
    const projectData = await getProjectData(project);
    const { id, normalizedTitle, normalizedOwners, images } = projectData;

    let counter = 1;
    for (const item of images) {
      const prefix = 'behance_';
      const number = addZeroForNumberLessTen(counter);
      const extension = item.split('.').pop();
      const template = `${normalizedOwners}_${id}-${normalizedTitle}`;
      const path = `${outputDir}/${prefix}${template}_${number}.${extension}`;

      await downloadFile(item, path);
      counter += 1;
      console.log(path);

      await page.waitForTimeout(betweenDownloadsDelay);
    }

    await page.waitForTimeout(betweenProjectsDelay);
  }
}

module.exports.addUserConfigToAppConfig = addUserConfigToAppConfig;
module.exports.disableImagesLoading = disableImagesLoading;
module.exports.enableImagesLoading = enableImagesLoading;
module.exports.generateProjectsList = generateProjectsList;
module.exports.downloadProjects = downloadProjects;